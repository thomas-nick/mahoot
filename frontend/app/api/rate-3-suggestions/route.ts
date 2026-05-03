import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";
import {
  getAllDiscRatingSummaries,
  getAllDiscsForSimilarity,
} from "@/lib/strapi";

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

const fetchRatedDiscIdsForUser = async (jwt: string, userId: number): Promise<Set<string>> => {
  const ids = new Set<string>();
  let page = 1;
  while (page < 50) {
    const params = new URLSearchParams({
      "filters[submittedBy][id][$eq]": String(userId),
      "pagination[page]": String(page),
      "pagination[pageSize]": "100",
      "fields[0]": "discDocumentId",
    });
    const response = await fetch(`${STRAPI_URL}/api/disc-ratings?${params.toString()}`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!response.ok) break;
    const json = (await response.json()) as {
      data?: Array<{ discDocumentId?: string }>;
      meta?: { pagination?: { pageCount?: number } };
    };
    for (const row of json.data ?? []) {
      if (row.discDocumentId) ids.add(row.discDocumentId);
    }
    const pageCount = json.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page += 1;
  }
  return ids;
};

const shuffle = <T,>(array: T[]): T[] => {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * GET /api/rate-3-suggestions
 *
 * Returns 3 disc suggestions for the signed-in user to rate. Drawn from the
 * most-reviewed pool, excluding discs they've already rated, then shuffled so
 * subsequent reloads don't show the same trio.
 */
export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  let alreadyRated: Set<string>;
  try {
    alreadyRated = await fetchRatedDiscIdsForUser(jwt, me.id);
  } catch {
    alreadyRated = new Set();
  }

  let summaries: Map<string, { ratingCount: number }>;
  let allDiscs: Awaited<ReturnType<typeof getAllDiscsForSimilarity>>;
  try {
    [summaries, allDiscs] = await Promise.all([
      getAllDiscRatingSummaries(),
      getAllDiscsForSimilarity(),
    ]);
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  const discById = new Map(allDiscs.map((disc) => [disc.documentId, disc]));

  // Pool: most-reviewed discs the user hasn't rated yet. If the catalog is too
  // sparse (no reviews yet), fall back to a few random discs.
  const ranked = Array.from(summaries.entries())
    .sort((a, b) => (b[1].ratingCount ?? 0) - (a[1].ratingCount ?? 0))
    .map(([id]) => id)
    .filter((id) => !alreadyRated.has(id) && discById.has(id))
    .slice(0, 30);

  let pool = ranked;
  if (pool.length < 3) {
    const fallback = shuffle(allDiscs.filter((disc) => !alreadyRated.has(disc.documentId)))
      .slice(0, 30)
      .map((disc) => disc.documentId);
    pool = Array.from(new Set([...pool, ...fallback]));
  }

  const picks = shuffle(pool).slice(0, 3);
  const suggestions = picks
    .map((id) => discById.get(id))
    .filter((disc): disc is NonNullable<typeof disc> => Boolean(disc))
    .map((disc) => ({
      documentId: disc.documentId,
      externalId: disc.externalId,
      name: disc.name,
      brand: disc.brand,
      category: disc.category,
      imageUrl: disc.imageUrl,
      speed: disc.speed,
      glide: disc.glide,
      turn: disc.turn,
      fade: disc.fade,
    }));

  return NextResponse.json({ suggestions });
}
