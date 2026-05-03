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

/**
 * GET /api/course-review-votes?ratings=docId1,docId2,…
 */
export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ votes: {} });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ votes: {} });

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ratings") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ votes: {} });

  const params = new URLSearchParams();
  params.set("filters[voter][id][$eq]", String(me.id));
  ids.forEach((id, index) => {
    params.set(`filters[rating][documentId][$in][${index}]`, id);
  });
  params.set("pagination[pageSize]", "200");
  params.set("fields[0]", "value");
  params.set("populate[rating][fields][0]", "documentId");

  const response = await fetch(`${STRAPI_URL}/api/course-rating-votes?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ votes: {} });
  const json = (await response.json()) as {
    data?: Array<{ value?: number; rating?: { documentId?: string } }>;
  };
  const votes: Record<string, number> = {};
  for (const row of json.data ?? []) {
    const id = row.rating?.documentId;
    if (!id || typeof row.value !== "number") continue;
    votes[id] = row.value === -1 ? -1 : 1;
  }
  return NextResponse.json({ votes });
}

export async function POST(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    ratingDocumentId?: string;
    value?: number;
  };
  const ratingDocumentId = (body.ratingDocumentId ?? "").trim();
  if (!ratingDocumentId) {
    return NextResponse.json({ error: "ratingDocumentId is required." }, { status: 400 });
  }
  const value = body.value === -1 ? -1 : 1;

  const response = await fetch(`${STRAPI_URL}/api/course-rating-votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ data: { rating: ratingDocumentId, value } }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Vote failed (${response.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, value });
}

export async function DELETE(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const url = new URL(request.url);
  const ratingDocumentId = (url.searchParams.get("rating") ?? "").trim();
  if (!ratingDocumentId) {
    return NextResponse.json({ error: "rating is required." }, { status: 400 });
  }
  const response = await fetch(
    `${STRAPI_URL}/api/course-rating-votes/by-rating/${encodeURIComponent(ratingDocumentId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Could not remove vote (${response.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
