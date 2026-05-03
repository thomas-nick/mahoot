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
  SHIPPING_LABEL,
} from "@/app/marketplace/lib";
import { QuickView } from "@/app/marketplace/QuickView";
import type { MarketListing } from "@/lib/strapi";

type Props = { listing: MarketListing };

const relTime = (iso?: string | null) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
};

export function ListingRow({ listing }: Props) {
  const id = (listing.documentId ?? "").trim() || String(listing.id);
  const href = `/marketplace/${id}`;
  const photos = photoUrlsFor(listing);
  const cover = photos[0] ?? null;
  const price = formatPrice(listing.priceUsd, listing.currency);
  const seller = sellerHandle(listing);
  const location = locationLabel(listing);
  const conditionLabel = listing.condition ? CONDITION_LABEL[listing.condition] : null;
  const shippingLabel =
    listing.shipping && listing.shipping in SHIPPING_LABEL ? SHIPPING_LABEL[listing.shipping] : null;
  const brandGroup = brandGroupForListing(listing);
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <>
      <Link
        href={href}
        className="group flex items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 sm:h-28 sm:w-28">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={listing.title}
              className="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
              No photo
            </div>
          )}
          {photos.length > 1 ? (
            <div className="absolute bottom-1 left-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
              +{photos.length - 1}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{listing.title}</p>
              {listing.discDisplayName ? (
                <p className="line-clamp-1 text-xs text-slate-500">{listing.discDisplayName}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              {price ? (
                <p className="text-base font-bold text-slate-900">{price}</p>
              ) : null}
              <FavoriteButton listingDocumentId={id} compact />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {brandGroup ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BRAND_THEME_CLASSES[brandGroup.theme].chip}`}
              >
                {brandGroup.label}
              </span>
            ) : null}
            {conditionLabel ? <Badge>{conditionLabel}</Badge> : null}
            {listing.weightGrams ? <Badge>{listing.weightGrams}g</Badge> : null}
            {listing.plastic ? <Badge>{listing.plastic}</Badge> : null}
            {listing.negotiable ? <Badge variant="info">Offers OK</Badge> : null}
            {shippingLabel ? <Badge variant="neutral">{shippingLabel}</Badge> : null}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-slate-500">
            <span className="truncate">{seller ? `@${seller}` : "Seller"}</span>
            <div className="flex items-center gap-2">
              <span className="truncate">
                {[location, relTime(listing.createdAt)].filter(Boolean).join(" · ")}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setQuickOpen(true);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Quick view
              </button>
            </div>
          </div>
        </div>
      </Link>
      <QuickView open={quickOpen} onClose={() => setQuickOpen(false)} listing={listing} />
    </>
  );
}
