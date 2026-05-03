import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();
const ALLOWED_STATUSES = new Set(["active", "sold", "cancelled"]);

const readJwt = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const getMe = async (jwt: string) => {
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as { id?: number };
};

type RawListing = {
  id?: number;
  documentId?: string;
  title?: string;
  description?: string | null;
  priceUsd?: number | string | null;
  currency?: string | null;
  condition?: string | null;
  status?: string | null;
  negotiable?: boolean | null;
  plastic?: string | null;
  shipping?: string | null;
  discDocumentId?: string | null;
  discDisplayName?: string | null;
  imageUrl?: string | null;
  imageUrls?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  priceUsd: number | null;
  currency: string;
  condition: string;
  status: string;
  negotiable: boolean;
  plastic: string | null;
  shipping: string | null;
  discDocumentId: string;
  discDisplayName: string;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const firstExtraImage = (raw: unknown): string | null => {
  if (!Array.isArray(raw)) return null;
  const first = raw.find((value): value is string => typeof value === "string" && value.length > 0);
  return first ?? null;
};

const toRow = (item: RawListing): ListingRow | null => {
  const id = (item.documentId ?? "").trim() || (item.id ? String(item.id) : "");
  if (!id) return null;
  const rawPrice =
    typeof item.priceUsd === "number"
      ? item.priceUsd
      : Number(typeof item.priceUsd === "string" ? item.priceUsd : NaN);
  return {
    id,
    title: item.title ?? "(Untitled listing)",
    priceUsd: Number.isFinite(rawPrice) ? rawPrice : null,
    currency: (item.currency ?? "USD").toUpperCase() || "USD",
    condition: item.condition ?? "used",
    status: item.status ?? "active",
    negotiable: item.negotiable !== false,
    plastic: item.plastic?.trim() || null,
    shipping: item.shipping?.trim() || null,
    discDocumentId: item.discDocumentId ?? "",
    discDisplayName: item.discDisplayName ?? "",
    imageUrl: (item.imageUrl && item.imageUrl.trim()) || firstExtraImage(item.imageUrls) || null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
};

export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }
  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const query = new URLSearchParams({
    "filters[seller][id][$eq]": String(me.id),
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "100",
  });

  const response = await fetch(`${STRAPI_URL}/api/market-listings?${query.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Could not load listings (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  const json = (await response.json()) as { data?: RawListing[] };
  const listings = (json.data ?? [])
    .map((item) => toRow(item))
    .filter((row): row is ListingRow => Boolean(row));
  return NextResponse.json({ listings });
}

export async function PATCH(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }
  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    documentId?: string;
    status?: string;
  };
  const documentId = (body.documentId ?? "").trim();
  const status = (body.status ?? "").trim();
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const response = await fetch(`${STRAPI_URL}/api/market-listings/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ data: { status } }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Update failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
