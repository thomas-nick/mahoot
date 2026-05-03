"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button } from "@/app/components/ui";
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
import type { MarketListing } from "@/lib/strapi";

type Props = {
  open: boolean;
  onClose: () => void;
  listing: MarketListing;
};

export function QuickView({ open, onClose, listing }: Props) {
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const id = (listing.documentId ?? "").trim() || String(listing.id);
  const detailHref = `/marketplace/${id}`;
  const photos = photoUrlsFor(listing);
  const cover = photos[Math.min(activePhoto, photos.length - 1)] ?? null;
  const price = formatPrice(listing.priceUsd, listing.currency);
  const shippingPrice = formatPrice(listing.shippingPriceUsd ?? null, listing.currency);
  const seller = sellerHandle(listing);
  const conditionLabel = listing.condition ? CONDITION_LABEL[listing.condition] : null;
  const shippingLabel =
    listing.shipping && listing.shipping in SHIPPING_LABEL ? SHIPPING_LABEL[listing.shipping] : null;
  const location = locationLabel(listing);
  const brandGroup = brandGroupForListing(listing);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${listing.title} quick view`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="grid max-h-[92vh] gap-0 overflow-y-auto sm:grid-cols-[1.2fr_1fr]">
          <div className="relative aspect-square w-full bg-gradient-to-br from-slate-100 to-slate-200">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                No photo
              </div>
            )}
            {brandGroup ? (
              <div
                className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${BRAND_THEME_CLASSES[brandGroup.theme].chip}`}
              >
                {brandGroup.label}
              </div>
            ) : null}
            {photos.length > 1 ? (
              <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1 px-3">
                {photos.slice(0, 6).map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    aria-label={`Photo ${index + 1}`}
                    className={`h-2 w-6 rounded-full transition ${
                      index === activePhoto ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[260px] flex-col gap-3 p-5">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{listing.title}</h3>
              {listing.discDisplayName ? (
                <p className="mt-0.5 text-sm text-slate-600">{listing.discDisplayName}</p>
              ) : null}
            </div>
            {price ? (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">{price}</p>
                {listing.negotiable ? (
                  <Badge variant="info">Offers OK</Badge>
                ) : (
                  <Badge>Firm</Badge>
                )}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {conditionLabel ? <Badge variant="success">{conditionLabel}</Badge> : null}
              {listing.weightGrams ? <Badge>{listing.weightGrams}g</Badge> : null}
              {listing.plastic ? <Badge>{listing.plastic}</Badge> : null}
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {shippingLabel ? <li>📦 {shippingLabel}{shippingPrice ? ` · ${shippingPrice}` : ""}</li> : null}
              {location ? <li>📍 {location}</li> : null}
              {seller ? (
                <li>
                  👤 <Link href={`/u/${seller}`} className="underline hover:text-slate-900">@{seller}</Link>
                </li>
              ) : null}
            </ul>
            {listing.description ? (
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">
                {listing.description}
              </p>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Link
                href={detailHref}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open full listing
              </Link>
              <Button variant="secondary" onClick={onClose}>
                Keep browsing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
