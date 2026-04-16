"use client";

import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuthToken } from "@/lib/auth";
import type { CollectorRelease } from "@/lib/strapi";

type CollectorReleaseManagerProps = {
  releases: CollectorRelease[];
};

const statusOptions = ["in-production", "oop", "limited-run", "tour-series"] as const;
const scoreOptions = Array.from({ length: 10 }, (_, index) => index + 1);

type RowState = {
  runName: string;
  year: string;
  oopStatus: string;
  collectorValue: string;
  rarity: string;
  soughtAfter: string;
  priceLowUsd: string;
  priceHighUsd: string;
  imageUrl: string;
  notes: string;
};

const toRowState = (release: CollectorRelease): RowState => ({
  runName: release.runName ?? "",
  year: release.year != null ? String(release.year) : "",
  oopStatus: release.oopStatus ?? "in-production",
  collectorValue: release.collectorValue != null ? String(release.collectorValue) : "",
  rarity: release.rarity != null ? String(release.rarity) : "",
  soughtAfter: release.soughtAfter != null ? String(release.soughtAfter) : "",
  priceLowUsd: release.priceLowUsd != null ? String(release.priceLowUsd) : "",
  priceHighUsd: release.priceHighUsd != null ? String(release.priceHighUsd) : "",
  imageUrl: release.imageUrl ?? "",
  notes: release.notes ?? "",
});

export function CollectorReleaseManager({ releases }: CollectorReleaseManagerProps) {
  const hasToken = useSyncExternalStore(
    () => () => {},
    () => Boolean(readAuthToken()),
    () => false
  );
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RowState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (releases.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-600">
        No collector releases added yet. Add entries in Strapi under Collector Releases.
      </p>
    );
  }

  const beginEdit = (release: CollectorRelease) => {
    const rowId = release.documentId ?? "";
    if (!rowId) return;
    setEditingId(rowId);
    setDraft(toRowState(release));
    setErrorMessage("");
    setStatusMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const onSave = async (rowId: string) => {
    if (!draft) return;
    const token = readAuthToken();
    if (!token) {
      setErrorMessage("Please log in from Account to edit collector runs.");
      return;
    }
    setBusyId(rowId);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`/api/collector-releases/${encodeURIComponent(rowId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          runName: draft.runName,
          year: draft.year === "" ? undefined : Number(draft.year),
          oopStatus: draft.oopStatus,
          collectorValue: draft.collectorValue === "" ? undefined : Number(draft.collectorValue),
          rarity: draft.rarity === "" ? undefined : Number(draft.rarity),
          soughtAfter: draft.soughtAfter === "" ? undefined : Number(draft.soughtAfter),
          priceLowUsd: draft.priceLowUsd === "" ? undefined : Number(draft.priceLowUsd),
          priceHighUsd: draft.priceHighUsd === "" ? undefined : Number(draft.priceHighUsd),
          imageUrl: draft.imageUrl,
          notes: draft.notes,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update collector run.");
      }
      setStatusMessage("Collector run updated.");
      setEditingId(null);
      setDraft(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (rowId: string) => {
    const token = readAuthToken();
    if (!token) {
      setErrorMessage("Please log in from Account to delete collector runs.");
      return;
    }
    const confirmed = window.confirm("Delete this collector run?");
    if (!confirmed) return;

    setBusyId(rowId);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`/api/collector-releases/${encodeURIComponent(rowId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete collector run.");
      }
      setStatusMessage("Collector run deleted.");
      if (editingId === rowId) {
        setEditingId(null);
        setDraft(null);
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
      {releases.map((release) => {
        const rowId = release.documentId ?? "";
        const isEditing = hasToken && rowId && editingId === rowId && draft;
        const isBusy = busyId === rowId;
        return (
          <article
            key={release.documentId ?? release.externalId ?? `${release.year}-${release.runName}`}
            className="rounded-xl border border-slate-200 p-4"
          >
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.runName}
                    onChange={(event) => setDraft({ ...draft, runName: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Run name"
                  />
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={draft.year}
                    onChange={(event) => setDraft({ ...draft, year: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Year"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <select
                    value={draft.oopStatus}
                    onChange={(event) => setDraft({ ...draft, oopStatus: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={`${rowId}-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.collectorValue}
                    onChange={(event) => setDraft({ ...draft, collectorValue: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Collector value</option>
                    {scoreOptions.map((score) => (
                      <option key={`${rowId}-value-${score}`} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.rarity}
                    onChange={(event) => setDraft({ ...draft, rarity: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Rarity</option>
                    {scoreOptions.map((score) => (
                      <option key={`${rowId}-rarity-${score}`} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.soughtAfter}
                    onChange={(event) => setDraft({ ...draft, soughtAfter: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Sought after</option>
                    {scoreOptions.map((score) => (
                      <option key={`${rowId}-sought-${score}`} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="number"
                    step="0.01"
                    value={draft.priceLowUsd}
                    onChange={(event) => setDraft({ ...draft, priceLowUsd: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Price low (USD)"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={draft.priceHighUsd}
                    onChange={(event) => setDraft({ ...draft, priceHighUsd: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Price high (USD)"
                  />
                </div>
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Image URL (optional)"
                />
                <textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Collector notes"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void onSave(rowId)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                  >
                    {isBusy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={cancelEdit}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {release.year} · {release.runName}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {formatOopStatus(release.oopStatus)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                  <MetricPill label="Collector value" value={release.collectorValue ?? null} />
                  <MetricPill label="Rarity" value={release.rarity ?? null} />
                  <MetricPill label="Sought after" value={release.soughtAfter ?? null} />
                </div>
                {release.priceLowUsd != null || release.priceHighUsd != null ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Est. value: {formatUsdRange(release.priceLowUsd ?? null, release.priceHighUsd ?? null)}
                  </p>
                ) : null}
                {release.imageUrl ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={release.imageUrl}
                        alt={`${release.runName} stamp`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="break-all text-xs text-slate-600">{release.imageUrl}</p>
                  </div>
                ) : null}
                {release.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{release.notes}</p> : null}
                {hasToken && rowId ? (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(release)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:border-slate-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onDelete(rowId)}
                      className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs text-rose-700 hover:border-rose-400 disabled:opacity-60"
                    >
                      {isBusy ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1">
      {label}: {value ?? "-"}
      {value !== null ? "/10" : ""}
    </span>
  );
}

function formatOopStatus(status: string | null | undefined) {
  if (!status) return "Unknown";
  if (status === "tour-series") return "Tour Series";
  if (status === "limited-run") return "Limited Run";
  if (status === "in-production") return "In Production";
  if (status === "oop") return "OOP";
  return status;
}

function formatUsdRange(low: number | null, high: number | null) {
  if (low != null && high != null) return `$${low} - $${high}`;
  if (low != null) return `from $${low}`;
  if (high != null) return `up to $${high}`;
  return "Unknown";
}
