import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

const readJwt = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return "";
  }
  return authHeader.slice("Bearer ".length).trim();
};

const getMe = async (jwt: string) => {
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const raw = (await response.json()) as unknown;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const payload =
    o.data && typeof o.data === "object" && !Array.isArray(o.data)
      ? o.data
      : o;
  return payload as {
    id?: number;
    documentId?: string;
    username?: string;
    email?: string;
    confirmed?: boolean;
  };
};

const findExistingProfile = async (
  jwt: string,
  userId: number,
  userDocumentId?: string
) => {
  const headers = { Authorization: `Bearer ${jwt}` } as const;
  const firstRow = async (response: Response) => {
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      data?: Array<{ id?: number; documentId?: string; [key: string]: unknown }>;
    };
    return json.data?.[0] ?? null;
  };

  if (userDocumentId) {
    const byDoc = await fetch(
      `${STRAPI_URL}/api/profiles?filters[user][documentId][$eq]=${encodeURIComponent(userDocumentId)}&pagination[pageSize]=1`,
      { headers, cache: "no-store" }
    );
    const found = await firstRow(byDoc);
    if (found) return found;
  }

  const byId = await fetch(
    `${STRAPI_URL}/api/profiles?filters[user][id][$eq]=${userId}&pagination[pageSize]=1`,
    { headers, cache: "no-store" }
  );
  return firstRow(byId);
};

export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const profile = await findExistingProfile(jwt, me.id, me.documentId);
  return NextResponse.json({
    user: me,
    profile,
  });
}

export async function PUT(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const body = (await request.json()) as {
    displayName?: string;
    bio?: string;
    city?: string;
    state?: string;
    country?: string;
    avatarUrl?: string;
    paypalHandle?: string;
    venmoHandle?: string;
    stripePaymentLinkUrl?: string;
    acceptsCashOnPickup?: boolean;
    ethAddress?: string;
    solAddress?: string;
    dotAddress?: string;
    ksmAddress?: string;
    btcAddress?: string;
    cryptoNotes?: string;
    pdgaNumber?: number | string | null;
    socialInstagram?: string;
    socialTwitter?: string;
    socialYoutube?: string;
    socialTiktok?: string;
    socialFacebook?: string;
    socialUdisc?: string;
    socialLine?: string;
  };

  const normalizeVenmo = (raw: string) => raw.trim().replace(/^@+/, "");
  const normalizeStripeUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  };
  const normalizeAddress = (raw: string) => raw.trim().replace(/\s+/g, "");
  const clip = (raw: string, max: number) => {
    const t = raw.trim();
    if (!t) return null;
    return t.slice(0, max);
  };
  const parsePdgaNumber = (raw: unknown): number | null => {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 9999999) return null;
    return n;
  };

  const data: Record<string, unknown> = {
    displayName: (body.displayName ?? "").trim() || null,
    bio: (body.bio ?? "").trim() || null,
    city: (body.city ?? "").trim() || null,
    state: (body.state ?? "").trim() || null,
    country: (body.country ?? "").trim() || null,
    avatarUrl: (body.avatarUrl ?? "").trim() || null,
    paypalHandle: (body.paypalHandle ?? "").trim() || null,
    venmoHandle: normalizeVenmo(body.venmoHandle ?? "") || null,
    stripePaymentLinkUrl: normalizeStripeUrl(body.stripePaymentLinkUrl ?? "") || null,
    acceptsCashOnPickup: Boolean(body.acceptsCashOnPickup),
    ethAddress: normalizeAddress(body.ethAddress ?? "") || null,
    solAddress: normalizeAddress(body.solAddress ?? "") || null,
    dotAddress: normalizeAddress(body.dotAddress ?? "") || null,
    ksmAddress: normalizeAddress(body.ksmAddress ?? "") || null,
    btcAddress: normalizeAddress(body.btcAddress ?? "") || null,
    cryptoNotes: (body.cryptoNotes ?? "").trim().slice(0, 280) || null,
    pdgaNumber: parsePdgaNumber(body.pdgaNumber),
    socialInstagram: clip(body.socialInstagram ?? "", 220),
    socialTwitter: clip(body.socialTwitter ?? "", 220),
    socialYoutube: clip(body.socialYoutube ?? "", 500),
    socialTiktok: clip(body.socialTiktok ?? "", 220),
    socialFacebook: clip(body.socialFacebook ?? "", 500),
    socialUdisc: clip(body.socialUdisc ?? "", 500),
    socialLine: clip(body.socialLine ?? "", 500),
  };

  const existing = await findExistingProfile(jwt, me.id, me.documentId);
  const profileId = existing?.documentId ?? existing?.id;

  /** Profile `user` is set in Strapi's profile controller (not permitted in REST body). */
  const payload = data;

  const response = await fetch(
    profileId ? `${STRAPI_URL}/api/profiles/${encodeURIComponent(String(profileId))}` : `${STRAPI_URL}/api/profiles`,
    {
      method: profileId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: payload }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Profile save failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const saved = await response.json();
  return NextResponse.json({ ok: true, profile: saved?.data ?? null });
}
