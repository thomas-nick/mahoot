import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();
const STRAPI_TOKEN = (process.env.STRAPI_API_TOKEN ?? "").trim();

export type PublicStrapiUser = {
  id: number;
  documentId?: string;
  username?: string | null;
  email?: string | null;
  confirmed?: boolean | null;
  createdAt?: string | null;
};

export type PublicProfileRecord = {
  id?: number;
  documentId?: string;
  displayName?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  pdgaNumber?: number | null;
  socialInstagram?: string | null;
  socialTwitter?: string | null;
  socialYoutube?: string | null;
  socialTiktok?: string | null;
  socialFacebook?: string | null;
  socialUdisc?: string | null;
  socialLine?: string | null;
};

const authHeaders = (): HeadersInit => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  return headers;
};

/** Strapi v4/v5 REST may return `{ data: [...] }`, a bare array, or legacy `{ id, attributes }` rows. */
function unwrapEntry<T extends Record<string, unknown>>(raw: unknown): (T & { id?: number; documentId?: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    "attributes" in o &&
    o.attributes &&
    typeof o.attributes === "object" &&
    !Array.isArray(o.attributes)
  ) {
    const attrs = o.attributes as Record<string, unknown>;
    return {
      id: typeof o.id === "number" ? o.id : Number(o.id),
      documentId: typeof o.documentId === "string" ? o.documentId : undefined,
      ...attrs,
    } as T & { id?: number; documentId?: string };
  }
  return o as T & { id?: number; documentId?: string };
}

/** Populated relations often arrive as `{ data: row }` or `{ data: [row] }`. */
function peelRelation<T extends Record<string, unknown>>(raw: unknown): (T & { id?: number; documentId?: string }) | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if ("data" in o && o.data != null) {
    const inner = o.data;
    if (Array.isArray(inner)) return unwrapEntry<T>(inner[0]);
    return unwrapEntry<T>(inner);
  }
  return unwrapEntry<T>(o);
}

function parseCollection<T extends Record<string, unknown>>(json: unknown): T[] {
  if (Array.isArray(json)) {
    return json.map((row) => unwrapEntry<T>(row)).filter(Boolean) as T[];
  }
  if (json && typeof json === "object" && Array.isArray((json as { data?: unknown }).data)) {
    return ((json as { data: unknown[] }).data).map((row) => unwrapEntry<T>(row)).filter(Boolean) as T[];
  }
  return [];
}

function normalizeUsernameParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

