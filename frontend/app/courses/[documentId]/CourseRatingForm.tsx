"use client";

import { useState } from "react";
import { readAuthToken } from "@/lib/auth";

type CourseRatingFormProps = {
  courseDocumentId: string;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string; warning?: string | null }
  | { kind: "error"; message: string };

const scoreOptions = Array.from({ length: 10 }, (_, index) => index + 1);
const readOptionalScore = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function CourseRatingForm({ courseDocumentId }: CourseRatingFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ kind: "submitting" });
    const formElement = event.currentTarget;

    const form = new FormData(formElement);
    const payload = {
      courseDocumentId,
      overall: readOptionalScore(form.get("overall")),
      layout: readOptionalScore(form.get("layout")),
      signage: readOptionalScore(form.get("signage")),
      maintenance: readOptionalScore(form.get("maintenance")),
      scenery: readOptionalScore(form.get("scenery")),
      comment: String(form.get("comment") ?? ""),
    };

    try {
      const token = readAuthToken();
      if (!token) {
        throw new Error("Please log in from Account to submit a rating.");
      }

      const response = await fetch("/api/course-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; warning?: string | null };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit rating.");
      }
      setSubmitState({
        kind: "success",
        message: "Thanks! Your rating was submitted.",
        warning: data.warning ?? null,
      });
      formElement.reset();
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Rate This Course</h2>
      <p className="mt-1 text-sm text-slate-600">Use a 1-10 score for overall and each criterion.</p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        {submitState.kind === "success" && submitState.warning ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {submitState.warning}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreSelect name="overall" label="Overall *" required />
          <ScoreSelect name="layout" label="Layout" />
          <ScoreSelect name="signage" label="Signage" />
          <ScoreSelect name="maintenance" label="Maintenance" />
          <ScoreSelect name="scenery" label="Scenery" />
        </div>

        <textarea
          name="comment"
          rows={3}
          placeholder="Optional short comment"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitState.kind === "submitting"}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {submitState.kind === "submitting" ? "Submitting..." : "Submit Rating"}
          </button>
          {submitState.kind === "success" && <p className="text-sm text-emerald-700">{submitState.message}</p>}
          {submitState.kind === "error" && <p className="text-sm text-rose-700">{submitState.message}</p>}
        </div>
      </form>
    </section>
  );
}

function ScoreSelect({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm text-slate-700">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="" disabled>
          Select score
        </option>
        {scoreOptions.map((score) => (
          <option key={`${name}-${score}`} value={score}>
            {score} / 10
          </option>
        ))}
      </select>
    </label>
  );
}
