"use client";

import { useEffect, useState } from "react";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { emitNotificationsChanged } from "@/lib/notifications";

type Props = {
  listingDocumentId: string;
  /** Initial favorite id when known (server-rendered). */
  initialFavoriteId?: string | null;
  /** Compact icon-only variant for use inside cards. */
  compact?: boolean;
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export function FavoriteButton({ listingDocumentId, initialFavoriteId = null, compact = false }: Props) {
  const [favoriteId, setFavoriteId] = useState<string | null>(initialFavoriteId);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const token = readAuthToken();
      setHasToken(Boolean(token));
      if (!token) {
        setFavoriteId(null);
      }
    };
    refresh();
    return subscribeToAuthChanges(refresh);
  }, []);

  // If signed in but we don't have a server-rendered favoriteId, look it up
  // (covers cards rendered server-side anonymously then visited by an auth user).
  useEffect(() => {
    if (!hasToken || initialFavoriteId !== null) return;
    const token = readAuthToken();
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/favorites?listing=${encodeURIComponent(listingDocumentId)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { favoriteId?: string | null };
        if (!cancelled) setFavoriteId(payload.favoriteId ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasToken, listingDocumentId, initialFavoriteId]);

  const onClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const token = readAuthToken();
    if (!token) {
      window.location.href = `/account?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    setLoading(true);
    try {
      if (favoriteId) {
        const response = await fetch(`/api/favorites/${encodeURIComponent(favoriteId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setFavoriteId(null);
          emitNotificationsChanged();
        }
      } else {
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ listingDocumentId }),
        });
        if (response.ok) {
          const payload = (await response.json()) as { favoriteId?: string };
          setFavoriteId(payload.favoriteId ?? null);
          emitNotificationsChanged();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filled = Boolean(favoriteId);
  const sharedClass = filled ? "text-rose-500" : "text-slate-400 hover:text-rose-500";

  if (compact) {
    return (
      <button
        type="button"
        aria-label={filled ? "Remove from saved" : "Save listing"}
        onClick={onClick}
        disabled={loading}
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200 backdrop-blur transition disabled:opacity-60 ${sharedClass}`}
      >
        <HeartIcon filled={filled} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-60 ${sharedClass}`}
    >
      <HeartIcon filled={filled} />
      {filled ? "Saved" : "Save"}
    </button>
  );
}
