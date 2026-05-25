import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const MAX_NOTES_LEN = 3000;
const MAX_DESCRIPTION_LEN = 10000;

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

const normalizeToken = (value: string | undefined) => {
  const token = (value ?? "").trim();
  if (!token) {
    return "";
  }

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

const trimStr = (raw: unknown) => String(raw ?? "").trim();

const toNumberOrNull = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "number" ? raw : String(raw).trim();
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/** Accept JSON (`application/json`) or `multipart/form-data` / `application/x-www-form-urlencoded`. */
const readSubmissionFields = async (request: Request): Promise<Record<string, unknown>> => {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && "data" in body) {
      const inner = (body as { data: unknown }).data;
      if (inner && typeof inner === "object") {
        return inner as Record<string, unknown>;
      }
    }
    return (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  }

  const form = await request.formData();
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof File !== "undefined" && value instanceof File) continue;
    out[key] = value;
  }
  return out;
};

export async function POST(request: Request) {
  const strapiUrl = getStrapiServerUrl();
  const token = normalizeToken(process.env.STRAPI_SUBMISSIONS_TOKEN ?? process.env.STRAPI_API_TOKEN);
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json(
      { error: "Missing STRAPI_SUBMISSIONS_TOKEN or STRAPI_API_TOKEN on server." },
      { status: 500 },
    );
  }

  try {
    if (!userJwt) {
      return NextResponse.json({ error: "Please log in before submitting a disc." }, { status: 401 });
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
        { error: "Please verify your email before submitting a disc." },
        { status: 403 },
      );
    }

    const input = await readSubmissionFields(request);
    const discName = trimStr(input.discName);
    const brand = trimStr(input.brand);
    const category = trimStr(input.category);
    const speed = toNumberOrNull(input.speed);
    const glide = toNumberOrNull(input.glide);
    const turn = toNumberOrNull(input.turn);
    const fade = toNumberOrNull(input.fade);
    const stability = trimStr(input.stability);
    const plastic = trimStr(input.plastic);
    const diameterCm = toNumberOrNull(input.diameterCm);
    const heightCm = toNumberOrNull(input.heightCm);
    const rimDepthCm = toNumberOrNull(input.rimDepthCm);
    const rimThicknessCm = toNumberOrNull(input.rimThicknessCm);
    const maxWeightGr = toNumberOrNull(input.maxWeightGr);
    const link = trimStr(input.link);
    const imageUrl = trimStr(input.imageUrl);
    const color = trimStr(input.color);
    const backgroundColor = trimStr(input.backgroundColor);
    const description = trimStr(input.description);
    const notes = trimStr(input.notes);

    if (!discName) {
      return NextResponse.json({ error: "Disc name is required." }, { status: 400 });
    }
    if ([speed, glide, turn, fade].some((v) => Number.isNaN(v))) {
      return NextResponse.json({ error: "Flight numbers must be valid numbers." }, { status: 400 });
    }
    if ([diameterCm, heightCm, rimDepthCm, rimThicknessCm, maxWeightGr].some((v) => Number.isNaN(v))) {
      return NextResponse.json({ error: "Dimensions must be valid numbers." }, { status: 400 });
    }
    if (notes.length > MAX_NOTES_LEN) {
      return NextResponse.json(
        { error: `Notes must be ${MAX_NOTES_LEN} characters or fewer.` },
        { status: 400 },
      );
    }
    if (description.length > MAX_DESCRIPTION_LEN) {
      return NextResponse.json(
        { error: `Description must be ${MAX_DESCRIPTION_LEN} characters or fewer.` },
        { status: 400 },
      );
    }

    const payload = {
      data: {
        discName,
        brand: brand || null,
        category: category || null,
        speed,
        glide,
        turn,
        fade,
        stability: stability || null,
        plastic: plastic || null,
        diameterCm,
        heightCm,
        rimDepthCm,
        rimThicknessCm,
        maxWeightGr,
        link: link || null,
        imageUrl: imageUrl || null,
        color: color || null,
        backgroundColor: backgroundColor || null,
        description: description || null,
        notes: notes || null,
        submittedBy: { connect: [me.id] },
      },
    };

    let createResponse = await fetch(`${strapiUrl}/api/disc-submissions`, {
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
      const shouldRetrySubmittedByFormat = firstDetail.includes("Invalid key submittedBy");
      if (shouldRetrySubmittedByFormat) {
        const fallbackPayload = {
          data: {
            ...payload.data,
            submittedBy: me.id,
          },
        };
        createResponse = await fetch(`${strapiUrl}/api/disc-submissions`, {
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
          { status: 502 },
        );
      }
    }

    if (!createResponse.ok) {
      const detail = await createResponse.text();
      return NextResponse.json(
        { error: `Submission failed (${createResponse.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const created = await createResponse.json();
    return NextResponse.json({ ok: true, submission: created?.data ?? null });
  } catch (error) {
    const message = strapiConnectionError(error, strapiUrl);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
