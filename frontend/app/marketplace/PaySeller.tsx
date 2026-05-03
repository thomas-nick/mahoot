"use client";

import { useMemo, useState } from "react";
import { CryptoAddressQr } from "@/app/components/CryptoAddressQr";

type Props = {
  paypalHandle: string | null;
  venmoHandle: string | null;
  stripePaymentLinkUrl: string | null;
  acceptsCashOnPickup: boolean;
  /** Asking price in USD; used to deep-link Venmo/PayPal with a pre-filled amount. */
  priceUsd: number | null | undefined;
  /** Listing title; used as a Venmo/PayPal note. */
  listingTitle: string;
  /** Optional shipping cost (USD) added to amount when present. */
  shippingPriceUsd?: number | null;
  /** Optional Web3 wallet addresses (Phase 1: static display only). */
  ethAddress?: string | null;
  solAddress?: string | null;
  dotAddress?: string | null;
  ksmAddress?: string | null;
  btcAddress?: string | null;
  cryptoNotes?: string | null;
};

const PayPalIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M7.5 21.5h2.7l.6-3.8h2.4c3.7 0 6.4-1.7 7-5.2.4-2.4-.6-3.8-2.5-4.5.5-1.4.2-2.7-.7-3.6-1-1-2.6-1.4-4.7-1.4H7.7c-.5 0-.9.4-1 .9L4.5 19.7c0 .4.2.7.6.7h2.4zM10 9.7h2.5c2 0 3 .8 2.7 2.5-.3 1.7-1.6 2.5-3.5 2.5h-1.6L10 9.7z" />
  </svg>
);
const VenmoIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19.5 4.3c.6 1 .9 2.1.9 3.4 0 4.3-3.7 9.9-6.7 13.8H6.9L4.2 4.7l5.7-.5 1.5 11.7c1.4-2.3 3.1-5.9 3.1-8.4 0-1.4-.2-2.3-.6-3.1l5.6-.1z" />
  </svg>
);
const StripeIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M13.5 9.7c0-.7.6-1 1.6-1 1.4 0 3.2.4 4.6 1.2V5.4c-1.5-.6-3-.9-4.6-.9-3.7 0-6.2 2-6.2 5.2 0 5 6.9 4.2 6.9 6.4 0 .8-.7 1.1-1.8 1.1-1.5 0-3.5-.6-5.1-1.4v4.7c1.7.7 3.5 1 5.1 1 3.8 0 6.4-1.9 6.4-5.2 0-5.4-6.9-4.4-6.9-6.6z" />
  </svg>
);
const CashIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);
const ChainIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H7a5 5 0 0 1 0-10h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
const WarnIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const CopyIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const looksLikeEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

