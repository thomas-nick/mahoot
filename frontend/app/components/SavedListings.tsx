"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { emitNotificationsChanged, subscribeToNotificationChanges } from "@/lib/notifications";
import { Badge, Notice } from "@/app/components/ui";

type FavoriteRow = {
  id?: number;
  documentId?: string;
  listing?: {
    id?: number;
    documentId?: string;
    title?: string;
    priceUsd?: number;
    currency?: string | null;
    status?: string;
    imageUrl?: string | null;
    imageUrls?: string[] | null;
    discDisplayName?: string | null;
    seller?: { username?: string | null } | null;
  } | null;
};

const formatPrice = (price?: number, currency?: string | null) => {
  if (typeof price !== "number") return null;
  return `$${price.toFixed(2)}${currency && currency !== "USD" ? ` ${currency}` : ""}`;
};

const coverPhoto = (listing: FavoriteRow["listing"]) => {
  if (!listing) return null;
  if (listing.imageUrl) return listing.imageUrl;
  const extra = listing.imageUrls;
  if (Array.isArray(extra) && extra[0]) return extra[0];
  return null;
};

export function SavedListings() {
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = readAuthToken();
    if (!token) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { favorites?: FavoriteRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load saved listings.");
      setFavorites(payload.favorites ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load saved listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubAuth = subscribeToAuthChanges(() => void load());
    const unsubNotify = subscribeToNotificationChanges(() => void load());
    return () => {
      unsubAuth();
      unsubNotify();
    };
  }, [load]);

  const removeFavorite = async (favoriteId: string) => {
    const token = readAuthToken();
    if (!token) return;
    const response = await fetch(`/api/favorites/${encodeURIComponent(favoriteId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      setFavorites((rows) => rows.filter((row) => row.documentId !== favoriteId));
      emitNotificationsChanged();
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading saved listings…</p>;
  if (error) return <Notice variant="error">{error}</Notice>;
  if (favorites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">Nothing saved yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Tap the heart on any marketplace card or listing page to build a shortlist. We&apos;ll keep it here
          for quick checkout later.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {favorites.map((fav) => {
        const listing = fav.listing;
        if (!fav.documentId || !listing) return null;
        const id = listing.documentId ?? String(listing.id ?? "");
        const inactive = listing.status && listing.status !== "active";
        const cover = coverPhoto(listing);
        return (
          <li
            key={fav.documentId}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-lg border border-dashed border-slate-300" />
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={`/marketplace/${id}`}
                className="line-clamp-1 text-sm font-medium text-slate-900 hover:underline"
              >
                {listing.title}
              </Link>
              <p className="text-xs text-slate-500">
                {[
                  listing.discDisplayName,
                  listing.seller?.username ? `@${listing.seller.username}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-semibold text-slate-900">
                {formatPrice(listing.priceUsd, listing.currency)}
              </span>
              {inactive ? <Badge variant="warn">{listing.status}</Badge> : null}
              <button
                type="button"
                onClick={() => void removeFavorite(fav.documentId!)}
                className="text-xs text-slate-500 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
