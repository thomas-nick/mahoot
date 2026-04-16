import { NextResponse } from "next/server";
import { normalizeOAuthProvider, repairOAuthSearchString } from "@/lib/oauth-callback-query";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();
const ALLOWED_PROVIDERS = new Set(["google", "facebook"]);

const STRAPI_REDIRECT_HINT =
  "Strapi appended a second ? to your callback URL. In Strapi → Google provider, set the front-end redirect to " +
  "http://localhost:3000/auth/callback with no query string (provider is remembered in the browser). " +
  "Then Strapi should append access_token correctly.";

export async function GET(request: Request) {
  const url = new URL(request.url);
  url.search = repairOAuthSearchString(url.search);
  const { searchParams } = url;
  const provider = normalizeOAuthProvider(searchParams.get("provider") ?? "");
  const accessTokenParam = (searchParams.get("access_token") ?? "").trim();
  const idTokenParam = (searchParams.get("id_token") ?? "").trim();
  const accessToken = accessTokenParam || idTokenParam;
  const usedGoogleIdTokenOnly = provider === "google" && Boolean(idTokenParam) && !accessTokenParam;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unsupported OAuth provider." }, { status: 400 });
  }
  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token from provider callback." }, { status: 400 });
  }

  const callbackUrl = `${STRAPI_URL}/api/auth/${provider}/callback?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(callbackUrl, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  let payload = {} as { jwt?: string; user?: unknown; error?: { message?: string } };
  try {
    payload = text ? (JSON.parse(text) as typeof payload) : {};
  } catch {
    return NextResponse.json(
      { error: `OAuth exchange failed (${response.status}).` },
      { status: response.ok ? 502 : response.status }
    );
  }

  if (!response.ok || !payload.jwt || !payload.user) {
    const baseMsg = payload.error?.message ?? `OAuth exchange failed (${response.status}).`;
    const hint = usedGoogleIdTokenOnly ? ` ${STRAPI_REDIRECT_HINT}` : "";
    return NextResponse.json(
      { error: `${baseMsg}${hint}`.trim() },
      { status: response.ok ? 502 : response.status }
    );
  }

  return NextResponse.json({ jwt: payload.jwt, user: payload.user });
}
