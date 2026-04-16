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

const getDiscKind = async (documentId: string, jwt: string): Promise<"variant" | "legacy" | null> => {
  const commonHeaders = {
    Authorization: `Bearer ${jwt}`,
  };

  const variantQuery = new URLSearchParams({
    "filters[documentId][$eq]": documentId,
    "pagination[pageSize]": "1",
    "fields[0]": "documentId",
  });
  const variantResponse = await fetch(`${STRAPI_URL}/api/disc-variants?${variantQuery.toString()}`, {
    headers: commonHeaders,
    cache: "no-store",
  });
  if (variantResponse.ok) {
    const variantJson = (await variantResponse.json()) as { data?: Array<{ documentId?: string }> };
    if ((variantJson.data ?? []).length > 0) {
      return "variant";
    }
  }

  const legacyQuery = new URLSearchParams({
    "filters[documentId][$eq]": documentId,
    "pagination[pageSize]": "1",
    "fields[0]": "documentId",
  });
  const legacyResponse = await fetch(`${STRAPI_URL}/api/discs?${legacyQuery.toString()}`, {
    headers: commonHeaders,
    cache: "no-store",
  });
  if (legacyResponse.ok) {
    const legacyJson = (await legacyResponse.json()) as { data?: Array<{ documentId?: string }> };
    if ((legacyJson.data ?? []).length > 0) {
      return "legacy";
    }
  }

  return null;
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
    return NextResponse.json({ error: "Please verify your email before editing discs." }, { status: 403 });
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

  const discKind = await getDiscKind(documentId, jwt);
  if (!discKind) {
    return NextResponse.json({ error: "Disc not found or not editable." }, { status: 404 });
  }

  const commonPayload = {
    speed: speed.value,
    glide: glide.value,
    turn: turn.value,
    fade: fade.value,
    stability: toOptionalString(body.stability),
    link: toOptionalString(body.link),
    imageUrl: toOptionalString(body.imageUrl),
  };

  const payload =
    discKind === "variant"
      ? {
          data: {
            displayName: toOptionalString(body.name),
            ...commonPayload,
          },
        }
      : {
          data: {
            name: toOptionalString(body.name),
            brand: toOptionalString(body.brand),
            category: toOptionalString(body.category),
            plastic: toOptionalString(body.plastic),
            ...commonPayload,
            diameterCm: diameterCm.value,
            heightCm: heightCm.value,
            rimDepthCm: rimDepthCm.value,
            rimThicknessCm: rimThicknessCm.value,
            maxWeightGr: maxWeightGr.value,
            color: toOptionalString(body.color),
            backgroundColor: toOptionalString(body.backgroundColor),
          },
        };

  const endpoint = discKind === "variant" ? "disc-variants" : "discs";
  const response = await fetch(`${STRAPI_URL}/api/${endpoint}/${encodeURIComponent(documentId)}`, {
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
      { error: `Disc update failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const updated = await response.json();
  return NextResponse.json({
    ok: true,
    discKind,
    disc: updated?.data ?? null,
  });
}
