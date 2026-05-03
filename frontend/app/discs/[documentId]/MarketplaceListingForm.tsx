"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import {
  hintBtcAddress,
  hintEthAddress,
  hintSolAddress,
  hintSs58Address,
} from "@/lib/crypto-address-hints";
import { PhotosField } from "@/app/components/PhotosField";
import { Button, Field, Input, Notice, Textarea } from "@/app/components/ui";

type MarketplaceListingFormProps = {
  discDocumentId: string;
  discExternalId: string;
  discDisplayName: string;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type PaymentMethods = {
  paypalHandle: string;
  venmoHandle: string;
  stripePaymentLinkUrl: string;
  acceptsCashOnPickup: boolean;
  ethAddress: string;
  solAddress: string;
  dotAddress: string;
  ksmAddress: string;
  btcAddress: string;
  cryptoNotes: string;
};

const EMPTY_PAYMENTS: PaymentMethods = {
  paypalHandle: "",
  venmoHandle: "",
  stripePaymentLinkUrl: "",
  acceptsCashOnPickup: false,
  ethAddress: "",
  solAddress: "",
  dotAddress: "",
  ksmAddress: "",
  btcAddress: "",
  cryptoNotes: "",
};

const conditionOptions = ["new", "like-new", "used", "inked", "unknown"] as const;

const shippingOptions = [
  { id: "ships-us-only", label: "Ships in US" },
  { id: "ships-international", label: "Ships internationally" },
  { id: "local-pickup", label: "Local pickup only" },
  { id: "ships-and-pickup", label: "Ships or local pickup" },
] as const;

const SELECT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const samePayments = (a: PaymentMethods, b: PaymentMethods) =>
  a.paypalHandle === b.paypalHandle &&
  a.venmoHandle === b.venmoHandle &&
  a.stripePaymentLinkUrl === b.stripePaymentLinkUrl &&
  a.acceptsCashOnPickup === b.acceptsCashOnPickup &&
  a.ethAddress === b.ethAddress &&
  a.solAddress === b.solAddress &&
  a.dotAddress === b.dotAddress &&
  a.ksmAddress === b.ksmAddress &&
  a.btcAddress === b.btcAddress &&
  a.cryptoNotes === b.cryptoNotes;

const trunc = (s: string, n: number) => {
  const t = s.trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const summaryItems = (payments: PaymentMethods): string[] => {
  const items: string[] = [];
  if (payments.paypalHandle) items.push(`PayPal · ${payments.paypalHandle}`);
  if (payments.venmoHandle) items.push(`Venmo · @${payments.venmoHandle.replace(/^@+/, "")}`);
  if (payments.stripePaymentLinkUrl) items.push("Stripe Payment Link");
  if (payments.acceptsCashOnPickup) items.push("Cash on local pickup");
  if (payments.ethAddress) items.push(`EVM · ${trunc(payments.ethAddress, 10)}`);
  if (payments.solAddress) items.push(`SOL · ${trunc(payments.solAddress, 8)}`);
  if (payments.dotAddress) items.push(`DOT · ${trunc(payments.dotAddress, 8)}`);
  if (payments.ksmAddress) items.push(`KSM · ${trunc(payments.ksmAddress, 8)}`);
  if (payments.btcAddress) items.push(`BTC · ${trunc(payments.btcAddress, 10)}`);
  if (payments.cryptoNotes) items.push(`Crypto note · ${trunc(payments.cryptoNotes, 24)}`);
  return items;
};

export function MarketplaceListingForm({
  discDocumentId,
  discExternalId,
  discDisplayName,
}: MarketplaceListingFormProps) {
  const hasToken = useSyncExternalStore(
    (cb) => subscribeToAuthChanges(cb),
    () => Boolean(readAuthToken()),
    () => false,
  );
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [payments, setPayments] = useState<PaymentMethods>(EMPTY_PAYMENTS);
  const [paymentsLoaded, setPaymentsLoaded] = useState<PaymentMethods>(EMPTY_PAYMENTS);
  const [paymentsExpanded, setPaymentsExpanded] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!hasToken) {
      setPayments(EMPTY_PAYMENTS);
      setPaymentsLoaded(EMPTY_PAYMENTS);
      setPaymentsExpanded(false);
      return;
    }
    const token = readAuthToken();
    if (!token) return;
    let cancelled = false;
    void (async () => {
      setProfileLoading(true);
      try {
        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          profile?: {
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
          } | null;
        };
        if (cancelled) return;
        const next: PaymentMethods = {
          paypalHandle: (data.profile?.paypalHandle ?? "").trim(),
          venmoHandle: (data.profile?.venmoHandle ?? "").trim(),
          stripePaymentLinkUrl: (data.profile?.stripePaymentLinkUrl ?? "").trim(),
          acceptsCashOnPickup: Boolean(data.profile?.acceptsCashOnPickup),
          ethAddress: (data.profile?.ethAddress ?? "").trim(),
          solAddress: (data.profile?.solAddress ?? "").trim(),
          dotAddress: (data.profile?.dotAddress ?? "").trim(),
          ksmAddress: (data.profile?.ksmAddress ?? "").trim(),
          btcAddress: (data.profile?.btcAddress ?? "").trim(),
          cryptoNotes: (data.profile?.cryptoNotes ?? "").trim(),
        };
        setPayments(next);
        setPaymentsLoaded(next);
        const anyMethod =
          next.paypalHandle ||
          next.venmoHandle ||
          next.stripePaymentLinkUrl ||
          next.acceptsCashOnPickup ||
          next.ethAddress ||
          next.solAddress ||
          next.dotAddress ||
          next.ksmAddress ||
          next.btcAddress ||
          next.cryptoNotes;
        setPaymentsExpanded(!anyMethod);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ kind: "submitting" });
    const token = readAuthToken();
    if (!token) {
      setSubmitState({ kind: "error", message: "Please log in from Account to post a listing." });
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const priceRaw = String(form.get("priceUsd") ?? "").trim();
    const priceUsd = Number(priceRaw);
    const condition = String(form.get("condition") ?? "used").trim();
    const negotiable = form.get("negotiable") === "on";
    const plastic = String(form.get("plastic") ?? "").trim();
    const weightRaw = String(form.get("weightGrams") ?? "").trim();
    const weightGrams = weightRaw ? Number(weightRaw) : null;
    const colorStamp = String(form.get("colorStamp") ?? "").trim();
    const shipping = String(form.get("shipping") ?? "ships-us-only").trim();
    const shippingPriceRaw = String(form.get("shippingPriceUsd") ?? "").trim();
    const shippingPriceUsd = shippingPriceRaw ? Number(shippingPriceRaw) : null;
    const city = String(form.get("city") ?? "").trim();
    const country = String(form.get("country") ?? "US").trim().toUpperCase();
    const imageUrls = photos.map((url) => url.trim()).filter(Boolean);
    const primaryImage = imageUrls[0] ?? "";
    const extraImages = imageUrls.slice(1);

    if (!title) {
      setSubmitState({ kind: "error", message: "Title is required." });
      return;
    }
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      setSubmitState({ kind: "error", message: "Price must be a positive number." });
      return;
    }
    if (weightGrams !== null && (!Number.isFinite(weightGrams) || weightGrams < 100 || weightGrams > 250)) {
      setSubmitState({ kind: "error", message: "Weight must be between 100g and 250g." });
      return;
    }

    try {
      if (!samePayments(payments, paymentsLoaded)) {
        const paymentsResponse = await fetch("/api/profile/payments", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payments),
        });
        const paymentsData = (await paymentsResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!paymentsResponse.ok) {
          throw new Error(paymentsData.error ?? "Could not save payment methods.");
        }
        setPaymentsLoaded(payments);
      }

      const response = await fetch("/api/market-listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          priceUsd,
          currency: "USD",
          condition,
          discDocumentId,
          discExternalId,
          discDisplayName,
          imageUrl: primaryImage,
          imageUrls: extraImages,
          negotiable,
          plastic,
          weightGrams,
          colorStamp,
          shipping,
          shippingPriceUsd,
          city,
          country,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create listing.");
      }

      setSubmitState({ kind: "success", message: "Listing posted." });
      formElement.reset();
      setPhotos([]);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create listing.";
      setSubmitState({ kind: "error", message });
    }
  };

  if (!hasToken) {
    return (
      <Notice variant="info">Log in from Account to list this disc on the marketplace.</Notice>
    );
  }

  const summary = summaryItems(paymentsLoaded);
  const hasAnySaved = summary.length > 0;

  return (
    <form className="mt-4 space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <Input name="title" required placeholder="e.g. 175g Champion Destroyer — field tested" />
        </Field>
        <Field label="Price (USD)">
          <Input name="priceUsd" type="number" min="0" step="0.01" required placeholder="49.99" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Condition">
          <select name="condition" defaultValue="used" className={SELECT_CLASS}>
            {conditionOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plastic">
          <Input name="plastic" placeholder="Champion, Star, P-Line, etc." />
        </Field>
        <Field label="Weight (g)">
          <Input name="weightGrams" type="number" min={100} max={250} step="1" placeholder="175" />
        </Field>
      </div>

      <Field label="Color / stamp">
        <Input name="colorStamp" placeholder="red w/ silver stamp" />
      </Field>

      <Field label="Description">
        <Textarea
          name="description"
          rows={3}
          placeholder="Wear, dome, ink, parking lot dings, anything a buyer should know."
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Shipping">
          <select name="shipping" defaultValue="ships-us-only" className={SELECT_CLASS}>
            {shippingOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shipping cost (USD)" hint="Leave blank for free / built-in.">
          <Input name="shippingPriceUsd" type="number" min={0} step="0.01" placeholder="6.00" />
        </Field>
        <Field label="Country">
          <Input name="country" maxLength={2} placeholder="US" defaultValue="US" />
        </Field>
      </div>

      <Field label="City (optional)">
        <Input name="city" placeholder="Austin" />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="negotiable"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        />
        Accept offers from buyers
      </label>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Photos</p>
          <p className="text-xs text-slate-500">
            Add up to 6 photos — top, bottom, rim, ink, weight stamp, and a glamour shot in the
            grass. The first one is your cover.
          </p>
        </div>
        <PhotosField value={photos} onChange={setPhotos} max={6} />
      </div>

      <PaymentMethodsBlock
        payments={payments}
        onChange={setPayments}
        expanded={paymentsExpanded}
        onToggleExpanded={() => setPaymentsExpanded((value) => !value)}
        summary={summary}
        hasAnySaved={hasAnySaved}
        loading={profileLoading}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={submitState.kind === "submitting"}>
          {submitState.kind === "submitting" ? "Posting…" : "Post listing"}
        </Button>
      </div>

      {submitState.kind === "success" ? (
        <Notice variant="success">{submitState.message}</Notice>
      ) : null}
      {submitState.kind === "error" ? <Notice variant="error">{submitState.message}</Notice> : null}
    </form>
  );
}

function PaymentMethodsBlock({
  payments,
  onChange,
  expanded,
  onToggleExpanded,
  summary,
  hasAnySaved,
  loading,
}: {
  payments: PaymentMethods;
  onChange: (next: PaymentMethods) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  summary: string[];
  hasAnySaved: boolean;
  loading: boolean;
}) {
  const update = <K extends keyof PaymentMethods>(key: K, value: PaymentMethods[K]) => {
    onChange({ ...payments, [key]: value });
  };

  const cryptoHints = useMemo(
    () => ({
      eth: hintEthAddress(payments.ethAddress),
      sol: hintSolAddress(payments.solAddress),
      dot: hintSs58Address(payments.dotAddress, "dot"),
      ksm: hintSs58Address(payments.ksmAddress, "ksm"),
      btc: hintBtcAddress(payments.btcAddress),
    }),
    [
      payments.btcAddress,
      payments.dotAddress,
      payments.ethAddress,
      payments.ksmAddress,
      payments.solAddress,
    ],
  );

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">How buyers pay you</p>
          <p className="text-xs text-slate-500">
            Saved on your profile and shown on every active listing. Money goes directly to you —
            Mahoot is not the merchant of record.{" "}
            <Link
              href="/account?tab=profile"
              className="font-medium text-slate-700 underline hover:text-slate-900"
            >
              Manage in Account →
            </Link>
          </p>
        </div>
        {hasAnySaved && !expanded ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            Update
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading saved methods…</p>
      ) : null}

      {!loading && hasAnySaved && !expanded ? (
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {summary.map((item) => (
            <li
              key={item}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !hasAnySaved && !expanded ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Add a payment method
        </button>
      ) : null}

      {expanded ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="PayPal" hint="Email, @username, or paypal.me/yourname">
              <Input
                value={payments.paypalHandle}
                onChange={(event) => update("paypalHandle", event.target.value)}
                placeholder="you@example.com or paypal.me/yourname"
              />
            </Field>
            <Field label="Venmo username" hint="Without the leading @">
              <Input
                value={payments.venmoHandle}
                onChange={(event) => update("venmoHandle", event.target.value)}
                placeholder="yourname"
              />
            </Field>
          </div>
          <Field
            label="Stripe Payment Link (optional)"
            hint="Create a reusable Payment Link in your Stripe dashboard and paste it here."
          >
            <Input
              value={payments.stripePaymentLinkUrl}
              onChange={(event) => update("stripePaymentLinkUrl", event.target.value)}
              placeholder="https://buy.stripe.com/..."
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={payments.acceptsCashOnPickup}
              onChange={(event) => update("acceptsCashOnPickup", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            <span>I accept cash on local pickup</span>
          </label>

          <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-violet-950">Crypto (Web3) — optional</p>
                <p className="text-xs text-violet-900/80">
                  Static address display only. Wrong-network sends may be unrecoverable — use the note
                  field.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                Beta
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="EVM (ERC-20)"
                hint={
                  <>
                    0x… + 40 hex
                    {cryptoHints.eth ? (
                      <span className="mt-0.5 block text-amber-800">{cryptoHints.eth}</span>
                    ) : null}
                  </>
                }
              >
                <Input
                  value={payments.ethAddress}
                  onChange={(e) => update("ethAddress", e.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="Solana"
                hint={
                  <>
                    Base58 address
                    {cryptoHints.sol ? (
                      <span className="mt-0.5 block text-amber-800">{cryptoHints.sol}</span>
                    ) : null}
                  </>
                }
              >
                <Input
                  value={payments.solAddress}
                  onChange={(e) => update("solAddress", e.target.value)}
                  placeholder="9…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="Polkadot (DOT)"
                hint={
                  <>
                    SS58
                    {cryptoHints.dot ? (
                      <span className="mt-0.5 block text-amber-800">{cryptoHints.dot}</span>
                    ) : null}
                  </>
                }
              >
                <Input
                  value={payments.dotAddress}
                  onChange={(e) => update("dotAddress", e.target.value)}
                  placeholder="1…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="Kusama (KSM)"
                hint={
                  <>
                    SS58
                    {cryptoHints.ksm ? (
                      <span className="mt-0.5 block text-amber-800">{cryptoHints.ksm}</span>
                    ) : null}
                  </>
                }
              >
                <Input
                  value={payments.ksmAddress}
                  onChange={(e) => update("ksmAddress", e.target.value)}
                  placeholder="F…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Bitcoin (BTC)"
                  hint={
                    <>
                      bc1… / 1… / 3…
                      {cryptoHints.btc ? (
                        <span className="mt-0.5 block text-amber-800">{cryptoHints.btc}</span>
                      ) : null}
                    </>
                  }
                >
                  <Input
                    value={payments.btcAddress}
                    onChange={(e) => update("btcAddress", e.target.value)}
                    placeholder="bc1…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
              </div>
            </div>
            <Field
              label="Network / token notes"
              hint="Shown on listing pages with your addresses (max 280 chars)."
            >
              <Input
                value={payments.cryptoNotes}
                onChange={(e) => update("cryptoNotes", e.target.value.slice(0, 280))}
                placeholder="e.g. USDC on Polygon only"
                maxLength={280}
              />
            </Field>
          </div>

          {hasAnySaved ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Done editing
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
