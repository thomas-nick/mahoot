"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readAuthUser, subscribeToAuthChanges } from "@/lib/auth";
import { rememberPostAuthRedirect } from "@/lib/post-auth-redirect";
import { getStrapiBrowserUrl } from "@/lib/strapi-server-url";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "mahoot_dismiss_marketplace_signin";
const OAUTH_PENDING_PROVIDER_KEY = "oauth_pending_provider";

const GoogleMark = () => (
  <svg viewBox="0 0 18 18" aria-hidden className="h-4 w-4">
    <path
      fill="#EA4335"
      d="M9 3.48c1.69 0 2.84.73 3.5 1.34l2.55-2.49C13.46.92 11.43 0 9 0 5.48 0 2.43 2.02.96 4.96l2.97 2.3C4.66 5.05 6.66 3.48 9 3.48z"
    />
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.63-.06-1.25-.18-1.85H9v3.5h4.85a4.16 4.16 0 01-1.79 2.73l2.89 2.24C16.86 14.2 17.64 11.91 17.64 9.2z"
    />
    <path
      fill="#FBBC05"
      d="M3.93 10.74A5.43 5.43 0 013.62 9c0-.6.1-1.18.27-1.74L.96 4.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l2.97-2.3z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.89-2.24c-.8.54-1.84.86-3.07.86-2.34 0-4.34-1.57-5.07-3.78L.96 13.04C2.43 15.98 5.48 18 9 18z"
    />
  </svg>
);

const LineMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
    <rect width="24" height="24" rx="5" fill="#06C755" />
    <path
      fill="#FFFFFF"
      d="M12 5.5c-4.06 0-7.36 2.66-7.36 5.93 0 2.66 2.13 4.88 5.05 5.61.19.05.45.14.52.32.06.16.04.4.02.57l-.09.55c-.03.16-.13.62.55.34.68-.29 3.68-2.17 5.02-3.71.93-1.04 1.65-2.1 1.65-3.68 0-3.27-3.3-5.93-7.36-5.93z"
    />
  </svg>
);

export function MarketplaceSignInBanner() {
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSignedIn(Boolean(readAuthUser<{ username?: string }>()));
      setHydrated(true);
    };
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  if (!hydrated || signedIn || dismissed) return null;

  const onDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const beginOAuth = (provider: "google" | "line") => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(OAUTH_PENDING_PROVIDER_KEY, provider);
    } catch {
      /* ignore */
    }
    rememberPostAuthRedirect("/marketplace");
    trackEvent(
      provider === "google"
        ? "marketplace_signin_banner_google_click"
        : "marketplace_signin_banner_line_click",
    );
    const strapiUrl = getStrapiBrowserUrl();
    const redirect = `${window.location.origin}/auth/callback?provider=${encodeURIComponent(provider)}`;
    window.location.href = `${strapiUrl}/api/connect/${provider}?redirect=${encodeURIComponent(
      redirect,
    )}`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4 sm:p-5">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
      <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Browse mode
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">
            Sign in to message sellers, save listings, and make offers.
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => beginOAuth("google")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <GoogleMark />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => beginOAuth("line")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LineMark />
            Continue with LINE
          </button>
          <Link
            href="/account?next=/marketplace"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
