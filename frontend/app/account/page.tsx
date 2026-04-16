"use client";

import { useEffect, useState } from "react";
import {
  AUTH_TOKEN_KEY,
  clearAuthSession,
  readAuthToken,
  readAuthUser,
  writeAuthSession,
} from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  clearPostAuthRedirect,
  consumePostAuthRedirect,
  getSafePostAuthPath,
  rememberPostAuthRedirect,
} from "@/lib/post-auth-redirect";
import { getStrapiBrowserUrl } from "@/lib/strapi-server-url";

type AuthUser = {
  id: number;
  username?: string;
  email?: string;
  confirmed?: boolean;
};

type Profile = {
  id?: number;
  documentId?: string;
  displayName?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type AuthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type SubmissionRow = {
  kind: "course" | "disc";
  id: string;
  name: string;
  moderation: string;
  updatedAt: string | null;
};

export default function AccountPage() {
  const [state, setState] = useState<AuthState>({ kind: "idle" });
  const [refresh, setRefresh] = useState(0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const isAuthed = Boolean(user);

  const strapiUrl = getStrapiBrowserUrl();

  const beginOAuth = (provider: "google" | "facebook") => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const next = getSafePostAuthPath(params.get("next"));
    if (next) {
      rememberPostAuthRedirect(next);
    }
    try {
      sessionStorage.setItem("oauth_pending_provider", provider);
    } catch {
      /* ignore */
    }
    // Must match the tab origin or sessionStorage from this click won't be visible on /auth/callback
    // (e.g. NEXT_PUBLIC_APP_URL=localhost while you browse 127.0.0.1).
    // Omit ?provider= here: Strapi may append OAuth params with `?`, which breaks if the URL already has a query.
    // Provider is restored from sessionStorage on /auth/callback (see oauth_pending_provider).
    const redirect = `${window.location.origin}/auth/callback`;
    const connectUrl = `${strapiUrl}/api/connect/${provider}?redirect=${encodeURIComponent(redirect)}`;
    window.location.href = connectUrl;
  };

  useEffect(() => {
    setUser(readAuthUser<AuthUser>());
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const next = getSafePostAuthPath(params.get("next"));
    if (next) {
      rememberPostAuthRedirect(next);
    } else {
      clearPostAuthRedirect();
    }
  }, []);

  useEffect(() => {
    const loadSubmissions = async () => {
      const token = readAuthToken();
      if (!token) {
        setSubmissions([]);
        return;
      }
      setSubmissionsLoading(true);
      try {
        const response = await fetch("/api/my-submissions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        const payload = (await response.json()) as { submissions?: SubmissionRow[] };
        if (response.ok) {
          setSubmissions(payload.submissions ?? []);
        }
      } catch {
        setSubmissions([]);
      } finally {
        setSubmissionsLoading(false);
      }
    };
    void loadSubmissions();
  }, [refresh]);

  useEffect(() => {
    const loadProfile = async () => {
      const token = readAuthToken();
      if (!token) {
        setProfile(null);
        return;
      }
      try {
        const response = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = (await response.json()) as {
          user?: AuthUser;
          profile?: Profile;
          error?: string;
        };
        if (response.ok) {
          if (payload.user) {
            setUser(payload.user);
            writeAuthSession(token, payload.user);
          }
          setProfile(payload.profile ?? null);
        }
      } catch {
        // no-op, account page can still render with cached session
      }
    };
    void loadProfile();
  }, [refresh]);

  const onRegister = async (event: React.FormEvent<HTMLFormElement>) => {
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
      const afterAuth = consumePostAuthRedirect();
      if (afterAuth) {
        window.location.href = afterAuth;
        return;
      }
      setRefresh((value) => value + 1);
      setState({ kind: "success", message: "Account created and logged in." });
      formElement.reset();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
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
      const afterAuth = consumePostAuthRedirect();
      if (afterAuth) {
        window.location.href = afterAuth;
        return;
      }
      setRefresh((value) => value + 1);
      setState({ kind: "success", message: "Logged in successfully." });
      formElement.reset();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const onLogout = () => {
    clearAuthSession();
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setProfile(null);
    setRefresh((value) => value + 1);
    setState({ kind: "success", message: "Logged out." });
  };

  const onSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ kind: "loading" });
    const token = readAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Please log in first." });
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: String(form.get("displayName") ?? ""),
          bio: String(form.get("bio") ?? ""),
          city: String(form.get("city") ?? ""),
          state: String(form.get("state") ?? ""),
          country: String(form.get("country") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string; profile?: Profile };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save profile.");
      }
      setProfile(payload.profile ?? profile);
      setState({ kind: "success", message: "Profile saved." });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const onResendVerification = async () => {
    const token = readAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Please log in first." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not resend email.");
      }
      setState({
        kind: "success",
        message: payload.message ?? "Verification email sent.",
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Account</h1>
        <p className="text-sm text-slate-600">Create an account or log in to submit one rating per course.</p>
      </header>

      {isAuthed ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-700">
              Logged in as <span className="font-medium">{user?.username ?? user?.email ?? "User"}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Email verification:{" "}
              {user?.confirmed ? (
                <span className="font-medium text-emerald-700">Verified</span>
              ) : (
                <span className="font-medium text-amber-700">Not verified</span>
              )}
            </p>
            {!user?.confirmed && (
              <button
                type="button"
                onClick={onResendVerification}
                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800"
              >
                Resend verification email
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 ml-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Log out
            </button>
          </section>

          <form onSubmit={onSaveProfile} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <input
              name="displayName"
              defaultValue={profile?.displayName ?? ""}
              placeholder="Display name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <textarea
              name="bio"
              rows={3}
              defaultValue={profile?.bio ?? ""}
              placeholder="Short bio"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                name="city"
                defaultValue={profile?.city ?? ""}
                placeholder="City"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <input
                name="state"
                defaultValue={profile?.state ?? ""}
                placeholder="State / Province"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <input
                name="country"
                defaultValue={profile?.country ?? ""}
                placeholder="Country"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={state.kind === "loading"}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Save profile
            </button>
          </form>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">My submissions</h2>
            {submissionsLoading ? (
              <p className="text-sm text-slate-500">Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-slate-500">No submissions yet.</p>
            ) : (
              <ul className="space-y-2">
                {submissions.slice(0, 10).map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        [{item.kind}] {item.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {item.moderation}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Last updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={onRegister} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Create account</h2>
            <input
              name="username"
              required
              placeholder="Username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Password (8+ chars)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={state.kind === "loading"}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Create account
            </button>
          </form>

          <form onSubmit={onLogin} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Log in</h2>
            <input
              name="identifier"
              required
              placeholder="Email or username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <input
              name="password"
              type="password"
              required
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={state.kind === "loading"}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Log in
            </button>
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Or continue with</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => beginOAuth("google")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => beginOAuth("facebook")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                >
                  Facebook
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {state.kind === "success" && <p className="text-sm text-emerald-700">{state.message}</p>}
      {state.kind === "error" && <p className="text-sm text-rose-700">{state.message}</p>}
    </div>
  );
}
