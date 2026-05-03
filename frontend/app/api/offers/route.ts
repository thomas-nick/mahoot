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
    "fields[1]": "priceUsd",
    "fields[2]": "negotiable",
    "fields[3]": "title",
    "populate[seller][fields][0]": "id",
  });
  const response = await fetch(`${STRAPI_URL}/api/market-listings?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    data?: Array<{
      id?: number;
      documentId?: string;
      priceUsd?: number;
      negotiable?: boolean;
      title?: string;
      seller?: { id?: number } | null;
    }>;
  };
  return json.data?.[0] ?? null;
};

/**
 * GET /api/offers           → list offers I'm involved in (as buyer or seller)
 * GET /api/offers?listing=X → list offers on listing X (must be buyer or seller)
 */
export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(request.url);
  const listing = url.searchParams.get("listing");

  const params = new URLSearchParams({
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "100",
    "populate[buyer][fields][0]": "username",
    "populate[buyer][fields][1]": "email",
    "populate[listing][fields][0]": "title",
    "populate[listing][fields][1]": "documentId",
    "populate[listing][fields][2]": "priceUsd",
    "populate[listing][populate][seller][fields][0]": "username",
    "populate[listing][populate][seller][fields][1]": "id",
  });

  if (listing) {
    params.set("filters[listing][documentId][$eq]", listing);
  } else {
    params.set("filters[$or][0][buyer][id][$eq]", String(me.id));
    params.set("filters[$or][1][listing][seller][id][$eq]", String(me.id));
  }

  const response = await fetch(`${STRAPI_URL}/api/market-offers?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: `Could not load offers (${response.status}). Confirm Authenticated → market-offer has find/findOne. ${detail.slice(0, 200)}`,
      },
      { status: 502 },
    );
  }
  const json = (await response.json()) as { data?: Array<unknown> };
  return NextResponse.json({ offers: json.data ?? [] });
}

export async function POST(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    listingDocumentId?: string;
    priceUsd?: number;
    note?: string;
  };
  const listingDocumentId = (body.listingDocumentId ?? "").trim();
  const priceUsd = Number(body.priceUsd);
  const note = (body.note ?? "").trim() || null;
  if (!listingDocumentId || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return NextResponse.json({ error: "listing and a positive price are required." }, { status: 400 });
  }

  const listing = await findListing(jwt, listingDocumentId);
  if (!listing?.id) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.seller?.id === me.id) {
    return NextResponse.json({ error: "You cannot offer on your own listing." }, { status: 400 });
  }
  if (!listing.negotiable) {
    return NextResponse.json({ error: "This seller is not accepting offers." }, { status: 400 });
  }

  const create = await fetch(`${STRAPI_URL}/api/market-offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      data: {
        listing: listingDocumentId,
        priceUsd,
        note,
        status: "pending",
      },
    }),
    cache: "no-store",
  });
  if (!create.ok) {
    const detail = await create.text();
    return NextResponse.json(
      { error: `Could not send offer (${create.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  const saved = (await create.json()) as { data?: unknown };
  return NextResponse.json({ ok: true, offer: saved.data ?? null });
}
