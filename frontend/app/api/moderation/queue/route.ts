import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";
import { getModeratorIdentity } from "@/lib/moderation";

const STRAPI_URL = getStrapiServerUrl();

const readJwt = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
};

type SubmittedBy = { id?: number; username?: string | null; email?: string | null } | null;

type RawSub = {
  id?: number;
  documentId?: string;
  moderation?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  discName?: string | null;
  courseName?: string | null;
  brand?: string | null;
  city?: string | null;
  state?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  description?: string | null;
  submittedBy?: SubmittedBy;
};

type Item = {
  kind: "disc" | "course";
  id: string;
  name: string;
  meta: string | null;
  moderation: string;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string | null;
  submittedBy: { id: number | null; label: string };
};

const fetchPending = async (jwt: string, endpoint: "disc-submissions" | "course-submissions") => {
  const params = new URLSearchParams({
    "filters[moderation][$ne]": "approved",
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "100",
    "populate[submittedBy][fields][0]": "username",
    "populate[submittedBy][fields][1]": "email",
    publicationState: "preview",
  });
  const response = await fetch(`${STRAPI_URL}/api/${endpoint}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${endpoint} fetch failed (${response.status}): ${detail.slice(0, 160)}`);
  }
  return ((await response.json()) as { data?: RawSub[] }).data ?? [];
};

const toItem = (raw: RawSub, kind: "disc" | "course"): Item | null => {
  const id = (raw.documentId ?? "").trim() || (raw.id ? String(raw.id) : "");
  if (!id) return null;
  const submittedBy = raw.submittedBy ?? null;
  return {
    kind,
    id,
    name: kind === "disc" ? raw.discName ?? "(Untitled disc)" : raw.courseName ?? "(Untitled course)",
    meta:
      kind === "disc"
        ? raw.brand || null
        : [raw.city, raw.state].filter(Boolean).join(", ") || null,
    moderation: raw.moderation ?? "pending",
    imageUrl: raw.imageUrl ?? null,
    notes:
      kind === "disc"
        ? [raw.description, raw.notes].filter((s) => Boolean(s && String(s).trim())).join("\n\n---\n\n") ||
          null
        : raw.notes ?? raw.description ?? null,
    createdAt: raw.createdAt ?? null,
    submittedBy: {
      id: submittedBy?.id ?? null,
      label: submittedBy?.username || submittedBy?.email || "Anonymous",
    },
  };
};

export async function GET(request: Request) {
  const jwt = readJwt(request);
  const me = await getModeratorIdentity(jwt);
  if (!me) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }
  if (!me.isModerator) {
    return NextResponse.json(
      { error: `Your role "${me.roleName ?? "Authenticated"}" cannot moderate submissions.` },
      { status: 403 },
    );
  }

  try {
    const [discSubs, courseSubs] = await Promise.all([
      fetchPending(jwt, "disc-submissions"),
      fetchPending(jwt, "course-submissions"),
    ]);
    const items = [
      ...discSubs.map((row) => toItem(row, "disc")),
      ...courseSubs.map((row) => toItem(row, "course")),
    ]
      .filter((row): row is Item => Boolean(row))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return NextResponse.json({ items, moderator: me });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load queue." },
      { status: 502 },
    );
  }
}
