"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readAuthToken, readAuthUser, subscribeToAuthChanges } from "@/lib/auth";
import { emitNotificationsChanged, subscribeToNotificationChanges } from "@/lib/notifications";
import { Badge, Button, Notice } from "@/app/components/ui";

type Offer = {
  id?: number;
  documentId?: string;
  priceUsd?: number;
  status?: string;
  note?: string | null;
  counterPriceUsd?: number | null;
  sellerNote?: string | null;
  createdAt?: string;
  buyer?: { id?: number; username?: string | null } | null;
  listing?: {
    documentId?: string;
    title?: string;
    priceUsd?: number;
    seller?: { id?: number; username?: string | null } | null;
  } | null;
};

const statusBadge = (status?: string) => {
  switch (status) {
    case "accepted":
      return <Badge variant="success">accepted</Badge>;
    case "declined":
      return <Badge variant="warn">declined</Badge>;
    case "countered":
      return <Badge variant="info">countered</Badge>;
    case "withdrawn":
      return <Badge>withdrawn</Badge>;
    default:
      return <Badge>pending</Badge>;
  }
};

export function OffersInbox() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string>("");
  const [me, setMe] = useState<{ id?: number } | null>(null);

  const load = useCallback(async () => {
    const token = readAuthToken();
    const stored = readAuthUser<{ id?: number }>();
    setMe(stored);
    if (!token) {
      setOffers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/offers", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { offers?: Offer[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load offers.");
      setOffers(payload.offers ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load offers.");
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

  const decide = async (offer: Offer, action: "accepted" | "declined" | "countered" | "withdrawn") => {
    const token = readAuthToken();
    if (!token || !offer.documentId) return;
    const body: Record<string, unknown> = { status: action };
    if (action === "countered") {
      const raw = window.prompt("Counter offer in USD:");
      const counter = Number(raw);
      if (!Number.isFinite(counter) || counter <= 0) return;
      body.counterPriceUsd = counter;
    }
    setActionId(offer.documentId);
    try {
      const response = await fetch(`/api/offers/${encodeURIComponent(offer.documentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");
      emitNotificationsChanged();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setActionId("");
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading offers…</p>;
  if (error) return <Notice variant="error">{error}</Notice>;
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">No offers in your queue</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Make an offer from any negotiable listing, or wait for buyers to send one on yours — then accept,
          decline, or counter right here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {offers.map((offer) => {
        if (!offer.documentId) return null;
        const isSellerSide = offer.listing?.seller?.id === me?.id;
        const listingId = offer.listing?.documentId;
        const counterparty = isSellerSide
          ? offer.buyer?.username ?? "buyer"
          : offer.listing?.seller?.username ?? "seller";
        const isPending = offer.status === "pending" || offer.status === "countered";
        const busy = actionId === offer.documentId;
        return (
          <li
            key={offer.documentId}
            className="rounded-xl border border-slate-200 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {listingId ? (
                  <Link
                    href={`/marketplace/${listingId}`}
                    className="line-clamp-1 text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {offer.listing?.title ?? "(listing)"}
                  </Link>
                ) : (
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                    {offer.listing?.title ?? "(listing)"}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {isSellerSide ? `Offer from @${counterparty}` : `Your offer to @${counterparty}`}
                  {offer.createdAt ? ` · ${new Date(offer.createdAt).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  ${offer.priceUsd?.toFixed(2)}
                  {typeof offer.listing?.priceUsd === "number" ? (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      / asking ${offer.listing.priceUsd.toFixed(2)}
                    </span>
                  ) : null}
                </p>
                {statusBadge(offer.status)}
              </div>
            </div>
            {offer.note ? (
              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                Buyer: {offer.note}
              </p>
            ) : null}
            {offer.counterPriceUsd ? (
              <p className="mt-2 text-xs text-slate-500">
                Seller countered at ${offer.counterPriceUsd.toFixed(2)}
              </p>
            ) : null}

            {isPending ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {isSellerSide ? (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => void decide(offer, "accepted")}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void decide(offer, "countered")}
                    >
                      Counter
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void decide(offer, "declined")}
                    >
                      Decline
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void decide(offer, "withdrawn")}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
