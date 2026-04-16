"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { writeAuthSession } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { normalizeOAuthProvider, repairOAuthSearchString } from "@/lib/oauth-callback-query";
import { consumePostAuthRedirect } from "@/lib/post-auth-redirect";

type OAuthState =
  | { kind: "parsing" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

type ParsedCallback = {
  provider: string;
  accessToken: string;
  providerError: string;
  providerErrorDescription: string;
};

const ALLOWED_PROVIDERS = new Set(["google", "facebook"]);

const OAUTH_PENDING_PROVIDER_KEY = "oauth_pending_provider";

const parseCallbackFromWindow = (): ParsedCallback => {
  const search = new URLSearchParams(repairOAuthSearchString(window.location.search));
  let accessToken = (search.get("access_token") ?? "").trim();
  let providerError = (search.get("error") ?? "").trim();
  let providerErrorDescription = (search.get("error_description") ?? "").trim();
  let provider = normalizeOAuthProvider(search.get("provider") ?? "");

  const hashRaw = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : (window.location.hash ?? "");
  if (hashRaw) {
    const hashParams = new URLSearchParams(
      repairOAuthSearchString(hashRaw.startsWith("?") ? hashRaw : `?${hashRaw}`).replace(/^\?/, "")
    );
    if (!accessToken) {
      accessToken = (hashParams.get("access_token") ?? "").trim();
    }
    if (!accessToken) {
      accessToken = (hashParams.get("id_token") ?? "").trim();
    }
    if (!providerError) {
      providerError = (hashParams.get("error") ?? "").trim();
    }
    if (!providerErrorDescription) {
      providerErrorDescription = (hashParams.get("error_description") ?? "").trim();
    }
    if (!provider) {
      provider = normalizeOAuthProvider(hashParams.get("provider") ?? "");
    }
  }

  if (!accessToken) {
    const idTok = (search.get("id_token") ?? "").trim();
    if (idTok) {
      accessToken = idTok;
    }
  }

  // Strapi/connect often returns only the registered redirect path (no ?provider=) with tokens in the hash.
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

  // Do not remove pending provider here: React Strict Mode runs this parse twice in dev;
  // clearing storage in parse would leave the second pass with no provider.

  return {
    provider,
    accessToken,
    providerError,
    providerErrorDescription,
  };
};

export default function OAuthCallbackPage() {
  const [parsed, setParsed] = useState<ParsedCallback | null>(null);
  const [state, setState] = useState<OAuthState>({ kind: "parsing" });
  const exchangeStarted = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      setParsed(parseCallbackFromWindow());
      setState({ kind: "loading", message: "Finalizing login..." });
    });
  }, []);

  const validationError = useMemo(() => {
    if (!parsed) {
      return "";
    }
    if (parsed.providerError) {
      return parsed.providerErrorDescription || parsed.providerError || "OAuth login failed.";
    }
    if (!ALLOWED_PROVIDERS.has(parsed.provider)) {
      return "Unknown OAuth provider callback.";
    }
    if (!parsed.accessToken) {
      return "Missing access token in callback. If you see this after Google, try again or use email login.";
    }
    return "";
  }, [parsed]);

  useEffect(() => {
    if (!parsed || validationError || exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;

    void fetch(
      `/api/auth/oauth/callback?provider=${encodeURIComponent(parsed.provider)}&access_token=${encodeURIComponent(parsed.accessToken)}`,
      {
        cache: "no-store",
      }
    )
      .then(async (response) => {
        const payload = (await response.json()) as { jwt?: string; user?: unknown; error?: string };
        if (!response.ok || !payload.jwt || !payload.user) {
          throw new Error(payload.error || "OAuth login failed.");
        }
        writeAuthSession(payload.jwt, payload.user);
        try {
          sessionStorage.removeItem(OAUTH_PENDING_PROVIDER_KEY);
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
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "OAuth login failed.",
        });
      });
  }, [parsed, validationError]);

  useEffect(() => {
    if (!parsed || !validationError) {
      return;
    }
    try {
      sessionStorage.removeItem(OAUTH_PENDING_PROVIDER_KEY);
    } catch {
      /* ignore */
    }
  }, [parsed, validationError]);

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">OAuth login</h1>
      {state.kind === "parsing" && <p className="text-sm text-slate-600">Reading sign-in response…</p>}
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
          <Link href="/account" className="text-sm text-slate-700 underline hover:text-slate-900">
            Back to account
          </Link>
        </div>
      )}
    </div>
  );
}
