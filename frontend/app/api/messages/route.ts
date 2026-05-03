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
    "populate[seller][fields][0]": "id",
    "populate[seller][fields][1]": "username",
  });
  const response = await fetch(`${STRAPI_URL}/api/market-listings?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    data?: Array<{ id?: number; documentId?: string; seller?: { id?: number } | null }>;
  };
  return json.data?.[0] ?? null;
};

/**
 * GET /api/messages?listing=X&with=USER_ID → thread between me and a user on listing X
 * GET /api/messages                        → my inbox (last message per thread)
 */
export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(request.url);
  const listing = url.searchParams.get("listing");
  const withUserRaw = url.searchParams.get("with");
  const withUser = withUserRaw ? Number(withUserRaw) : null;

  const params = new URLSearchParams({
    "sort[0]": "createdAt:asc",
    "pagination[pageSize]": "200",
    "populate[sender][fields][0]": "id",
    "populate[sender][fields][1]": "username",
    "populate[recipient][fields][0]": "id",
    "populate[recipient][fields][1]": "username",
    "populate[listing][fields][0]": "documentId",
    "populate[listing][fields][1]": "title",
  });

  if (listing && withUser) {
    params.set("filters[listing][documentId][$eq]", listing);
    params.set("filters[$or][0][$and][0][sender][id][$eq]", String(me.id));
    params.set("filters[$or][0][$and][1][recipient][id][$eq]", String(withUser));
    params.set("filters[$or][1][$and][0][sender][id][$eq]", String(withUser));
    params.set("filters[$or][1][$and][1][recipient][id][$eq]", String(me.id));
  } else if (listing) {
    // All messages on this listing where I'm a participant (seller view with
    // multiple buyers, or single-thread fallback).
    params.set("filters[listing][documentId][$eq]", listing);
    params.set("filters[$or][0][sender][id][$eq]", String(me.id));
    params.set("filters[$or][1][recipient][id][$eq]", String(me.id));
  } else {
    params.set("filters[$or][0][sender][id][$eq]", String(me.id));
    params.set("filters[$or][1][recipient][id][$eq]", String(me.id));
  }

  const response = await fetch(`${STRAPI_URL}/api/market-messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: `Could not load messages (${response.status}). Confirm Authenticated → market-message has find/findOne. ${detail.slice(0, 200)}`,
      },
      { status: 502 },
    );
  }
  const json = (await response.json()) as { data?: Array<unknown> };
  return NextResponse.json({ messages: json.data ?? [] });
}

export async function POST(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    listingDocumentId?: string;
    recipientId?: number;
    body?: string;
  };
  const listingDocumentId = (body.listingDocumentId ?? "").trim();
  const recipientId = Number(body.recipientId);
  const text = (body.body ?? "").trim();

  if (!listingDocumentId || !Number.isFinite(recipientId) || !text) {
    return NextResponse.json(
      { error: "listingDocumentId, recipientId, and body are required." },
      { status: 400 },
    );
  }
  if (recipientId === me.id) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Message is too long (max 2000 chars)." }, { status: 400 });
  }

  const listing = await findListing(jwt, listingDocumentId);
  if (!listing?.id) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  // Recipient must be either the seller (if I am buyer) or someone who has
  // already messaged me on this listing. We allow the seller path freely; the
  // buyer-buyer case is blocked because recipient must be the listing seller
  // or me must be the listing seller responding to a buyer.
  const sellerId = listing.seller?.id;
  if (sellerId !== me.id && recipientId !== sellerId) {
    return NextResponse.json(
      { error: "You can only message the seller of this listing." },
      { status: 400 },
    );
  }

  const create = await fetch(`${STRAPI_URL}/api/market-messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      data: {
        listing: listingDocumentId,
        recipient: recipientId,
        body: text,
      },
    }),
    cache: "no-store",
  });
  if (!create.ok) {
    const detail = await create.text();
    return NextResponse.json(
      { error: `Could not send message (${create.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  const saved = (await create.json()) as { data?: unknown };
  return NextResponse.json({ ok: true, message: saved.data ?? null });
}
