import { NextResponse } from "next/server";
import { parseCoordinateInRange } from "@/lib/coordinate-parse";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const strapiConnectionError = (cause: unknown, strapiUrl: string) => {
  const msg = cause instanceof Error ? cause.message : String(cause);
  const isFetchFailed =
    msg.includes("fetch failed") ||
    msg === "Failed to fetch" ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT");
  if (isFetchFailed) {
    return `Cannot reach Strapi at ${strapiUrl}. Start Strapi (e.g. npm run develop in backend) or set STRAPI_URL / NEXT_PUBLIC_STRAPI_URL to the correct URL.`;
  }
  return msg;
};

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 3;
const MAX_FILE_MB = 100;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DIFFICULTY_ENUMS = new Set(["championship", "advanced", "intermediate", "easy"]);
const COURSE_TYPE_ENUMS = new Set(["championship", "wooded", "park style", "pitch and putt"]);

const parseLinks = (raw: string) =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parseLayoutsJson = (raw: string): { value: unknown[] | null; error?: string } => {
  if (!raw.trim()) {
    return { value: null };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { value: null, error: "Layouts JSON must be an array." };
    }
    return { value: parsed };
  } catch {
    return { value: null, error: "Layouts JSON is invalid. Please check formatting." };
  }
};

const isTooLarge = (file: File) => file.size > MAX_FILE_MB * 1024 * 1024;
const normalizeToken = (value: string | undefined) => {
  const token = (value ?? "").trim();
  if (!token) {
    return "";
  }

  // Common copy/paste issue: token accidentally pasted twice.
  if (token.length % 2 === 0) {
    const half = token.length / 2;
    const firstHalf = token.slice(0, half);
    const secondHalf = token.slice(half);
    if (firstHalf === secondHalf) {
      return firstHalf;
    }
  }

  return token;
};

