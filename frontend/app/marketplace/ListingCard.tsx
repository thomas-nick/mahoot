"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/app/components/ui";
import { FavoriteButton } from "@/app/marketplace/FavoriteButton";
import {
  brandGroupForListing,
  BRAND_THEME_CLASSES,
  CONDITION_LABEL,
  formatPrice,
  locationLabel,
  photoUrlsFor,
  sellerHandle,
} from "@/app/marketplace/lib";
import { QuickView } from "@/app/marketplace/QuickView";
import type { MarketListing } from "@/lib/strapi";

type Props = {
  listing: MarketListing;
};

const relTime = (iso?: string | null) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const isNew = (iso?: string | null) => {
  if (!iso) return false;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) && ms < 86_400_000;
};

const QuickViewIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export function ListingCard({ listing }: Props) {
  const id = (listing.documentId ?? "").trim() || String(listing.id);
  const href = `/marketplace/${id}`;
  const photos = photoUrlsFor(listing);
  const cover = photos[0] ?? null;
  const price = formatPrice(listing.priceUsd, listing.currency);
  const seller = sellerHandle(listing);
  const location = locationLabel(listing);
  const conditionLabel = listing.condition ? CONDITION_LABEL[listing.condition] : null;
  const brandGroup = brandGroupForListing(listing);
  const recent = isNew(listing.createdAt);
  const [quickOpen, setQuickOpen] = useState(false);

  const onQuickView = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setQuickOpen(true);
  };

  return (
    <>
      <Link
        href={href}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-lg motion-safe:hover:-translate-y-0.5"
      >
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
          <FavoriteButton listingDocumentId={id} compact />
          {price ? (
            <span className="rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-sm">
              {price}
            </span>
          ) : null}
        </div>
        {recent ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            New
          </span>
        ) : null}
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={listing.title}
              className="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">No photo</span>
            </div>
          )}
          {photos.length > 1 ? (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden>
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zm-12.5-5.5 2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              {photos.length}
            </div>
          ) : null}
          {brandGroup ? (
            <div
              className={`absolute bottom-3 right-3 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${BRAND_THEME_CLASSES[brandGroup.theme].chip}`}
            >
              {brandGroup.label}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onQuickView}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent py-3 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
            aria-label="Quick view"
          >
            <QuickViewIcon />
            Quick view
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900">
            {listing.title}
          </p>
          {listing.discDisplayName ? (
            <p className="line-clamp-1 text-xs text-slate-500">
              {listing.discDisplayName}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {conditionLabel ? <Badge>{conditionLabel}</Badge> : null}
            {listing.weightGrams ? <Badge>{listing.weightGrams}g</Badge> : null}
            {listing.plastic ? <Badge>{listing.plastic}</Badge> : null}
            {listing.negotiable ? <Badge variant="info">Offers OK</Badge> : null}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-slate-500">
            <span className="truncate">{seller ? `@${seller}` : "Seller"}</span>
            <span className="shrink-0 text-right">
              {[location, relTime(listing.createdAt)].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      </Link>
      <QuickView open={quickOpen} onClose={() => setQuickOpen(false)} listing={listing} />
    </>
  );
}
