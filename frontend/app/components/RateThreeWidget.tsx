"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DiscImage } from "@/app/components/DiscImage";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { Card, CardHeader, Notice } from "@/app/components/ui";

type Suggestion = {
  documentId: string;
  externalId: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
};

type RatingState = Record<string, { score: number | null; status: "idle" | "saving" | "saved" | "error"; message?: string }>;

const SCALE = Array.from({ length: 10 }, (_, index) => index + 1);

/**
 * Account-page widget that nudges users to rate three popular discs they
 * haven't reviewed yet. Each row is a one-tap quick rating that posts to
 * `/api/disc-ratings` with the same shape used by the disc detail page.
 */
export function RateThreeWidget() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ratings, setRatings] = useState<RatingState>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setAuthed(Boolean(readAuthToken()));
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (!authed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const token = readAuthToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    void fetch("/api/rate-3-suggestions", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json()) as { suggestions?: Suggestion[]; error?: string };
        if (!response.ok) throw new Error(json.error ?? "Could not load suggestions.");
        setSuggestions(json.suggestions ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load suggestions.");
        setSuggestions([]);
      })
      .finally(() => setLoading(false));
  }, [authed, reloadKey]);

  const onPick = async (disc: Suggestion, score: number) => {
    const token = readAuthToken();
    if (!token) return;
    setRatings((prev) => ({
      ...prev,
      [disc.documentId]: { score, status: "saving" },
    }));
    try {
      const response = await fetch("/api/disc-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          discDocumentId: disc.documentId,
          discExternalId: disc.externalId,
          discName: disc.name,
          overall: score,
          turnDelta: 0,
          stabilityDelta: 0,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save rating.");
      setRatings((prev) => ({
        ...prev,
        [disc.documentId]: { score, status: "saved" },
      }));
    } catch (err) {
      setRatings((prev) => ({
        ...prev,
        [disc.documentId]: {
          score,
          status: "error",
          message: err instanceof Error ? err.message : "Could not save rating.",
        },
      }));
    }
  };

  if (!authed) return null;

  return (
    <Card>
      <CardHeader
        title="Rate 3 random discs"
        description="Help the leaderboards. One-tap scores; we won't show molds you've already rated."
        action={
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "Loading…" : "Shuffle"}
          </button>
        }
      />
      {error ? <Notice variant="error">{error}</Notice> : null}
      {loading && suggestions.length === 0 ? (
        <p className="text-sm text-slate-500">Picking three discs…</p>
      ) : suggestions.length === 0 ? (
        <Notice variant="info">
          Nice — you&apos;ve rated every popular mold we know about. Browse{" "}
          <Link href="/discs" className="font-medium underline">all discs</Link> to find more.
        </Notice>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((disc) => {
            const state = ratings[disc.documentId];
            return (
              <li
                key={disc.documentId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                  <DiscImage src={disc.imageUrl} alt={`${disc.name} image`} className="h-full w-full object-cover" fallbackLabel="" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/discs/${disc.documentId}`}
                    className="block truncate text-sm font-medium text-slate-900 hover:underline"
                  >
                    {disc.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    {[disc.brand, disc.category].filter(Boolean).join(" · ") || "—"}
                    {disc.speed !== null
                      ? ` · ${disc.speed}/${disc.glide ?? "-"}/${disc.turn ?? "-"}/${disc.fade ?? "-"}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SCALE.map((score) => {
                    const isPicked = state?.score === score;
                    const isSaving = isPicked && state?.status === "saving";
                    return (
                      <button
                        key={score}
                        type="button"
                        disabled={state?.status === "saving"}
                        onClick={() => void onPick(disc, score)}
                        className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                          isPicked
                            ? state?.status === "saved"
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : state?.status === "error"
                                ? "border-rose-500 bg-rose-500 text-white"
                                : "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        } ${isSaving ? "animate-pulse" : ""}`}
                        title={`${score} / 10`}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
                {state?.status === "saved" ? (
                  <p className="basis-full text-[11px] text-emerald-700">
                    Saved {state.score}/10. Thanks for the data!
                  </p>
                ) : null}
                {state?.status === "error" ? (
                  <p className="basis-full text-[11px] text-rose-700">{state.message}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
