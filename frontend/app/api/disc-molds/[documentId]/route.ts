import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

const getJwt = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return "";
  }
  return header.slice("Bearer ".length).trim();
};

const toOptionalString = (value: unknown) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
};

const toOptionalNumber = (value: unknown, label: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { value: null as number | null };
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return { error: `${label} must be a valid number.` };
  }
  return { value: parsed };
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
    return NextResponse.json({ error: "Please verify your email before editing disc molds." }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const speed = toOptionalNumber(body.speed, "Speed");
  const glide = toOptionalNumber(body.glide, "Glide");
  const turn = toOptionalNumber(body.turn, "Turn");
  const fade = toOptionalNumber(body.fade, "Fade");
  const diameterCm = toOptionalNumber(body.diameterCm, "Diameter");
  const heightCm = toOptionalNumber(body.heightCm, "Height");
  const rimDepthCm = toOptionalNumber(body.rimDepthCm, "Rim depth");
  const rimThicknessCm = toOptionalNumber(body.rimThicknessCm, "Rim thickness");
  const maxWeightGr = toOptionalNumber(body.maxWeightGr, "Max weight");
  const numericChecks = [speed, glide, turn, fade, diameterCm, heightCm, rimDepthCm, rimThicknessCm, maxWeightGr];
  const numericError = numericChecks.find((check) => check.error)?.error;
  if (numericError) {
    return NextResponse.json({ error: numericError }, { status: 400 });
  }

  const payload = {
    data: {
      name: toOptionalString(body.name),
      brand: toOptionalString(body.brand),
      category: toOptionalString(body.category),
      speed: speed.value,
      glide: glide.value,
      turn: turn.value,
      fade: fade.value,
      stability: toOptionalString(body.stability),
      diameterCm: diameterCm.value,
      heightCm: heightCm.value,
      rimDepthCm: rimDepthCm.value,
      rimThicknessCm: rimThicknessCm.value,
      maxWeightGr: maxWeightGr.value,
      color: toOptionalString(body.color),
      backgroundColor: toOptionalString(body.backgroundColor),
    },
  };

  const response = await fetch(`${STRAPI_URL}/api/disc-molds/${encodeURIComponent(documentId)}`, {
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
      { error: `Disc mold update failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const updated = await response.json();
  return NextResponse.json({ ok: true, mold: updated?.data ?? null });
}
