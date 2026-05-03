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

const countJson = async (url: string, jwt: string): Promise<number> => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return 0;
  const json = (await response.json()) as {
    meta?: { pagination?: { total?: number } };
    data?: unknown[];
  };
  const total = json.meta?.pagination?.total;
  if (typeof total === "number") return total;
  return Array.isArray(json.data) ? json.data.length : 0;
};

/**
 * GET /api/notifications — compact counts for header + account tab badges.
 */
export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const me = await getMe(jwt);
  if (!me?.id) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const id = String(me.id);

  const unreadParams = new URLSearchParams({
    "filters[recipient][id][$eq]": id,
    "filters[readAt][$null]": "true",
    "pagination[pageSize]": "200",
  });
  const unreadMessages = await countJson(
    `${STRAPI_URL}/api/market-messages?${unreadParams.toString()}`,
    jwt,
  );

  // Offers waiting on the seller (you need to accept / decline / counter).
  const sellerPendingParams = new URLSearchParams({
    "filters[status][$eq]": "pending",
    "filters[listing][seller][id][$eq]": id,
    "pagination[pageSize]": "200",
  });
  const offersNeedingSellerResponse = await countJson(
    `${STRAPI_URL}/api/market-offers?${sellerPendingParams.toString()}`,
    jwt,
  );

  // Seller sent you a counter — you should revisit the listing / offers tab.
  const buyerCounteredParams = new URLSearchParams({
    "filters[status][$eq]": "countered",
    "filters[buyer][id][$eq]": id,
    "pagination[pageSize]": "200",
  });
  const offersCounteredToYou = await countJson(
    `${STRAPI_URL}/api/market-offers?${buyerCounteredParams.toString()}`,
    jwt,
  );

  const offersAttention = offersNeedingSellerResponse + offersCounteredToYou;

  return NextResponse.json({
    unreadMessages,
    offersNeedingSellerResponse,
    offersCounteredToYou,
    offersAttention,
    /** Sum useful for a single red dot in the header. */
    totalAttention: unreadMessages + offersAttention,
  });
}
