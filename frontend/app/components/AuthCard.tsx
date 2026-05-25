"use client";

import { useEffect, useState } from "react";
import { writeAuthSession } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  consumePostAuthRedirect,
  getSafePostAuthPath,
  rememberPostAuthRedirect,
} from "@/lib/post-auth-redirect";
import { getStrapiBrowserUrl } from "@/lib/strapi-server-url";
import { Button, Card, Field, Input, Notice } from "@/app/components/ui";

const OAUTH_PENDING_PROVIDER_KEY = "oauth_pending_provider";

type AuthUser = {
  id: number;
  username?: string;
  email?: string;
  confirmed?: boolean;
};

type FormState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type Mode = "signin" | "signup";

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

export function AuthCard() {
  const [mode, setMode] = useState<Mode>("signin");
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const strapiUrl = getStrapiBrowserUrl();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const next = getSafePostAuthPath(params.get("next"));
    if (next) {
      rememberPostAuthRedirect(next);
    }
  }, []);

  const beginOAuth = (provider: "google" | "line") => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(OAUTH_PENDING_PROVIDER_KEY, provider);
    } catch {
      /* ignore */
    }
    const redirect = `${window.location.origin}/auth/callback?provider=${encodeURIComponent(provider)}`;
    window.location.href = `${strapiUrl}/api/connect/${provider}?redirect=${encodeURIComponent(redirect)}`;
  };

  const onSignin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ kind: "loading" });
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`${strapiUrl}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: String(form.get("identifier") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });
      const data = (await response.json()) as {
        jwt?: string;
        user?: AuthUser;
        error?: { message?: string };
      };
      if (!response.ok || !data.jwt || !data.user) {
        throw new Error(data.error?.message ?? "Could not log in.");
      }
      writeAuthSession(data.jwt, data.user);
      trackEvent("auth_local_login_success");
      const next = consumePostAuthRedirect();
      if (next) {
        window.location.href = next;
        return;
      }
      setState({ kind: "success", message: "Logged in successfully." });
      formElement.reset();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const onSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ kind: "loading" });
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`${strapiUrl}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });
      const data = (await response.json()) as {
        jwt?: string;
        user?: AuthUser;
        error?: { message?: string };
      };
      if (!response.ok || !data.jwt || !data.user) {
        throw new Error(data.error?.message ?? "Could not create account.");
      }
      writeAuthSession(data.jwt, data.user);
      trackEvent("auth_local_register_success");
      const next = consumePostAuthRedirect();
      if (next) {
        window.location.href = next;
        return;
      }
      setState({ kind: "success", message: "Account created and logged in." });
      formElement.reset();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const isLoading = state.kind === "loading";

  return (
    <Card className="mx-auto w-full max-w-md space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-sm text-slate-600">
          {mode === "signin"
            ? "Sign in to add reviews, list discs, and submit courses."
            : "Join in seconds — contribute photos, reviews, and listings."}
        </p>
      </div>

      <div className="space-y-2">
        <Button variant="secondary" fullWidth onClick={() => beginOAuth("google")} leadingIcon={<GoogleMark />}>
          Continue with Google
        </Button>
        <Button variant="secondary" fullWidth onClick={() => beginOAuth("line")} leadingIcon={<LineMark />}>
          Continue with LINE
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          onClick={() => setMode("signin")}
          className={`rounded-md px-3 py-1.5 transition ${
            mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => setMode("signup")}
          className={`rounded-md px-3 py-1.5 transition ${
            mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Create account
        </button>
      </div>

      {mode === "signin" ? (
        <form onSubmit={onSignin} className="space-y-3">
          <Field label="Email or username">
            <Input name="identifier" required autoComplete="username" placeholder="you@example.com" />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
            />
          </Field>
          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSignup} className="space-y-3">
          <Field label="Username">
            <Input name="username" required autoComplete="username" placeholder="discgolfer" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Choose a password"
            />
          </Field>
          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      )}

      {state.kind === "error" ? <Notice variant="error">{state.message}</Notice> : null}
      {state.kind === "success" ? <Notice variant="success">{state.message}</Notice> : null}
    </Card>
  );
}