/** Strapi custom route: uses Document Service so public profiles resolve even when REST user filters fail. */
async function fetchViaLookupPublicEndpoint(decoded: string): Promise<{
  user: PublicStrapiUser;
  profile: PublicProfileRecord | null;
} | null> {
  const params = new URLSearchParams({ username: decoded });
  try {
    const response = await fetch(`${STRAPI_URL}/api/profiles/resolve-public?${params.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const json: unknown = await response.json();
    if (!json || typeof json !== "object") return null;
    const data = (json as { data?: unknown }).data;
    if (!data || typeof data !== "object") return null;
    const bundle = data as { user?: PublicStrapiUser; profile?: PublicProfileRecord | null };
    if (!bundle.user?.id) return null;
    return { user: bundle.user, profile: bundle.profile ?? null };
  } catch {
    return null;
  }
}

function profileRowWithoutUser(row: Record<string, unknown>): PublicProfileRecord {
  const { user: _u, ...rest } = row;
  return rest as PublicProfileRecord;
}

async function fetchUserById(id: number): Promise<PublicStrapiUser | null> {
  if (!Number.isFinite(id)) return null;
  try {
    const response = await fetch(`${STRAPI_URL}/api/users/${encodeURIComponent(String(id))}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    if (json && typeof json === "object" && "data" in json) {
      return peelRelation<PublicStrapiUser>((json as { data: unknown }).data);
    }
    return unwrapEntry<PublicStrapiUser>(json);
  } catch {
    return null;
  }
}

async function resolveUserFromProfileRelation(userRaw: unknown): Promise<PublicStrapiUser | null> {
  const peeled = peelRelation<PublicStrapiUser>(userRaw);
  if (peeled?.id && (peeled.username ?? "").trim()) return peeled;
  if (peeled?.id) {
    const full = await fetchUserById(peeled.id);
    if (full) return full;
  }
  if (typeof userRaw === "number" && Number.isFinite(userRaw)) {
    return fetchUserById(userRaw);
  }
  if (userRaw && typeof userRaw === "object") {
    const o = userRaw as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : Number(o.id);
    if (Number.isFinite(id)) return fetchUserById(id);
  }
  return null;
}

/**
 * When GET /api/users?filters[username]=… is blocked or empty (common with users-permissions),
 * find the member via their profile row: same filter on the linked user, with populate.
 */
async function fetchProfileAndUserByLinkedUsername(decoded: string): Promise<{
  user: PublicStrapiUser;
  profile: PublicProfileRecord;
} | null> {
  const lower = decoded.toLowerCase();
  const variants = lower !== decoded ? [decoded, lower] : [decoded];

  const paramSets: Record<string, string>[] = [];
  for (const v of variants) {
    paramSets.push({
      "filters[user][username][$eqi]": v,
      "pagination[pageSize]": "1",
      "populate[user]": "true",
    });
    paramSets.push({
      "filters[user][username][$eq]": v,
      "pagination[pageSize]": "1",
      "populate[user]": "true",
    });
  }

  for (const rec of paramSets) {
    const params = new URLSearchParams(rec);
    try {
      const response = await fetch(`${STRAPI_URL}/api/profiles?${params.toString()}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      type Row = PublicProfileRecord & { user?: unknown };
      const list = parseCollection<Row>(json);
      const row = list[0];
      if (!row) continue;

      const user = await resolveUserFromProfileRelation(row.user);
      if (!user?.id) continue;

      return { user, profile: profileRowWithoutUser(row as Record<string, unknown>) };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Resolve a users-permissions row by login username. Tries case-insensitive match first
 * (`$eqi`), then exact match, then lowercase — public profile URLs often differ by case.
 */
export async function fetchUserByUsername(rawUsername: string): Promise<PublicStrapiUser | null> {
  const decoded = normalizeUsernameParam(rawUsername);
  if (!decoded) return null;

  const attempts: URLSearchParams[] = [
    new URLSearchParams({
      "filters[username][$eqi]": decoded,
      "pagination[pageSize]": "1",
    }),
    new URLSearchParams({
      "filters[username][$eq]": decoded,
      "pagination[pageSize]": "1",
    }),
  ];
  const lower = decoded.toLowerCase();
  if (lower !== decoded) {
    attempts.push(
      new URLSearchParams({
        "filters[username][$eqi]": lower,
        "pagination[pageSize]": "1",
      }),
    );
  }

  for (const params of attempts) {
    try {
      const response = await fetch(`${STRAPI_URL}/api/users?${params.toString()}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      const list = parseCollection<PublicStrapiUser>(json);
      const user = list[0];
      if (user?.id) return user;
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchProfileForUserId(userId: number): Promise<PublicProfileRecord | null> {
  const params = new URLSearchParams({
    "filters[user][id][$eq]": String(userId),
    "pagination[pageSize]": "1",
  });
  try {
    const response = await fetch(`${STRAPI_URL}/api/profiles?${params.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    const list = parseCollection<PublicProfileRecord>(json);
    return list[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve Strapi user + optional profile for `/u/[username]`.
 * Tries `GET /api/profiles/resolve-public` first (Document Service; avoids REST/sanitization gaps),
 * then falls back to `/api/users` and profile list filters.
 */
export async function resolvePublicUserAndProfile(rawUsername: string): Promise<{
  user: PublicStrapiUser;
  profile: PublicProfileRecord | null;
} | null> {
  const decoded = normalizeUsernameParam(rawUsername);
  if (!decoded) return null;

  const viaLookup = await fetchViaLookupPublicEndpoint(decoded);
  if (viaLookup) return viaLookup;

  const directUser = await fetchUserByUsername(decoded);
  if (directUser?.id) {
    const profile = await fetchProfileForUserId(directUser.id);
    return { user: directUser, profile };
  }

  const viaProfile = await fetchProfileAndUserByLinkedUsername(decoded);
  if (viaProfile) return { user: viaProfile.user, profile: viaProfile.profile };

  return null;
}
