"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { writeAuthSession } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  normalizeOAuthProvider,
  readGrantStyleOAuthError,
  repairOAuthSearchString,
  scrapeOAuthParamsFromHref,
} from "@/lib/oauth-callback-query";
import { consumePostAuthRedirect } from "@/lib/post-auth-redirect";
import { getStrapiBrowserUrl } from "@/lib/strapi-server-url";

type OAuthState =
  | { kind: "parsing" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string; hints?: string[] }
  | { kind: "success"; message: string };

type ParsedCallback = {
  provider: string;
  accessToken: string;
  idToken: string;
  providerError: string;
  providerErrorDescription: string;
};

const ALLOWED_PROVIDERS = new Set(["google", "line"]);

const OAUTH_PENDING_PROVIDER_KEY = "oauth_pending_provider";

const parseCallbackFromWindow = (): ParsedCallback => {
  const repaired = repairOAuthSearchString(window.location.search);
  const search = new URLSearchParams(repaired);
  let accessToken = (search.get("access_token") ?? "").trim();
  let idToken = (search.get("id_token") ?? "").trim();
  const grantSearchErr = readGrantStyleOAuthError(search);
  let providerError = grantSearchErr.error;
  let providerErrorDescription = grantSearchErr.error_description;
  let provider = normalizeOAuthProvider(search.get("provider") ?? "");

  const hashRaw = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : (window.location.hash ?? "");
  if (hashRaw) {
    const hashParams = new URLSearchParams(
      repairOAuthSearchString(hashRaw.startsWith("?") ? hashRaw : `?${hashRaw}`).replace(/^\?/, ""),
    );
    if (!accessToken) {
      accessToken = (hashParams.get("access_token") ?? "").trim();
    }
    if (!idToken) {
      idToken = (hashParams.get("id_token") ?? "").trim();
    }
    const grantHashErr = readGrantStyleOAuthError(hashParams);
    if (!providerError) {
      providerError = grantHashErr.error;
    }
    if (!providerErrorDescription) {
      providerErrorDescription = grantHashErr.error_description;
    }
    if (!provider) {
      provider = normalizeOAuthProvider(hashParams.get("provider") ?? "");
    }
  }

  const scraped = scrapeOAuthParamsFromHref(window.location.href);
  if (!accessToken) {
    accessToken = (scraped.access_token ?? "").trim();
  }
  if (!idToken) {
    idToken = (scraped.id_token ?? "").trim();
  }
  if (!providerError) {
    providerError = (scraped.error ?? "").trim();
  }
  if (!providerErrorDescription) {
    providerErrorDescription = (scraped.error_description ?? "").trim();
  }
  if (!provider) {
    provider = normalizeOAuthProvider(scraped.provider ?? "");
  }

  if (!accessToken && idToken) {
    accessToken = idToken;
  }

  if (!provider) {
    try {
      const stored = sessionStorage.getItem(OAUTH_PENDING_PROVIDER_KEY);
      if (stored) {
        provider = stored.trim().toLowerCase();
      }
    } catch {
      /* private mode / blocked storage */
    }
  }

  return {
    provider,
    accessToken,
    idToken,
    providerError,
    providerErrorDescription,
  };
};

const OAUTH_RELAY_PENDING_KEY = "__oauth_relay_pending";

