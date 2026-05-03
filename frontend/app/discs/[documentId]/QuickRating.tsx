"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { Notice } from "@/app/components/ui";

type Props = {
  discDocumentId: string;
  discExternalId?: string | null;
  discName: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "submitting"; score: number }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const SCALE = Array.from({ length: 10 }, (_, index) => index + 1);

export function QuickRating({ discDocumentId, discExternalId, discName }: Props) {
  const router = useRouter();
  const padId = useId();
  const hasToken = useSyncExternalStore(
    (cb) => subscribeToAuthChanges(cb),
    () => Boolean(readAuthToken()),
    () => false,
  );
  const [padOpen, setPadOpen] = useState(false);
  const [hovered, setHovered] = useState<number>(0);
  const [committed, setCommitted] = useState<number>(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onPick = async (score: number) => {
    if (status.kind === "submitting") return;
    setCommitted(score);

    const token = readAuthToken();
    if (!token) {
      setStatus({ kind: "error", message: "Please log in from Account to rate this disc." });
      return;
    }

    setStatus({ kind: "submitting", score });
    try {
      const response = await fetch("/api/disc-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          discDocumentId,
          discExternalId: discExternalId ?? undefined,
          discName,
          overall: score,
          turnDelta: 0,
          stabilityDelta: 0,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit rating.");
      }
      setStatus({
        kind: "success",
        message: `Thanks — your ${score}/10 rating was saved.`,
      });
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not submit rating.",
      });
    }
  };

  if (!hasToken) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-700">
          <span className="font-medium">Quick rate this disc.</span>{" "}
          <Link
            href={`/account?next=${encodeURIComponent(`/discs/${discDocumentId}?tab=reviews`)}`}
            className="text-slate-900 underline"
          >
            Sign in
          </Link>{" "}
          to leave a one-tap score.
        </p>
      </div>
    );
  }

  const display = hovered || committed;

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Quick rating</p>
          <p className="text-xs text-slate-500">Tap a score from 1 to 10. Add details below for a full review.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">{display ? `${display} / 10` : "—"}</span>
          <button
            type="button"
            aria-expanded={padOpen}
            aria-controls={padId}
            onClick={() => setPadOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            title={padOpen ? "Hide score buttons" : "Show score buttons"}
          >
            <span className="sr-only">{padOpen ? "Hide score buttons" : "Show score buttons"}</span>
            {padOpen ? (
              <span className="text-lg font-light leading-none" aria-hidden>
                −
              </span>
            ) : (
              <span className="text-lg font-light leading-none" aria-hidden>
                +
              </span>
            )}
          </button>
        </div>
      </div>
      {padOpen ? (
        <div
          id={padId}
          className="flex flex-wrap gap-1.5 pt-1"
          onMouseLeave={() => setHovered(0)}
          role="radiogroup"
          aria-label="Quick rating"
        >
          {SCALE.map((score) => {
            const filled = score <= display;
            const isActive = score === committed;
            return (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={status.kind === "submitting"}
                onMouseEnter={() => setHovered(score)}
                onFocus={() => setHovered(score)}
                onClick={() => void onPick(score)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                  filled
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                } ${status.kind === "submitting" && status.score === score ? "animate-pulse" : ""}`}
                title={`${score} / 10`}
              >
                {score}
              </button>
            );
          })}
        </div>
      ) : null}
      {status.kind === "success" ? <Notice variant="success">{status.message}</Notice> : null}
      {status.kind === "error" ? <Notice variant="error">{status.message}</Notice> : null}
    </div>
  );
}
