"use client";

import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuthToken } from "@/lib/auth";

type CollectorReleaseFormProps = {
  discDocumentId: string;
  discExternalId?: string | null;
  discName: string;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const statusOptions = ["in-production", "oop", "limited-run", "tour-series"] as const;
const scoreOptions = Array.from({ length: 10 }, (_, index) => index + 1);

const readOptionalNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function CollectorReleaseForm({ discDocumentId, discExternalId, discName }: CollectorReleaseFormProps) {
  const hasToken = useSyncExternalStore(
    () => () => {},
    () => Boolean(readAuthToken()),
    () => false
  );
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ kind: "submitting" });
    const token = readAuthToken();
    if (!token) {
      setSubmitState({ kind: "error", message: "Please log in from Account to add collector runs." });
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      discDocumentId,
      discExternalId: discExternalId ?? undefined,
      discName,
      runName: String(form.get("runName") ?? ""),
      year: readOptionalNumber(form.get("year")),
      oopStatus: String(form.get("oopStatus") ?? ""),
      collectorValue: readOptionalNumber(form.get("collectorValue")),
      rarity: readOptionalNumber(form.get("rarity")),
      soughtAfter: readOptionalNumber(form.get("soughtAfter")),
      priceLowUsd: readOptionalNumber(form.get("priceLowUsd")),
      priceHighUsd: readOptionalNumber(form.get("priceHighUsd")),
      imageUrl: String(form.get("imageUrl") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };

    try {
      const response = await fetch("/api/collector-releases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create collector run.");
      }

      setSubmitState({ kind: "success", message: "Collector run added." });
      formElement.reset();
      router.refresh();
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (!hasToken) {
    return (
      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Log in from Account to add collector runs.
      </p>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Add collector run</h3>
      <p className="mt-1 text-sm text-slate-600">
        Add year-specific release details like tour series desirability and value.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="runName"
            required
            placeholder="Run name (e.g. Nate Sexton Firebird)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            name="year"
            required
            type="number"
            min={1900}
            max={2100}
            placeholder="Year"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <select
            name="oopStatus"
            defaultValue="in-production"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            name="collectorValue"
            defaultValue=""
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Collector value (1-10)</option>
            {scoreOptions.map((score) => (
              <option key={`collector-${score}`} value={score}>
                {score}
              </option>
            ))}
          </select>
          <select
            name="rarity"
            defaultValue=""
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Rarity (1-10)</option>
            {scoreOptions.map((score) => (
              <option key={`rarity-${score}`} value={score}>
                {score}
              </option>
            ))}
          </select>
          <select
            name="soughtAfter"
            defaultValue=""
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Sought after (1-10)</option>
            {scoreOptions.map((score) => (
              <option key={`sought-${score}`} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="priceLowUsd"
            type="number"
            step="0.01"
            placeholder="Price low (USD)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            name="priceHighUsd"
            type="number"
            step="0.01"
            placeholder="Price high (USD)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <input
          name="imageUrl"
          type="url"
          placeholder="Image URL (optional, e.g. stamp photo)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <textarea
          name="notes"
          rows={3}
          placeholder="Collector notes (stamp details, special run context, etc.)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitState.kind === "submitting"}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {submitState.kind === "submitting" ? "Saving..." : "Add collector run"}
          </button>
          {submitState.kind === "success" ? (
            <p className="text-sm text-emerald-700">{submitState.message}</p>
          ) : null}
          {submitState.kind === "error" ? <p className="text-sm text-rose-700">{submitState.message}</p> : null}
        </div>
      </form>
    </section>
  );
}
