"use client";

import { useState } from "react";
import { readAuthToken } from "@/lib/auth";

type DiscRatingFormProps = {
  discDocumentId: string;
  discExternalId?: string | null;
  discName: string;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string; warning?: string | null }
  | { kind: "error"; message: string };

const tenBarFields = [
  { name: "overall", label: "Overall *", required: true as const },
  { name: "feelGrip", label: "Feel / Grip", required: false as const },
  { name: "forgiving", label: "Forgiving", required: false as const },
  { name: "windTrust", label: "Wind trust", required: false as const },
  { name: "shotShaping", label: "Shot shaping", required: false as const },
  { name: "distancePotential", label: "Distance potential", required: false as const },
  { name: "consistency", label: "Consistency", required: false as const },
] as const;

const armSpeedOptions = ["", "arm-under-300", "arm-300-350", "arm-350-400", "arm-over-400"] as const;
const throwStyleOptions = ["", "backhand", "forehand", "both"] as const;
const seasonedOptions = ["", "new", "seasoned", "beat"] as const;
const useCaseOptions = ["hyzer flip", "headwind", "woods", "roller", "forehand", "backhand"] as const;
const conditionOptions = ["calm", "headwind", "tailwind", "cold", "wet"] as const;
const deltaOptions = Array.from({ length: 9 }, (_, index) => index - 4);
const chipScale = Array.from({ length: 10 }, (_, index) => index + 1);

const readOptionalNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function DiscRatingForm({ discDocumentId, discExternalId, discName }: DiscRatingFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(tenBarFields.map((field) => [field.name, 0])),
  );
  const [turnDelta, setTurnDelta] = useState<number>(0);
  const [stabilityDelta, setStabilityDelta] = useState<number>(0);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ kind: "submitting" });
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const payload = {
      discDocumentId,
      discExternalId: discExternalId ?? undefined,
      discName,
      overall: readOptionalNumber(form.get("overall")),
      feelGrip: readOptionalNumber(form.get("feelGrip")),
      forgiving: readOptionalNumber(form.get("forgiving")),
      windTrust: readOptionalNumber(form.get("windTrust")),
      shotShaping: readOptionalNumber(form.get("shotShaping")),
      distancePotential: readOptionalNumber(form.get("distancePotential")),
      consistency: readOptionalNumber(form.get("consistency")),
      turnDelta,
      stabilityDelta,
      armSpeedBand: String(form.get("armSpeedBand") ?? ""),
      throwStyle: String(form.get("throwStyle") ?? ""),
      seasonedState: String(form.get("seasonedState") ?? ""),
      bestUseCases: form.getAll("bestUseCases").map((value) => String(value)),
      conditions: form.getAll("conditions").map((value) => String(value)),
      wouldRecommend: String(form.get("wouldRecommend") ?? "") === "yes",
      comment: String(form.get("comment") ?? ""),
    };

    try {
      if (!scores.overall || scores.overall < 1 || scores.overall > 10) {
        throw new Error("Please select an overall chip rating from 1 to 10.");
      }
      const token = readAuthToken();
      if (!token) {
        throw new Error("Please log in from Account to submit a disc review.");
      }

      const response = await fetch("/api/disc-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; warning?: string | null };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit review.");
      }
      setSubmitState({
        kind: "success",
        message: "Thanks! Your disc review was submitted.",
        warning: data.warning ?? null,
      });
      formElement.reset();
      setScores(Object.fromEntries(tenBarFields.map((field) => [field.name, 0])));
      setTurnDelta(0);
      setStabilityDelta(0);
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-900">Rate this disc</h3>
      <p className="mt-1 text-sm text-slate-600">
        10-bar ratings plus turn/stability deltas compared to listed flight numbers.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {submitState.kind === "success" && submitState.warning ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {submitState.warning}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenBarFields.map((field) => (
            <ChipRatingField
              key={field.name}
              name={field.name}
              label={field.label}
              value={scores[field.name] ?? 0}
              required={field.required}
              onChange={(nextValue) =>
                setScores((prev) => ({
                  ...prev,
                  [field.name]: nextValue,
                }))
              }
            />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CenteredDeltaSlider
            label="Turn delta (-4 to +4)"
            value={turnDelta}
            onChange={setTurnDelta}
            negativeLabel="More turn / flippier"
            positiveLabel="Less turn / more resistant"
          />
          <CenteredDeltaSlider
            label="Stability delta (-4 to +4)"
            value={stabilityDelta}
            onChange={setStabilityDelta}
            negativeLabel="More understable"
            positiveLabel="More overstable"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField name="armSpeedBand" label="Arm speed" options={armSpeedOptions} />
          <SelectField name="throwStyle" label="Throw style" options={throwStyleOptions} />
          <SelectField name="seasonedState" label="Disc wear" options={seasonedOptions} />
        </div>

        <CheckboxGroup name="bestUseCases" label="Best use cases" options={useCaseOptions} />
        <CheckboxGroup name="conditions" label="Conditions tested" options={conditionOptions} />

        <div className="space-y-1">
          <span className="text-sm text-slate-700">Would you recommend it?</span>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="wouldRecommend" value="yes" />
              Yes
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="wouldRecommend" value="no" />
              No
            </label>
          </div>
        </div>

        <textarea
          name="comment"
          rows={3}
          placeholder="Optional notes (how it compares in real throws)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitState.kind === "submitting"}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {submitState.kind === "submitting" ? "Submitting..." : "Submit Review"}
          </button>
          {submitState.kind === "success" && <p className="text-sm text-emerald-700">{submitState.message}</p>}
          {submitState.kind === "error" && <p className="text-sm text-rose-700">{submitState.message}</p>}
        </div>
      </form>
    </section>
  );
}

function ChipRatingField({
  name,
  label,
  value,
  required,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  required?: boolean;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-slate-700">{label}</span>
      <input type="hidden" name={name} value={value > 0 ? String(value) : ""} />
      <div className="flex flex-wrap items-center gap-1.5">
        {chipScale.map((score) => {
          const active = value === score;
          return (
            <button
              key={`${name}-${score}`}
              type="button"
              onClick={() => onChange(active && !required ? 0 : score)}
              className={`rounded-full border px-2 py-0.5 text-xs transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
              aria-label={`${label} ${score} out of 10`}
              title={`${score} / 10`}
            >
              {score}
            </button>
          );
        })}
        {!required && value > 0 ? (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="ml-1 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600 hover:border-slate-400"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">{value > 0 ? `${value} / 10` : "Not rated"}</p>
    </div>
  );
}

function CenteredDeltaSlider({
  label,
  value,
  onChange,
  negativeLabel,
  positiveLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  negativeLabel: string;
  positiveLabel: string;
}) {
  const valueLabel = value > 0 ? `+${value}` : `${value}`;
  const valueColor =
    value < 0 ? "text-sky-700" : value > 0 ? "text-rose-700" : "text-slate-700";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700">{label}</span>
        <span className={`text-sm font-semibold ${valueColor}`}>{valueLabel}</span>
      </div>
      <input
        type="range"
        min={-4}
        max={4}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-slate-700"
      />
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-sky-700">{negativeLabel}</span>
        <span className="text-slate-500">0</span>
        <span className="text-rose-700">{positiveLabel}</span>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        {deltaOptions.map((delta) => (
          <span key={`${label}-${delta}`}>{delta > 0 ? `+${delta}` : delta}</span>
        ))}
      </div>
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly string[];
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue=""
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        {options.map((option) => (
          <option key={`${name}-${option || "empty"}`} value={option}>
            {formatOptionLabel(option, name)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatOptionLabel(option: string, fieldName: string) {
  if (!option) return "Prefer not to say";
  if (fieldName === "armSpeedBand" && option === "arm-under-300") return "<300";
  if (fieldName === "armSpeedBand" && option === "arm-300-350") return "300-350";
  if (fieldName === "armSpeedBand" && option === "arm-350-400") return "350-400";
  if (fieldName === "armSpeedBand" && option === "arm-over-400") return "400+";
  return option;
}

function CheckboxGroup({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly string[];
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex flex-wrap gap-3 text-sm text-slate-700">
        {options.map((option) => (
          <label key={`${name}-${option}`} className="inline-flex items-center gap-1.5">
            <input type="checkbox" name={name} value={option} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}
