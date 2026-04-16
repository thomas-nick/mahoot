import { NextResponse } from "next/server";

import { parseCoordinateInRange } from "@/lib/coordinate-parse";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();
const DIFFICULTIES = new Set(["championship", "advanced", "intermediate", "easy"]);
const COURSE_TYPES = new Set(["championship", "wooded", "park style", "pitch and putt"]);

const getJwt = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return "";
  }
  return header.slice("Bearer ".length).trim();
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const jwt = getJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const { documentId } = await params;
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId." }, { status: 400 });
  }

  const meResponse = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
  });
  if (!meResponse.ok) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }
  const me = (await meResponse.json()) as { confirmed?: boolean };
  if (!me.confirmed) {
    return NextResponse.json({ error: "Please verify your email before editing courses." }, { status: 403 });
  }

  const body = (await request.json()) as {
    city?: string;
    state?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    difficulty?: string;
    type?: string;
    pros?: string;
    cons?: string;
    description?: string;
    videoLinks?: string[];
    layouts?: unknown;
  };

  const difficulty = (body.difficulty ?? "").trim();
  const type = (body.type ?? "").trim();

  if (difficulty && !DIFFICULTIES.has(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty value." }, { status: 400 });
  }
  if (type && !COURSE_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type value." }, { status: 400 });
  }
  const parsedLatitude = parseCoordinateInRange(body.latitude, "Latitude", -90, 90);
  if (parsedLatitude.error) {
    return NextResponse.json({ error: parsedLatitude.error }, { status: 400 });
  }
  const parsedLongitude = parseCoordinateInRange(body.longitude, "Longitude", -180, 180);
  if (parsedLongitude.error) {
    return NextResponse.json({ error: parsedLongitude.error }, { status: 400 });
  }

  const videoLinks = Array.isArray(body.videoLinks)
    ? body.videoLinks.map((link) => String(link).trim()).filter(Boolean)
    : [];
  const layouts = body.layouts;
  if (layouts !== null && layouts !== undefined && !Array.isArray(layouts)) {
    return NextResponse.json({ error: "Layouts must be a JSON array." }, { status: 400 });
  }

  const payload = {
    data: {
      city: (body.city ?? "").trim() || null,
      state: (body.state ?? "").trim() || null,
      country: (body.country ?? "").trim() || null,
      latitude: parsedLatitude.value,
      longitude: parsedLongitude.value,
      difficulty: difficulty || null,
      type: type || null,
      pros: (body.pros ?? "").trim() || null,
      cons: (body.cons ?? "").trim() || null,
      description: (body.description ?? "").trim() || null,
      videoLinks: videoLinks.length > 0 ? videoLinks : null,
      layouts: Array.isArray(layouts) ? layouts : null,
    },
  };

  const response = await fetch(`${STRAPI_URL}/api/courses/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Course update failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const updated = await response.json();
  return NextResponse.json({ ok: true, course: updated?.data ?? null });
}