export default function OAuthCallbackPage() {
  const [parsed, setParsed] = useState<ParsedCallback | null>(null);
  const [state, setState] = useState<OAuthState>({ kind: "parsing" });
  const exchangeStarted = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window === "undefined") {
        return;
      }

      /**
       * LINE / OAuth 2 code flow must hit Strapi's Grant route first:
       * `/api/connect/<provider>/callback?code=&state=`.
       * If the LINE Login channel (or Google console) mistakenly lists the SPA
       * `/auth/callback` URL, the browser only gets `code` — no tokens. Relay the
       * same query to Strapi so Grant can exchange the code and redirect back
       * here with `access_token` / `id_token`.
       */
      const scrapedPre = scrapeOAuthParamsFromHref(window.location.href);
      const searchParams = new URLSearchParams(repairOAuthSearchString(window.location.search));
      const authCode = (
        (searchParams.get("code") ?? "").trim() || (scrapedPre.code ?? "").trim()
      );
      const hasAccess = Boolean(
        ((searchParams.get("access_token") ?? "").trim() || (scrapedPre.access_token ?? "").trim()),
      );
      const hasId = Boolean(
        ((searchParams.get("id_token") ?? "").trim() || (scrapedPre.id_token ?? "").trim()),
      );
      const grantRelayErr = readGrantStyleOAuthError(searchParams);
      const oauthError = (
        (grantRelayErr.error || "").trim() || (scrapedPre.error ?? "").trim()
      );

      if (oauthError) {
        try {
          sessionStorage.removeItem(OAUTH_RELAY_PENDING_KEY);
        } catch {
          /* ignore */
        }
      }

      if (hasAccess || hasId) {
        try {
          sessionStorage.removeItem(OAUTH_RELAY_PENDING_KEY);
        } catch {
          /* ignore */
        }
      }

      let relayHashCode = "";
      let relaySuffix = repairOAuthSearchString(window.location.search);
      if (!authCode) {
        const hashRaw = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : "";
        if (hashRaw) {
          const normalizedHash = repairOAuthSearchString(hashRaw.startsWith("?") ? hashRaw : `?${hashRaw}`);
          const hashParams = new URLSearchParams(
            normalizedHash.replace(/^\?/, ""),
          );
          relayHashCode = (hashParams.get("code") ?? "").trim();
          if (relayHashCode) {
            relaySuffix = normalizedHash.startsWith("?") ? normalizedHash : `?${normalizedHash}`;
          }
        }
      }

      const codeToRelay = authCode || relayHashCode || (scrapedPre.code ?? "").trim();

      let relayDestSuffix = relaySuffix;
      if (codeToRelay && !relayDestSuffix.includes("code=")) {
        const sp = new URLSearchParams();
        sp.set("code", scrapedPre.code || codeToRelay);
        if ((scrapedPre.state ?? "").trim()) {
          sp.set("state", (scrapedPre.state ?? "").trim());
        }
        relayDestSuffix = `?${sp.toString()}`;
      }

      if (codeToRelay && !hasAccess && !hasId && !oauthError) {
        let relayProvider = normalizeOAuthProvider(
          ((searchParams.get("provider") ?? "").trim() || (scrapedPre.provider ?? "").trim()),
        );
        if (!relayProvider) {
          try {
            relayProvider = (sessionStorage.getItem(OAUTH_PENDING_PROVIDER_KEY) ?? "").trim().toLowerCase();
          } catch {
            /* ignore */
          }
        }
        if (ALLOWED_PROVIDERS.has(relayProvider)) {
          const strapiUrl = getStrapiBrowserUrl();
          try {
            const raw = sessionStorage.getItem(OAUTH_RELAY_PENDING_KEY);
            if (raw) {
              const pending = JSON.parse(raw) as { code: string; t: number };
              if (
                pending.code === codeToRelay &&
                Number.isFinite(pending.t) &&
                Date.now() - pending.t < 20_000
              ) {
                return;
              }
            }
            sessionStorage.setItem(
              OAUTH_RELAY_PENDING_KEY,
              JSON.stringify({ code: codeToRelay, t: Date.now() }),
            );
          } catch {
            /* ignore */
          }
          window.location.replace(`${strapiUrl}/api/connect/${relayProvider}/callback${relayDestSuffix}`);
          return;
        }
        setParsed({
          provider: relayProvider,
          accessToken: "",
          idToken: "",
          providerError: "oauth_relay",
          providerErrorDescription:
            "This page received an authorization code but could not tell which provider it was for. Close this tab and start sign-in again from Account.",
        });
        setState({ kind: "error", message: "Could not complete OAuth relay." });
        return;
      }

      setParsed(parseCallbackFromWindow());
      setState({ kind: "loading", message: "Finalizing login..." });
    });
  }, []);

  const validationError = useMemo(() => {
    if (!parsed) {
      return "";
    }
    if (parsed.providerError) {
      const err = parsed.providerError;
      const desc = parsed.providerErrorDescription;
      const msg =
        err && desc && err !== desc ? `${err} — ${desc}` : desc || err || "OAuth login failed.";
      const combined = `${err} ${desc}`.toLowerCase();
      if (combined.includes("invalid_grant") || combined.includes("malformed auth code")) {
        return `${msg} This usually means LINE rejected the code exchange: the code may already have been used (refresh/back, or the sign-in flow ran twice), or the redirect URL configured in LINE Developers does not exactly match the URL Strapi sends as redirect_uri (your Strapi callback should be …/api/connect/line/callback, with the same scheme and host as PUBLIC_URL).`;
      }
      return msg;
    }
    if (!ALLOWED_PROVIDERS.has(parsed.provider)) {
      return "Unknown OAuth provider callback.";
    }
    if (!parsed.accessToken) {
      const base = "Missing access token in callback. Please try again or use email login.";
      const lineHint =
        parsed.provider === "line"
          ? " In LINE Developers, set the Login channel Callback URL to your Strapi endpoint `…/api/connect/line/callback` (the app’s `/auth/callback` page only receives tokens after Strapi redirects there)."
          : "";
      return base + lineHint;
    }
    return "";
  }, [parsed]);

  const originHint = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const strapi = new URL(getStrapiBrowserUrl());
      const here = window.location.hostname;
      if (here && strapi.hostname && here !== strapi.hostname) {
        return `Your browser is on "${here}" but Strapi is on "${strapi.hostname}". Use the same hostname (both localhost or both 127.0.0.1) so the OAuth session cookie/storage carries through.`;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  useEffect(() => {
    if (!parsed || validationError || exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;

    const exchangeUrl = new URL("/api/auth/oauth/callback", window.location.origin);
    exchangeUrl.searchParams.set("provider", parsed.provider);
    exchangeUrl.searchParams.set("access_token", parsed.accessToken);
    if (parsed.idToken && parsed.idToken !== parsed.accessToken) {
      exchangeUrl.searchParams.set("id_token", parsed.idToken);
    }

    void fetch(exchangeUrl.toString(), { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { jwt?: string; user?: unknown; error?: string };
        if (!response.ok || !payload.jwt || !payload.user) {
          throw new Error(payload.error || "OAuth login failed.");
        }
        writeAuthSession(payload.jwt, payload.user);
        try {
          sessionStorage.removeItem(OAUTH_PENDING_PROVIDER_KEY);
          sessionStorage.removeItem(OAUTH_RELAY_PENDING_KEY);
        } catch {
          /* ignore */
        }
        trackEvent("oauth_login_success", { provider: parsed.provider });
        setState({
          kind: "success",
          message: "Login complete. Redirecting...",
        });
        window.setTimeout(() => {
          const next = consumePostAuthRedirect();
          window.location.href = next ?? "/account";
        }, 600);
      })
      .catch((error: unknown) => {
        exchangeStarted.current = false;
        try {
          sessionStorage.removeItem(OAUTH_PENDING_PROVIDER_KEY);
        } catch {
          /* ignore */
        }
        const message = error instanceof Error ? error.message : "OAuth login failed.";
        const hints: string[] = [];
        if (originHint) hints.push(originHint);
        if (parsed?.provider === "google" && /id_token|access_token/i.test(message)) {
          hints.push(
            "In Strapi → Settings → Providers → Google, set the front-end redirect to your /auth/callback URL with no query string, then save and retry.",
          );
        }

        if (/network|failed to fetch/i.test(message)) {
          hints.push(
            "The Next.js server could not reach Strapi. Confirm Strapi is running and STRAPI_URL / NEXT_PUBLIC_STRAPI_URL point at the same host.",
          );
        }
        setState({ kind: "error", message, hints });
      });
  }, [parsed, validationError, originHint]);

  useEffect(() => {
    if (!parsed || !validationError) {
      return;
    }
    try {
      sessionStorage.removeItem(OAUTH_PENDING_PROVIDER_KEY);
      sessionStorage.removeItem(OAUTH_RELAY_PENDING_KEY);
    } catch {
      /* ignore */
    }
  }, [parsed, validationError]);

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">OAuth login</h1>
      {state.kind === "parsing" && !validationError && <p className="text-sm text-slate-600">Reading sign-in response…</p>}
      {validationError && parsed && (
        <div className="space-y-2">
          <p className="text-sm text-rose-700">{validationError}</p>
          <Link href="/account" className="text-sm text-slate-700 underline hover:text-slate-900">
            Back to account
          </Link>
        </div>
      )}
      {state.kind === "loading" && !validationError && parsed && (
        <p className="text-sm text-slate-600">{state.message}</p>
      )}
      {state.kind === "success" && !validationError && parsed && (
        <p className="text-sm text-emerald-700">{state.message}</p>
      )}
      {state.kind === "error" && !validationError && parsed && (
        <div className="space-y-2">
          <p className="text-sm text-rose-700">{state.message}</p>
          {state.hints && state.hints.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
              {state.hints.map((hint, index) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          ) : null}
          <Link href="/account" className="text-sm text-slate-700 underline hover:text-slate-900">
            Back to account
          </Link>
        </div>
      )}
    </div>
  );
}
