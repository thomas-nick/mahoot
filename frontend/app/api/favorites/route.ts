import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

const readJwt = (request: Request) => {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
};

const getMe = async (jwt: string) => {
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as { id?: number };
};

const findListing = async (jwt: string, documentId: string) => {
  const params = new URLSearchParams({
    "filters[documentId][$eq]": documentId,
    "pagination[pageSize]": "1",
    "fields[0]": "documentId",
  });
  const response = await fetch(`${STRAPI_URL}/api/market-listings?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { data?: Array<{ id?: number; documentId?: string }> };
  return json.data?.[0] ?? null;
};

/**
 * GET /api/favorites           → list my favorites (with embedded listing data)
 * GET /api/favorites?listing=X → return { favoriteId } for the given listing or null
 */
export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(request.url);
  const listing = url.searchParams.get("listing");

  if (listing) {
    const params = new URLSearchParams({
      "filters[user][id][$eq]": String(me.id),
      "filters[listing][documentId][$eq]": listing,
      "pagination[pageSize]": "1",
      "fields[0]": "documentId",
    });
    const response = await fetch(`${STRAPI_URL}/api/market-favorites?${params.toString()}`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ favoriteId: null });
    }
    const json = (await response.json()) as { data?: Array<{ documentId?: string }> };
    const id = json.data?.[0]?.documentId ?? null;
    return NextResponse.json({ favoriteId: id });
  }

  const params = new URLSearchParams({
    "filters[user][id][$eq]": String(me.id),
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "100",
    "populate[listing][populate][seller][fields][0]": "username",
    "populate[listing][fields][2]": "imageUrls",
  });
  const response = await fetch(`${STRAPI_URL}/api/market-favorites?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Could not load favorites (${response.status}). Confirm Authenticated → market-favorite has find/findOne. ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  const json = (await response.json()) as { data?: Array<unknown> };
  return NextResponse.json({ favorites: json.data ?? [] });
}

export async function POST(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { listingDocumentId?: string };
  const listingDocumentId = (body.listingDocumentId ?? "").trim();
  if (!listingDocumentId) {
    return NextResponse.json({ error: "listingDocumentId is required." }, { status: 400 });
  }

  const listing = await findListing(jwt, listingDocumentId);
  if (!listing?.id) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // De-dupe: if a favorite already exists for this user+listing, return it.
  const existingParams = new URLSearchParams({
    "filters[user][id][$eq]": String(me.id),
    "filters[listing][documentId][$eq]": listingDocumentId,
    "pagination[pageSize]": "1",
    "fields[0]": "documentId",
  });
  const existing = await fetch(
    `${STRAPI_URL}/api/market-favorites?${existingParams.toString()}`,
    { headers: { Authorization: `Bearer ${jwt}` }, cache: "no-store" },
  );
  if (existing.ok) {
    const json = (await existing.json()) as { data?: Array<{ documentId?: string }> };
    if (json.data?.[0]?.documentId) {
      return NextResponse.json({ favoriteId: json.data[0].documentId, deduped: true });
    }
  }

  const create = await fetch(`${STRAPI_URL}/api/market-favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      data: { listing: listingDocumentId },
    }),
    cache: "no-store",
  });
  if (!create.ok) {
    const detail = await create.text();
    return NextResponse.json(
      { error: `Could not save favorite (${create.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  const saved = (await create.json()) as { data?: { documentId?: string } };
  return NextResponse.json({ favoriteId: saved.data?.documentId ?? null });
}
