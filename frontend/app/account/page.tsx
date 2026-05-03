"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearAuthSession,
  readAuthToken,
  readAuthUser,
  subscribeToAuthChanges,
  writeAuthSession,
} from "@/lib/auth";
import { subscribeToNotificationChanges } from "@/lib/notifications";
import {
  clearPostAuthRedirect,
  getSafePostAuthPath,
  rememberPostAuthRedirect,
} from "@/lib/post-auth-redirect";
import {
  hintBtcAddress,
  hintEthAddress,
  hintSolAddress,
  hintSs58Address,
} from "@/lib/crypto-address-hints";
import { AuthCard } from "@/app/components/AuthCard";
import { ImageUploadField } from "@/app/components/ImageUploadField";
import { Inbox } from "@/app/components/Inbox";
import { MyListings } from "@/app/components/MyListings";
import { OffersInbox } from "@/app/components/OffersInbox";
import { RateThreeWidget } from "@/app/components/RateThreeWidget";
import { SavedListings } from "@/app/components/SavedListings";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  PageHeader,
  Textarea,
} from "@/app/components/ui";

type AuthUser = {
  id: number;
  username?: string;
  email?: string;
  confirmed?: boolean;
  avatarUrl?: string;
};

type Profile = {
  id?: number;
  documentId?: string;
  displayName?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  paypalHandle?: string | null;
  venmoHandle?: string | null;
  stripePaymentLinkUrl?: string | null;
  acceptsCashOnPickup?: boolean | null;
  ethAddress?: string | null;
  solAddress?: string | null;
  dotAddress?: string | null;
  ksmAddress?: string | null;
  btcAddress?: string | null;
  cryptoNotes?: string | null;
};

type SubmissionRow = {
  kind: "course" | "disc";
  id: string;
  name: string;
  moderation: string;
  updatedAt: string | null;
};

type FormState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type TabId =
  | "overview"
  | "profile"
  | "submissions"
  | "listings"
  | "saved"
  | "inbox"
  | "offers";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "submissions", label: "Submissions" },
  { id: "listings", label: "Listings" },
  { id: "saved", label: "Saved" },
  { id: "inbox", label: "Inbox" },
  { id: "offers", label: "Offers" },
];

const moderationBadge = (status: string) => {
  if (status === "approved") return <Badge variant="success">approved</Badge>;
  if (status === "rejected") return <Badge variant="warn">rejected</Badge>;
  return <Badge>{status || "pending"}</Badge>;
};

function AccountInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams?.get("tab") ?? "overview") as TabId;
  const tab: TabId = TABS.some((entry) => entry.id === tabParam) ? tabParam : "overview";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [profileState, setProfileState] = useState<FormState>({ kind: "idle" });
  const [verifyState, setVerifyState] = useState<FormState>({ kind: "idle" });
  const [notify, setNotify] = useState({ unreadMessages: 0, offersAttention: 0 });
  const [cryptoHints, setCryptoHints] = useState<{
    eth: string | null;
    sol: string | null;
    dot: string | null;
    ksm: string | null;
    btc: string | null;
  }>({ eth: null, sol: null, dot: null, ksm: null, btc: null });
  const isAuthed = Boolean(user);

  useEffect(() => {
    const sync = () => setUser(readAuthUser<AuthUser>());
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const next = getSafePostAuthPath(params.get("next"));
    if (next) {
      rememberPostAuthRedirect(next);
    } else {
      clearPostAuthRedirect();
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      setSubmissions([]);
      setProfile(null);
      return;
    }
    const token = readAuthToken();
    if (!token) return;

    void (async () => {
      setSubmissionsLoading(true);
      try {
        const response = await fetch("/api/my-submissions", {
          headers: { Authorization: `Bearer ${token}` },
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
    })();

    void (async () => {
      try {
        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as {
          user?: AuthUser;
          profile?: Profile;
        };
        if (response.ok) {
          const merged = payload.user
            ? { ...payload.user, avatarUrl: payload.profile?.avatarUrl ?? undefined }
            : null;
          if (merged) {
            setUser(merged);
            writeAuthSession(token, merged);
          }
          setProfile(payload.profile ?? null);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [isAuthed]);

  useEffect(() => {
    if (!profile) {
      setCryptoHints({ eth: null, sol: null, dot: null, ksm: null, btc: null });
      return;
    }
    setCryptoHints({
      eth: hintEthAddress(profile.ethAddress ?? ""),
      sol: hintSolAddress(profile.solAddress ?? ""),
      dot: hintSs58Address(profile.dotAddress ?? "", "dot"),
      ksm: hintSs58Address(profile.ksmAddress ?? "", "ksm"),
      btc: hintBtcAddress(profile.btcAddress ?? ""),
    });
  }, [profile]);

  useEffect(() => {
    if (!isAuthed) {
      setNotify({ unreadMessages: 0, offersAttention: 0 });
      return;
    }
    const token = readAuthToken();
    if (!token) return;
    const load = async () => {
      try {
        const response = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          unreadMessages?: number;
          offersAttention?: number;
        };
        setNotify({
          unreadMessages: payload.unreadMessages ?? 0,
          offersAttention: payload.offersAttention ?? 0,
        });
      } catch {
        /* ignore */
      }
    };
    void load();
    const unsub = subscribeToNotificationChanges(load);
    return () => unsub();
  }, [isAuthed, tab]);

  const setTab = (next: TabId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const onLogout = () => {
    clearAuthSession();
    setProfileState({ kind: "idle" });
  };

  const onSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = readAuthToken();
    if (!token) {
      setProfileState({ kind: "error", message: "Please log in first." });
      return;
    }
    setProfileState({ kind: "loading" });
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
          avatarUrl: String(form.get("avatarUrl") ?? ""),
          paypalHandle: String(form.get("paypalHandle") ?? ""),
          venmoHandle: String(form.get("venmoHandle") ?? ""),
          stripePaymentLinkUrl: String(form.get("stripePaymentLinkUrl") ?? ""),
          acceptsCashOnPickup: form.get("acceptsCashOnPickup") === "on",
          ethAddress: String(form.get("ethAddress") ?? ""),
          solAddress: String(form.get("solAddress") ?? ""),
          dotAddress: String(form.get("dotAddress") ?? ""),
          ksmAddress: String(form.get("ksmAddress") ?? ""),
          btcAddress: String(form.get("btcAddress") ?? ""),
          cryptoNotes: String(form.get("cryptoNotes") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string; profile?: Profile };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save profile.");
      }
      const nextProfile = payload.profile ?? profile;
      setProfile(nextProfile);
      if (user) {
        const refreshed = { ...user, avatarUrl: nextProfile?.avatarUrl ?? undefined };
        setUser(refreshed);
        writeAuthSession(token, refreshed);
      }
      setProfileState({ kind: "success", message: "Profile saved." });
    } catch (error) {
      setProfileState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const onResendVerification = async () => {
    const token = readAuthToken();
    if (!token) return;
    setVerifyState({ kind: "loading" });
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not resend email.");
      }
      setVerifyState({ kind: "success", message: payload.message ?? "Verification email sent." });
    } catch (error) {
      setVerifyState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (!isAuthed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sign in to contribute"
          description="One account unlocks reviews, marketplace listings, and disc/course submissions."
        />
        <AuthCard />
      </div>
    );
  }

  const label = user?.username ?? user?.email ?? "Account";
  const verified = Boolean(user?.confirmed);
  const checklistDone = {
    verified,
    profile: Boolean(profile?.displayName),
    contributed: submissions.length > 0,
  };
  const completed = [checklistDone.verified, checklistDone.profile, checklistDone.contributed].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-6 py-7 text-white shadow-md sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar
            src={profile?.avatarUrl ?? user?.avatarUrl ?? null}
            label={label}
            size="xl"
            className="ring-2 ring-white/30"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-200/90">
              {verified ? "Verified account" : "Account · Email not verified"}
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">
              {profile?.displayName?.trim() || `Hello, ${label}`}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/75">
              Track contributions, manage your marketplace listings, and update your profile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.username ? (
              <button
                type="button"
                onClick={() => router.push(`/u/${encodeURIComponent(user.username!)}`)}
                className="inline-flex items-center rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                View public profile
              </button>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Log out
            </button>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/85 p-1 backdrop-blur-sm sm:mx-0"
      >
        {TABS.map((entry) => {
          const isActive = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(entry.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {entry.label}
              {entry.id === "inbox" && notify.unreadMessages > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-sky-500 text-white"
                  }`}
                >
                  {notify.unreadMessages > 99 ? "99+" : notify.unreadMessages}
                </span>
              ) : null}
              {entry.id === "offers" && notify.offersAttention > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"
                  }`}
                >
                  {notify.offersAttention > 99 ? "99+" : notify.offersAttention}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Get started"
              description={`${completed} of 3 complete — small wins help the catalog grow.`}
            />
            <ul className="space-y-2">
              <ChecklistItem
                done={checklistDone.verified}
                title="Verify your email"
                description="Verified accounts can post listings and reviews."
                action={
                  !checklistDone.verified ? (
                    <Button size="sm" variant="secondary" onClick={onResendVerification}>
                      Resend email
                    </Button>
                  ) : null
                }
              />
              <ChecklistItem
                done={checklistDone.profile}
                title="Add a display name"
                description="Tell other collectors who you are."
                action={
                  !checklistDone.profile ? (
                    <Button size="sm" variant="secondary" onClick={() => setTab("profile")}>
                      Add profile
                    </Button>
                  ) : null
                }
              />
              <ChecklistItem
                done={checklistDone.contributed}
                title="Submit your first disc or course"
                description="Help build the catalog with photos, reviews, or new entries."
                action={
                  !checklistDone.contributed ? (
                    <Button size="sm" variant="secondary" onClick={() => router.push("/submit-disc")}>
                      Submit something
                    </Button>
                  ) : null
                }
              />
            </ul>
            {verifyState.kind === "success" ? (
              <Notice variant="success" className="mt-3">
                {verifyState.message}
              </Notice>
            ) : null}
            {verifyState.kind === "error" ? (
              <Notice variant="error" className="mt-3">
                {verifyState.message}
              </Notice>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Status" />
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium text-slate-900">{label}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd>
                  {verified ? (
                    <Badge variant="success">verified</Badge>
                  ) : (
                    <Badge variant="warn">unverified</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Submissions</dt>
                <dd className="font-medium text-slate-900">{submissions.length}</dd>
              </div>
            </dl>
          </Card>

          <div className="lg:col-span-3">
            <RateThreeWidget />
          </div>
        </div>
      ) : null}

      {tab === "profile" ? (
        <Card>
          <CardHeader
            title="Profile"
            description="Public details shown next to your contributions."
            action={
              user?.username ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/u/${encodeURIComponent(user.username ?? "")}`)}
                >
                  View public profile
                </Button>
              ) : null
            }
          />
          <form onSubmit={onSaveProfile} className="space-y-4">
            <ImageUploadField
              name="avatarUrl"
              label="Profile photo"
              defaultUrl={profile?.avatarUrl ?? ""}
            />
            <Field label="Display name">
              <Input name="displayName" defaultValue={profile?.displayName ?? ""} placeholder="Your name" />
            </Field>
            <Field label="Bio">
              <Textarea name="bio" rows={3} defaultValue={profile?.bio ?? ""} placeholder="Short bio" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="City">
                <Input name="city" defaultValue={profile?.city ?? ""} placeholder="City" />
              </Field>
              <Field label="State / Province">
                <Input name="state" defaultValue={profile?.state ?? ""} placeholder="State" />
              </Field>
              <Field label="Country">
                <Input name="country" defaultValue={profile?.country ?? ""} placeholder="Country" />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Payment methods</h3>
                  <p className="text-xs text-slate-500">
                    Buyers see these on your listings. Money goes directly to your account — Mahoot
                    is not the merchant of record.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="PayPal"
                  hint="Email, @username, or paypal.me/yourname"
                >
                  <Input
                    name="paypalHandle"
                    defaultValue={profile?.paypalHandle ?? ""}
                    placeholder="you@example.com or paypal.me/yourname"
                  />
                </Field>
                <Field label="Venmo username" hint="Without the leading @">
                  <Input
                    name="venmoHandle"
                    defaultValue={profile?.venmoHandle ?? ""}
                    placeholder="yourname"
                  />
                </Field>
              </div>
              <Field
                label="Stripe Payment Link (optional)"
                hint="Create a reusable Payment Link in your Stripe dashboard and paste it here."
              >
                <Input
                  name="stripePaymentLinkUrl"
                  defaultValue={profile?.stripePaymentLinkUrl ?? ""}
                  placeholder="https://buy.stripe.com/..."
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="acceptsCashOnPickup"
                  defaultChecked={Boolean(profile?.acceptsCashOnPickup)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <span>I accept cash on local pickup</span>
              </label>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Crypto (Web3) — optional</h3>
                  <p className="text-xs text-slate-600">
                    Paste your own wallet address(es). Buyers send directly from their wallet —
                    Mahoot never holds, signs, or moves any funds. Always confirm the network with
                    the buyer; sending on the wrong network can result in lost funds.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  Beta
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Ethereum / EVM address (ERC-20)"
                  hint={
                    <>
                      0x… — set network in the note below (e.g. USDC on Polygon).
                      {cryptoHints.eth ? (
                        <span className="mt-0.5 block text-amber-800">{cryptoHints.eth}</span>
                      ) : null}
                    </>
                  }
                >
                  <Input
                    name="ethAddress"
                    defaultValue={profile?.ethAddress ?? ""}
                    placeholder="0x1234…abcd"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) =>
                      setCryptoHints((h) => ({ ...h, eth: hintEthAddress(e.target.value) }))
                    }
                  />
                </Field>
                <Field
                  label="Solana address (SOL / SPL)"
                  hint={
                    <>
                      Base58, ~32–44 chars.
                      {cryptoHints.sol ? (
                        <span className="mt-0.5 block text-amber-800">{cryptoHints.sol}</span>
                      ) : null}
                    </>
                  }
                >
                  <Input
                    name="solAddress"
                    defaultValue={profile?.solAddress ?? ""}
                    placeholder="9aBC…XyZ"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) =>
                      setCryptoHints((h) => ({ ...h, sol: hintSolAddress(e.target.value) }))
                    }
                  />
                </Field>
                <Field
                  label="Polkadot address (DOT)"
                  hint={
                    <>
                      SS58 format.
                      {cryptoHints.dot ? (
                        <span className="mt-0.5 block text-amber-800">{cryptoHints.dot}</span>
                      ) : null}
                    </>
                  }
                >
                  <Input
                    name="dotAddress"
                    defaultValue={profile?.dotAddress ?? ""}
                    placeholder="1…"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) =>
                      setCryptoHints((h) => ({ ...h, dot: hintSs58Address(e.target.value, "dot") }))
                    }
                  />
                </Field>
                <Field
                  label="Kusama address (KSM)"
                  hint={
                    <>
                      SS58 format.
                      {cryptoHints.ksm ? (
                        <span className="mt-0.5 block text-amber-800">{cryptoHints.ksm}</span>
                      ) : null}
                    </>
                  }
                >
                  <Input
                    name="ksmAddress"
                    defaultValue={profile?.ksmAddress ?? ""}
                    placeholder="F…"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) =>
                      setCryptoHints((h) => ({ ...h, ksm: hintSs58Address(e.target.value, "ksm") }))
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="Bitcoin address (BTC)"
                    hint={
                      <>
                        Legacy, SegWit, or Taproot — confirm type and network in your note.
                        {cryptoHints.btc ? (
                          <span className="mt-0.5 block text-amber-800">{cryptoHints.btc}</span>
                        ) : null}
                      </>
                    }
                  >
                    <Input
                      name="btcAddress"
                      defaultValue={profile?.btcAddress ?? ""}
                      placeholder="bc1… / 1… / 3…"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) =>
                        setCryptoHints((h) => ({ ...h, btc: hintBtcAddress(e.target.value) }))
                      }
                    />
                  </Field>
                </div>
              </div>
              <Field
                label="Network / token notes"
                hint="Shown to buyers next to your addresses (max 280 chars)."
              >
                <Input
                  name="cryptoNotes"
                  defaultValue={profile?.cryptoNotes ?? ""}
                  placeholder="e.g. ETH address accepts USDC on Polygon only. SOL: USDC-SPL preferred."
                  maxLength={280}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={profileState.kind === "loading"}>
                {profileState.kind === "loading" ? "Saving…" : "Save profile"}
              </Button>
              {profileState.kind === "success" ? (
                <span className="text-sm text-emerald-700">{profileState.message}</span>
              ) : null}
              {profileState.kind === "error" ? (
                <span className="text-sm text-rose-700">{profileState.message}</span>
              ) : null}
            </div>
          </form>
        </Card>
      ) : null}

      {tab === "submissions" ? (
        <Card>
          <CardHeader title="My submissions" description="Discs and courses you've sent in." />
          {submissionsLoading ? (
            <p className="text-sm text-slate-500">Loading submissions…</p>
          ) : submissions.length === 0 ? (
            <Notice variant="info">
              No submissions yet. Try{" "}
              <button
                type="button"
                onClick={() => router.push("/submit-disc")}
                className="font-medium text-slate-900 underline"
              >
                adding a disc
              </button>{" "}
              or{" "}
              <button
                type="button"
                onClick={() => router.push("/submit-course")}
                className="font-medium text-slate-900 underline"
              >
                a course
              </button>
              .
            </Notice>
          ) : (
            <ul className="space-y-2">
              {submissions.slice(0, 25).map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="text-xs uppercase text-slate-500">{item.kind}</span> · {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  {moderationBadge(item.moderation)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "listings" ? (
        <Card>
          <CardHeader
            title="My marketplace listings"
            description="Mark items as sold or cancel listings you no longer want public."
          />
          <MyListings />
        </Card>
      ) : null}

      {tab === "saved" ? (
        <Card>
          <CardHeader
            title="Saved listings"
            description="Listings you tapped the heart on. Tap a row to revisit it."
          />
          <SavedListings />
        </Card>
      ) : null}

      {tab === "inbox" ? (
        <Card>
          <CardHeader
            title="Inbox"
            description="Conversations with buyers and sellers, grouped by listing."
          />
          <Inbox />
        </Card>
      ) : null}

      {tab === "offers" ? (
        <Card>
          <CardHeader
            title="Offers"
            description="Pending and past offers — accept, decline, counter, or withdraw."
          />
          <OffersInbox />
        </Card>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  done,
  title,
  description,
  action,
}: {
  done: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
          aria-hidden
        >
          {done ? "✓" : ""}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${done ? "text-slate-500 line-through" : "text-slate-900"}`}>
            {title}
          </p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading account…</p>}>
      <AccountInner />
    </Suspense>
  );
}
