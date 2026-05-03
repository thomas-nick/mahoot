import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

const readJwt = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const getMe = async (jwt: string) => {
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const raw = (await response.json()) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const payload =
    o.data && typeof o.data === "object" && !Array.isArray(o.data) ? o.data : o;
  return payload as { id?: number; documentId?: string };
};

const findExistingProfile = async (
  jwt: string,
  userId: number,
  userDocumentId?: string,
) => {
  const headers = { Authorization: `Bearer ${jwt}` } as const;
  const firstRow = async (response: Response) => {
    if (!response.ok) return null;
    const json = (await response.json()) as {
      data?: Array<{ id?: number; documentId?: string }>;
    };
    return json.data?.[0] ?? null;
  };

  if (userDocumentId) {
    const byDoc = await fetch(
      `${STRAPI_URL}/api/profiles?filters[user][documentId][$eq]=${encodeURIComponent(userDocumentId)}&pagination[pageSize]=1`,
      { headers, cache: "no-store" },
    );
    const found = await firstRow(byDoc);
    if (found) return found;
  }

  const byId = await fetch(
    `${STRAPI_URL}/api/profiles?filters[user][id][$eq]=${userId}&pagination[pageSize]=1`,
    { headers, cache: "no-store" },
  );
  return firstRow(byId);
};

const normalizeVenmo = (raw: string) => raw.trim().replace(/^@+/, "");
const normalizeStripeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
};
const normalizeAddress = (raw: string) => raw.trim().replace(/\s+/g, "");

type PaymentBody = {
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
};

/**
 * Update only the seller's payment-handle fields. Used by the listing form
 * (which only knows about fiat) and the account profile form. Only keys
 * that are explicitly present on the request body are written, so partial
 * updates from one form never clobber fields managed by another.
 */
export async function PUT(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }
  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const body = (await request.json()) as PaymentBody;

  const data: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(body, "paypalHandle")) {
    data.paypalHandle = (body.paypalHandle ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "venmoHandle")) {
    data.venmoHandle = normalizeVenmo(body.venmoHandle ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "stripePaymentLinkUrl")) {
    data.stripePaymentLinkUrl = normalizeStripeUrl(body.stripePaymentLinkUrl ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "acceptsCashOnPickup")) {
    data.acceptsCashOnPickup = Boolean(body.acceptsCashOnPickup);
  }
  if (Object.prototype.hasOwnProperty.call(body, "ethAddress")) {
    data.ethAddress = normalizeAddress(body.ethAddress ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "solAddress")) {
    data.solAddress = normalizeAddress(body.solAddress ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "dotAddress")) {
    data.dotAddress = normalizeAddress(body.dotAddress ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "ksmAddress")) {
    data.ksmAddress = normalizeAddress(body.ksmAddress ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "btcAddress")) {
    data.btcAddress = normalizeAddress(body.btcAddress ?? "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "cryptoNotes")) {
    data.cryptoNotes = (body.cryptoNotes ?? "").trim().slice(0, 280) || null;
  }

  const existing = await findExistingProfile(jwt, me.id, me.documentId);
  const profileId = existing?.documentId ?? existing?.id;

  /** Profile `user` is set in Strapi's profile controller on create (not allowed in REST body). */

  const response = await fetch(
    profileId
      ? `${STRAPI_URL}/api/profiles/${encodeURIComponent(String(profileId))}`
      : `${STRAPI_URL}/api/profiles`,
    {
      method: profileId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Payment methods save failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const saved = await response.json();
  return NextResponse.json({ ok: true, profile: saved?.data ?? null });
}
