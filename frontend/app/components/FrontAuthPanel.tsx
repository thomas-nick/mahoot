"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readAuthUser, subscribeToAuthChanges } from "@/lib/auth";
import { rememberPostAuthRedirect } from "@/lib/post-auth-redirect";
import { getStrapiBrowserUrl } from "@/lib/strapi-server-url";
import { trackEvent } from "@/lib/analytics";

const OAUTH_PENDING_PROVIDER_KEY = "oauth_pending_provider";

type AuthUser = {
  username?: string;
  email?: string;
  confirmed?: boolean;
};

const GoogleMark = () => (
  <svg viewBox="0 0 18 18" aria-hidden className="h-5 w-5">
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
  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
    <rect width="24" height="24" rx="5" fill="#06C755" />
    <path
      fill="#FFFFFF"
      d="M12 5.5c-4.06 0-7.36 2.66-7.36 5.93 0 2.66 2.13 4.88 5.05 5.61.19.05.45.14.52.32.06.16.04.4.02.57l-.09.55c-.03.16-.13.62.55.34.68-.29 3.68-2.17 5.02-3.71.93-1.04 1.65-2.1 1.65-3.68 0-3.27-3.3-5.93-7.36-5.93z"
    />
  </svg>
);

export function FrontAuthPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setUser(readAuthUser<AuthUser>());
      setHydrated(true);
    };
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  const beginOAuth = (provider: "google" | "line") => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(OAUTH_PENDING_PROVIDER_KEY, provider);
    } catch {
      /* ignore */
    }
    rememberPostAuthRedirect("/account");
    trackEvent("front_auth_oauth_click", { provider });
    const strapiUrl = getStrapiBrowserUrl();
    const redirect = `${window.location.origin}/auth/callback?provider=${encodeURIComponent(provider)}`;
    window.location.href = `${strapiUrl}/api/connect/${provider}?redirect=${encodeURIComponent(redirect)}`;
  };

  if (!hydrated) {
    return (
      <div
        aria-hidden
        className="h-[372px] w-full rounded-3xl border border-white/30 bg-white/30 backdrop-blur-md"
      />
    );
  }

  if (user) {
    const label = user.username ?? user.email ?? "you";
    return (
      <div className="rounded-3xl border border-white/40 bg-white/85 p-6 shadow-xl ring-1 ring-slate-200/60 backdrop-blur-md">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
          You&rsquo;re signed in
        </p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-900">
          Welcome back, {label}.
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Pick up where you left off — list a disc, check offers, or browse what&rsquo;s new.
        </p>
        <div className="mt-5 grid gap-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Browse marketplace
          </Link>
          <Link
            href="/marketplace/new"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            + List a disc
          </Link>
          <Link
            href="/account?tab=inbox"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open inbox
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/40 bg-white/90 p-6 shadow-xl ring-1 ring-slate-200/60 backdrop-blur-md">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Get started
      </p>
      <h3 className="mt-1 text-2xl font-semibold text-slate-900">
        Join the community.
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        Track your bag, review discs, and buy &amp; sell with other players. Free, takes a few seconds.
      </p>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => beginOAuth("google")}
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <GoogleMark />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => beginOAuth("line")}
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <LineMark />
          Continue with LINE
        </button>
      </div>

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <Link
        href="/account"
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
      >
        Sign in with email
      </Link>

      <p className="mt-4 text-center text-[11px] text-slate-500">
        By continuing you agree to our community guidelines.
      </p>
    </div>
  );
}