const uploadToStrapi = async (files: File[], strapiUrl: string, token: string) => {
  if (files.length === 0) {
    return [] as number[];
  }

  const uploadForm = new FormData();
  for (const file of files) {
    uploadForm.append("files", file);
  }

  const response = await fetch(`${strapiUrl}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: uploadForm,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upload failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as Array<{ id: number }>;
  return data.map((item) => item.id);
};

export async function POST(request: Request) {
  const strapiUrl = getStrapiServerUrl();
  const token = normalizeToken(process.env.STRAPI_SUBMISSIONS_TOKEN ?? process.env.STRAPI_API_TOKEN);
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json(
      { error: "Missing STRAPI_SUBMISSIONS_TOKEN or STRAPI_API_TOKEN on server." },
      { status: 500 }
    );
  }

  try {
    if (!userJwt) {
      return NextResponse.json({ error: "Please log in before submitting a course." }, { status: 401 });
    }
    const meResponse = await fetch(`${strapiUrl}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
      cache: "no-store",
    });
    if (!meResponse.ok) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    const me = (await meResponse.json()) as { id?: number; confirmed?: boolean };
    if (!me.id) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    if (!me.confirmed) {
      return NextResponse.json(
        { error: "Please verify your email before submitting a course." },
        { status: 403 }
      );
    }

    const form = await request.formData();

    const courseName = String(form.get("courseName") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const state = String(form.get("state") ?? "").trim();
    const country = String(form.get("country") ?? "").trim();
    const latitudeRaw = String(form.get("latitude") ?? "").trim();
    const longitudeRaw = String(form.get("longitude") ?? "").trim();
    const difficulty = String(form.get("difficulty") ?? "").trim();
    const courseType = String(form.get("courseType") ?? "").trim();
    const pros = String(form.get("pros") ?? "").trim();
    const cons = String(form.get("cons") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const videoLinksRaw = String(form.get("videoLinks") ?? "").trim();
    const layoutsJsonRaw = String(form.get("layoutsJson") ?? "").trim();

    if (!courseName) {
      return NextResponse.json({ error: "Course name is required." }, { status: 400 });
    }
    if (!description || description.length < 80) {
      return NextResponse.json({ error: "Description must be at least 80 characters." }, { status: 400 });
    }
    if (difficulty && !DIFFICULTY_ENUMS.has(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty value." }, { status: 400 });
    }
    if (courseType && !COURSE_TYPE_ENUMS.has(courseType)) {
      return NextResponse.json({ error: "Invalid type value." }, { status: 400 });
    }
    const parsedLatitude = parseCoordinateInRange(latitudeRaw, "Latitude", -90, 90);
    if (parsedLatitude.error) {
      return NextResponse.json({ error: parsedLatitude.error }, { status: 400 });
    }
    const parsedLongitude = parseCoordinateInRange(longitudeRaw, "Longitude", -180, 180);
    if (parsedLongitude.error) {
      return NextResponse.json({ error: parsedLongitude.error }, { status: 400 });
    }

    const photoFiles = form
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const videoFiles = form
      .getAll("videos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (photoFiles.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `No more than ${MAX_PHOTOS} photos allowed.` }, { status: 400 });
    }
    if (videoFiles.length > MAX_VIDEOS) {
      return NextResponse.json({ error: `No more than ${MAX_VIDEOS} videos allowed.` }, { status: 400 });
    }

    for (const file of photoFiles) {
      if (!IMAGE_TYPES.has(file.type) || isTooLarge(file)) {
        return NextResponse.json({ error: `Invalid photo file: ${file.name}` }, { status: 400 });
      }
    }
    for (const file of videoFiles) {
      if (!VIDEO_TYPES.has(file.type) || isTooLarge(file)) {
        return NextResponse.json({ error: `Invalid video file: ${file.name}` }, { status: 400 });
      }
    }

    const [photoIds, videoIds] = await Promise.all([
      uploadToStrapi(photoFiles, strapiUrl, token),
      uploadToStrapi(videoFiles, strapiUrl, token),
    ]);

    const parsedVideoLinks = parseLinks(videoLinksRaw);
    const parsedLayouts = parseLayoutsJson(layoutsJsonRaw);
    if (parsedLayouts.error) {
      return NextResponse.json({ error: parsedLayouts.error }, { status: 400 });
    }

    const payload = {
      data: {
        courseName,
        city: city || null,
        state: state || null,
        country: country || null,
        latitude: parsedLatitude.value,
        longitude: parsedLongitude.value,
        difficulty: difficulty || null,
        type: courseType || null,
        pros: pros || null,
        cons: cons || null,
        description,
        photos: photoIds,
        videos: videoIds,
        ...(parsedVideoLinks.length > 0 ? { videoLInks: parsedVideoLinks } : {}),
        ...(parsedLayouts.value ? { layouts: parsedLayouts.value } : {}),
        submittedBy: me.id,
      },
    };

    let createResponse = await fetch(`${strapiUrl}/api/course-submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!createResponse.ok) {
      const firstDetail = await createResponse.text();
      const shouldRetryWithoutVideoLinks =
        parsedVideoLinks.length > 0 &&
        (firstDetail.includes("Invalid key videoLinks") || firstDetail.includes("Invalid key videoLInks"));

      if (shouldRetryWithoutVideoLinks) {
        const fallbackPayload = {
          data: {
            ...payload.data,
            videoLInks: undefined,
          },
        };
        createResponse = await fetch(`${strapiUrl}/api/course-submissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(fallbackPayload),
          cache: "no-store",
        });
      } else {
        return NextResponse.json(
          { error: `Submission failed (${createResponse.status}): ${firstDetail.slice(0, 200)}` },
          { status: 502 }
        );
      }
    }

    if (!createResponse.ok) {
      const detail = await createResponse.text();
      return NextResponse.json(
        { error: `Submission failed (${createResponse.status}): ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const created = await createResponse.json();
    return NextResponse.json({ ok: true, submission: created?.data ?? null });
  } catch (error) {
    const strapiUrl = getStrapiServerUrl();
    const message = strapiConnectionError(error, strapiUrl);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
