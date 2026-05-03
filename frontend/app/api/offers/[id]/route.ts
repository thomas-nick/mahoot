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

const findOffer = async (jwt: string, documentId: string) => {
  const params = new URLSearchParams({
    "filters[documentId][$eq]": documentId,
    "pagination[pageSize]": "1",
    "populate[buyer][fields][0]": "id",
    "populate[listing][populate][seller][fields][0]": "id",
  });
  const response = await fetch(`${STRAPI_URL}/api/market-offers?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    data?: Array<{
      documentId?: string;
      status?: string;
      buyer?: { id?: number } | null;
      listing?: { seller?: { id?: number } | null } | null;
    }>;
  };
  return json.data?.[0] ?? null;
};

const ALLOWED_STATUSES = new Set(["accepted", "declined", "countered", "withdrawn"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    counterPriceUsd?: number;
    sellerNote?: string;
  };
  const status = (body.status ?? "").trim();
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const offer = await findOffer(jwt, id);
  if (!offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  const buyerId = offer.buyer?.id;
  const sellerId = offer.listing?.seller?.id;

  // Only the buyer can withdraw; only the seller can accept/decline/counter.
  if (status === "withdrawn" && buyerId !== me.id) {
    return NextResponse.json({ error: "Only the buyer can withdraw an offer." }, { status: 403 });
  }
  if (status !== "withdrawn" && sellerId !== me.id) {
    return NextResponse.json(
      { error: "Only the seller can accept, decline, or counter." },
      { status: 403 },
    );
  }

  const data: Record<string, unknown> = { status };
  if (status === "countered") {
    const counter = Number(body.counterPriceUsd);
    if (!Number.isFinite(counter) || counter <= 0) {
      return NextResponse.json({ error: "counterPriceUsd must be a positive number." }, { status: 400 });
    }
    data.counterPriceUsd = counter;
  }
  if (typeof body.sellerNote === "string" && body.sellerNote.trim()) {
    data.sellerNote = body.sellerNote.trim();
  }

  const response = await fetch(`${STRAPI_URL}/api/market-offers/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Update failed (${response.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
