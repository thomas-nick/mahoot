"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { SHIPPING_LABEL } from "@/app/marketplace/lib";
import { emitNotificationsChanged, subscribeToNotificationChanges } from "@/lib/notifications";
import { Badge, Button, Notice } from "@/app/components/ui";

type ListingRow = {
  id: string;
  title: string;
  priceUsd: number | null;
  currency: string;
  condition: string;
  status: string;
  negotiable: boolean;
  plastic: string | null;
  shipping: string | null;
  discDocumentId: string;
  discDisplayName: string;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; rows: ListingRow[] }
  | { kind: "error"; message: string };

const formatPrice = (price: number | null, currency: string) => {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";
  const suffix = currency && currency !== "USD" ? ` ${currency}` : "";
  return `$${price.toFixed(2)}${suffix}`;
};

const statusBadge = (status: string) => {
  if (status === "active") return <Badge variant="success">active</Badge>;
  if (status === "sold") return <Badge variant="info">sold</Badge>;
  if (status === "cancelled") return <Badge variant="warn">cancelled</Badge>;
  return <Badge>{status}</Badge>;
};

const shippingChip = (key: string | null) => {
  if (!key || !(key in SHIPPING_LABEL)) return null;
  const label = SHIPPING_LABEL[key as keyof typeof SHIPPING_LABEL];
  return <Badge variant="neutral">{label}</Badge>;
};

export function MyListings() {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [actionMessage, setActionMessage] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string>("");

  const load = useCallback(async () => {
    const token = readAuthToken();
    if (!token) {
      setState({ kind: "ready", rows: [] });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/my-listings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { listings?: ListingRow[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load listings.");
      }
      setState({ kind: "ready", rows: payload.listings ?? [] });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load listings.",
      });
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

  const updateStatus = async (documentId: string, status: "active" | "sold" | "cancelled") => {
    const token = readAuthToken();
    if (!token) return;
    setUpdatingId(documentId);
    setActionMessage("");
    try {
      const response = await fetch("/api/my-listings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId, status }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Update failed.");
      }
      setActionMessage(`Listing marked ${status}.`);
      emitNotificationsChanged();
      await load();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setUpdatingId("");
    }
  };

  if (state.kind === "loading" || state.kind === "idle") {
    return <p className="text-sm text-slate-500">Loading listings…</p>;
  }
  if (state.kind === "error") {
    return <Notice variant="error">{state.message}</Notice>;
  }
  if (state.rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">No live listings</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Open any disc in the catalog, switch to the{" "}
          <span className="font-medium text-slate-900">Marketplace</span> tab, and publish photos plus shipping
          details in one go.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionMessage ? <Notice variant="info">{actionMessage}</Notice> : null}
      <ul className="space-y-2">
        {state.rows.map((row) => {
          const catalogHref = row.discDocumentId
            ? `/discs/${row.discDocumentId}?tab=marketplace`
            : "#";
          const publicHref = `/marketplace/${row.id}`;
          const isUpdating = updatingId === row.id;
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Link href={publicHref} className="shrink-0">
                  <img
                    src={row.imageUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-slate-200 object-cover transition hover:opacity-90"
                  />
                </Link>
              ) : (
                <Link
                  href={publicHref}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400"
                >
                  No photo
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={publicHref} className="font-medium text-slate-900 hover:underline">
                    {row.title}
                  </Link>
                  {statusBadge(row.status)}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[
                    formatPrice(row.priceUsd, row.currency),
                    row.discDisplayName || null,
                    row.condition ? `Condition: ${row.condition}` : null,
                    row.createdAt ? `Listed ${new Date(row.createdAt).toLocaleDateString()}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.negotiable ? <Badge variant="info">Offers OK</Badge> : <Badge>Firm</Badge>}
                  {row.plastic ? <Badge>{row.plastic}</Badge> : null}
                  {shippingChip(row.shipping)}
                </div>
                <p className="mt-2 text-xs">
                  <Link href={catalogHref} className="text-slate-500 underline hover:text-slate-800">
                    Disc page
                  </Link>
                  <span className="text-slate-300"> · </span>
                  <Link href={publicHref} className="text-slate-500 underline hover:text-slate-800">
                    Public listing
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {row.status !== "sold" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isUpdating}
                    onClick={() => updateStatus(row.id, "sold")}
                  >
                    Mark sold
                  </Button>
                ) : null}
                {row.status !== "cancelled" && row.status !== "sold" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isUpdating}
                    onClick={() => updateStatus(row.id, "cancelled")}
                  >
                    Cancel
                  </Button>
                ) : null}
                {row.status !== "active" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isUpdating}
                    onClick={() => updateStatus(row.id, "active")}
                  >
                    Reactivate
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
