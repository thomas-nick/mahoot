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
 * POST /api/messages/read — mark unread messages in a thread as read.
 * Body: { listingDocumentId: string, fromUserId: number } — marks messages
 * where you are the recipient, listing matches, and sender is fromUserId.
 */
export async function POST(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    listingDocumentId?: string;
    /** When set, only messages from this sender are marked. When omitted, every unread inbound message on the listing is marked (seller inbox). */
    fromUserId?: number;
  };
  const listingDocumentId = (body.listingDocumentId ?? "").trim();
  const fromUserId = body.fromUserId !== undefined ? Number(body.fromUserId) : NaN;
  if (!listingDocumentId) {
    return NextResponse.json({ error: "listingDocumentId is required." }, { status: 400 });
  }
  if (Number.isFinite(fromUserId) && fromUserId === me.id) {
    return NextResponse.json({ error: "fromUserId must be the other party." }, { status: 400 });
  }

  const params = new URLSearchParams({
    "filters[listing][documentId][$eq]": listingDocumentId,
    "filters[recipient][id][$eq]": String(me.id),
    "filters[readAt][$null]": "true",
    "pagination[pageSize]": "100",
    "fields[0]": "documentId",
  });
  if (Number.isFinite(fromUserId)) {
    params.set("filters[sender][id][$eq]", String(fromUserId));
  }

  const list = await fetch(`${STRAPI_URL}/api/market-messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!list.ok) {
    const detail = await list.text();
    return NextResponse.json(
      { error: `Could not list messages (${list.status}). ${detail.slice(0, 160)}` },
      { status: 502 },
    );
  }
  const json = (await list.json()) as { data?: Array<{ documentId?: string }> };
  const rows = json.data ?? [];
  const readAt = new Date().toISOString();
  let updated = 0;
  for (const row of rows) {
    const docId = row.documentId;
    if (!docId) continue;
    const put = await fetch(`${STRAPI_URL}/api/market-messages/${encodeURIComponent(docId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ data: { readAt } }),
      cache: "no-store",
    });
    if (put.ok) updated += 1;
  }

  return NextResponse.json({ ok: true, marked: updated });
}