const buildPaypalLink = (handle: string, amount: number | null, note: string) => {
  const trimmed = handle.trim().replace(/^@+/, "");
  if (!trimmed) return null;
  const isPaypalMe = /paypal\.me\//i.test(trimmed);
  if (isPaypalMe) {
    const base = trimmed.replace(/^https?:\/\//i, "");
    const url = `https://${base.replace(/\/$/, "")}`;
    return amount ? `${url}/${amount.toFixed(2)}` : url;
  }
  if (looksLikeEmail(trimmed)) {
    const params = new URLSearchParams({
      cmd: "_xclick",
      business: trimmed,
      item_name: note.slice(0, 127),
      currency_code: "USD",
    });
    if (amount) params.set("amount", amount.toFixed(2));
    return `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
  }
  return `https://paypal.me/${encodeURIComponent(trimmed)}${amount ? `/${amount.toFixed(2)}` : ""}`;
};

const buildVenmoLink = (handle: string, amount: number | null, note: string) => {
  const username = handle.trim().replace(/^@+/, "");
  if (!username) return null;
  const params = new URLSearchParams({ txn: "pay", note: note.slice(0, 280) });
  if (amount) params.set("amount", amount.toFixed(2));
  return `https://venmo.com/${encodeURIComponent(username)}?${params.toString()}`;
};

const formatPaypalLabel = (raw: string) => {
  const trimmed = raw.trim();
  if (/paypal\.me\//i.test(trimmed)) return trimmed.replace(/^https?:\/\//i, "");
  if (looksLikeEmail(trimmed)) return trimmed;
  return `paypal.me/${trimmed.replace(/^@+/, "")}`;
};

type ChainKey = "eth" | "sol" | "dot" | "ksm" | "btc";

const CHAIN_META: Record<ChainKey, { label: string; subLabel: string; explorer?: (addr: string) => string }> = {
  eth: {
    label: "EVM (ERC-20)",
    subLabel: "Ethereum & EVM-compatible chains",
    explorer: (addr) => `https://etherscan.io/address/${encodeURIComponent(addr)}`,
  },
  sol: {
    label: "Solana (SOL / SPL)",
    subLabel: "SOL or SPL tokens like USDC-SPL",
    explorer: (addr) => `https://solscan.io/account/${encodeURIComponent(addr)}`,
  },
  dot: {
    label: "Polkadot (DOT)",
    subLabel: "Native DOT on the Polkadot relay chain",
    explorer: (addr) => `https://polkadot.subscan.io/account/${encodeURIComponent(addr)}`,
  },
  ksm: {
    label: "Kusama (KSM)",
    subLabel: "Native KSM on the Kusama relay chain",
    explorer: (addr) => `https://kusama.subscan.io/account/${encodeURIComponent(addr)}`,
  },
  btc: {
    label: "Bitcoin (BTC)",
    subLabel: "On-chain BTC (confirm SegWit / Taproot with seller)",
    explorer: (addr) => `https://mempool.space/address/${encodeURIComponent(addr)}`,
  },
};

const truncateAddress = (address: string, head = 6, tail = 6) => {
  const normalized = address.trim();
  if (normalized.length <= head + tail + 2) return normalized;
  return `${normalized.slice(0, head)}…${normalized.slice(-tail)}`;
};

export function PaySeller({
  paypalHandle,
  venmoHandle,
  stripePaymentLinkUrl,
  acceptsCashOnPickup,
  priceUsd,
  listingTitle,
  shippingPriceUsd,
  ethAddress,
  solAddress,
  dotAddress,
  ksmAddress,
  btcAddress,
  cryptoNotes,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const totalAmount = useMemo(() => {
    const base = typeof priceUsd === "number" && Number.isFinite(priceUsd) ? priceUsd : null;
    if (base == null) return null;
    const ship =
      typeof shippingPriceUsd === "number" && Number.isFinite(shippingPriceUsd)
        ? shippingPriceUsd
        : 0;
    return Math.max(0, base + ship);
  }, [priceUsd, shippingPriceUsd]);

  const note = `Mahoot: ${listingTitle}`.slice(0, 240);
  const paypalLink = paypalHandle ? buildPaypalLink(paypalHandle, totalAmount, note) : null;
  const venmoLink = venmoHandle ? buildVenmoLink(venmoHandle, totalAmount, note) : null;

  const cryptoEntries = [
    { key: "eth" as ChainKey, address: (ethAddress ?? "").trim() },
    { key: "sol" as ChainKey, address: (solAddress ?? "").trim() },
    { key: "dot" as ChainKey, address: (dotAddress ?? "").trim() },
    { key: "ksm" as ChainKey, address: (ksmAddress ?? "").trim() },
    { key: "btc" as ChainKey, address: (btcAddress ?? "").trim() },
  ].filter((entry) => entry.address.length > 0);
  const hasCrypto = cryptoEntries.length > 0;

  const hasAny =
    paypalHandle ||
    venmoHandle ||
    stripePaymentLinkUrl ||
    acceptsCashOnPickup ||
    hasCrypto;

  const onCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      /* ignore */
    }
  };

  if (!hasAny) {
    return (
      <p className="text-sm text-slate-600">
        This seller has not listed any payment handles yet. Use the message thread to coordinate
        payment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Confirm the total with the seller before paying. Mahoot does not process these payments —
        money goes directly between you and the seller.
      </p>

      {stripePaymentLinkUrl ? (
        <PayRow
          icon={<StripeIcon />}
          label="Pay with card (Stripe)"
          subLabel="Secure checkout via the seller's Stripe Payment Link."
          primary={{ label: "Open Stripe checkout", href: stripePaymentLinkUrl, external: true }}
          copyValue={stripePaymentLinkUrl}
          copyLabel="Copy link"
          copied={copied === "stripe"}
          onCopy={() => onCopy("stripe", stripePaymentLinkUrl)}
          tone="violet"
        />
      ) : null}

      {paypalHandle && paypalLink ? (
        <PayRow
          icon={<PayPalIcon />}
          label="Pay with PayPal"
          subLabel={formatPaypalLabel(paypalHandle)}
          primary={{
            label: totalAmount ? `Send $${totalAmount.toFixed(2)} on PayPal` : "Open PayPal",
            href: paypalLink,
            external: true,
          }}
          copyValue={paypalHandle}
          copyLabel="Copy handle"
          copied={copied === "paypal"}
          onCopy={() => onCopy("paypal", paypalHandle)}
          tone="sky"
        />
      ) : null}

      {venmoHandle && venmoLink ? (
        <PayRow
          icon={<VenmoIcon />}
          label="Pay with Venmo"
          subLabel={`@${venmoHandle.replace(/^@+/, "")}`}
          primary={{
            label: totalAmount ? `Send $${totalAmount.toFixed(2)} on Venmo` : "Open Venmo",
            href: venmoLink,
            external: true,
          }}
          copyValue={`@${venmoHandle.replace(/^@+/, "")}`}
          copyLabel="Copy handle"
          copied={copied === "venmo"}
          onCopy={() => onCopy("venmo", `@${venmoHandle.replace(/^@+/, "")}`)}
          tone="cyan"
        />
      ) : null}

      {acceptsCashOnPickup ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CashIcon />
          <span>Accepts cash on local pickup</span>
        </div>
      ) : null}

      {hasCrypto ? (
        <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <ChainIcon />
            <span>Pay with crypto (Web3)</span>
            <span className="ml-auto inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              Beta
            </span>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-violet-900/80">
            <span className="mt-0.5 text-amber-600">
              <WarnIcon />
            </span>
            <span>
              Confirm <strong>network and token</strong> with the seller before sending. Wrong-network
              transfers may not be recoverable. Mahoot does not process or escrow crypto payments.
            </span>
          </p>
          {cryptoNotes ? (
            <p className="rounded-md bg-white/70 px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-violet-100">
              <span className="font-semibold text-slate-800">Seller note:</span> {cryptoNotes}
            </p>
          ) : null}
          <div className="space-y-1.5">
            {cryptoEntries.map(({ key, address }) => {
              const meta = CHAIN_META[key];
              const explorer = meta.explorer ? meta.explorer(address) : null;
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <CryptoAddressQr value={address} size={72} className="hidden sm:block" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{meta.label}</p>
                      <CryptoAddressQr value={address} size={64} className="mt-2 sm:hidden" />
                      <p
                        className="mt-1 font-mono text-[11px] text-slate-700 sm:mt-0.5 break-all"
                        title={address}
                      >
                        {truncateAddress(address, 8, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCopy(`crypto:${key}`, address)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <CopyIcon />
                      {copied === `crypto:${key}` ? "Copied!" : "Copy"}
                    </button>
                    {explorer ? (
                      <a
                        href={explorer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        View ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Tone = "sky" | "cyan" | "violet";

const toneClasses: Record<Tone, { row: string; chip: string; button: string }> = {
  sky: {
    row: "border-sky-200 bg-sky-50",
    chip: "bg-sky-100 text-sky-800",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  cyan: {
    row: "border-cyan-200 bg-cyan-50",
    chip: "bg-cyan-100 text-cyan-800",
    button: "bg-cyan-600 hover:bg-cyan-700 text-white",
  },
  violet: {
    row: "border-violet-200 bg-violet-50",
    chip: "bg-violet-100 text-violet-800",
    button: "bg-violet-600 hover:bg-violet-700 text-white",
  },
};

function PayRow({
  icon,
  label,
  subLabel,
  primary,
  copyValue,
  copyLabel,
  copied,
  onCopy,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  primary: { label: string; href: string; external?: boolean };
  copyValue?: string;
  copyLabel?: string;
  copied?: boolean;
  onCopy?: () => void;
  tone: Tone;
}) {
  const classes = toneClasses[tone];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${classes.row}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${classes.chip}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {subLabel ? (
            <p className="truncate text-xs text-slate-600">{subLabel}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {copyValue && onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            <CopyIcon />
            {copied ? "Copied!" : copyLabel ?? "Copy"}
          </button>
        ) : null}
        <a
          href={primary.href}
          target={primary.external ? "_blank" : undefined}
          rel={primary.external ? "noopener noreferrer" : undefined}
          className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-semibold ${classes.button}`}
        >
          {primary.label}
        </a>
      </div>
    </div>
  );
}
