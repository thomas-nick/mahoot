/**
 * Server-side Typesense helpers used by Next.js RSCs (e.g. /marketplace browse).
 *
 * Keep this file free of `"use client"` and `next/headers` so it can be imported
 * by both server components and route handlers.
 */

type TypesenseConfig = {
  host: string;
  port: string;
  protocol: string;
  apiKey: string;
};

export function getServerTypesenseConfig(): TypesenseConfig | null {
  const host = process.env.TYPESENSE_HOST?.trim();
  const apiKey = process.env.TYPESENSE_API_KEY?.trim();
  if (!host || !apiKey) return null;
  return {
    host,
    port: process.env.TYPESENSE_PORT?.trim() || "8108",
    protocol: process.env.TYPESENSE_PROTOCOL?.trim() || "http",
    apiKey,
  };
}

type ListingSearchHit = {
  document: {
    id: string;
    discId?: string | null;
  };
};

type SearchResponse = {
  hits?: ListingSearchHit[];
  found?: number;
};

/**
 * Free-text search across active marketplace listings. Returns matching
 * listing document IDs (typesense `id` field, which is the strapi documentId)
 * along with the discId of each hit, in relevance order.
 *
 * Returns `null` when Typesense isn't configured — callers should fall back
 * to their existing in-memory filter.
 */
export async function searchActiveListingIds(
  query: string,
  perPage = 60,
): Promise<{ ids: Set<string>; order: string[]; foundDiscIds: Set<string> } | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  const config = getServerTypesenseConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    q: trimmed,
    query_by: "title,description,discDisplayName,sellerUsername",
    filter_by: 'status:="active"',
    per_page: String(perPage),
    prefix: "true",
  });

  const url = `${config.protocol}://${config.host}:${config.port}/collections/listings/documents/search?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { "X-TYPESENSE-API-KEY": config.apiKey },
      cache: "no-store",
    });
    if (!response.ok) return { ids: new Set(), order: [], foundDiscIds: new Set() };
    const data = (await response.json()) as SearchResponse;
    const order: string[] = [];
    const ids = new Set<string>();
    const foundDiscIds = new Set<string>();
    for (const hit of data.hits ?? []) {
      const id = hit.document.id;
      if (id && !ids.has(id)) {
        ids.add(id);
        order.push(id);
      }
      const discId = hit.document.discId ?? "";
      if (discId) foundDiscIds.add(discId);
    }
    return { ids, order, foundDiscIds };
  } catch {
    return { ids: new Set(), order: [], foundDiscIds: new Set() };
  }
}

