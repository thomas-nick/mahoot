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

const findFavoriteByDocumentId = async (jwt: string, documentId: string) => {
  const params = new URLSearchParams({
    "filters[documentId][$eq]": documentId,
    "pagination[pageSize]": "1",
    "populate[user][fields][0]": "id",
  });
  const response = await fetch(`${STRAPI_URL}/api/market-favorites?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    data?: Array<{ documentId?: string; user?: { id?: number } | null }>;
  };
  return json.data?.[0] ?? null;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  // Defense in depth: even though Strapi enforces this server-side, double-check
  // we own the favorite before sending the delete.
  const favorite = await findFavoriteByDocumentId(jwt, id);
  if (!favorite) {
    return NextResponse.json({ error: "Favorite not found." }, { status: 404 });
  }
  if (favorite.user?.id !== me.id) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const response = await fetch(
    `${STRAPI_URL}/api/market-favorites/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Delete failed (${response.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
