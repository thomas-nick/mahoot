import React from "react";

export const submissionUi = {
  stepContainer: "rounded-xl border border-slate-200 bg-slate-50 p-3",
  stepPillActive: "rounded-full px-3 py-1 text-xs bg-slate-900 text-white",
  stepPillIdle: "rounded-full px-3 py-1 text-xs bg-white text-slate-600",
  helperText: "text-xs text-slate-500",
  draftBanner: "flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3",
  draftText: "text-sm text-amber-900",
  draftPrimaryButton: "rounded-lg bg-amber-900 px-3 py-1.5 text-xs text-white",
  draftSecondaryButton: "rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-900",
  input: "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500",
  inputFull: "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500",
  textarea: "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500",
  chipActive: "rounded-full px-2.5 py-1 text-xs bg-slate-900 text-white",
  chipIdle: "rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200",
  sectionLabel: "text-xs uppercase tracking-wide text-slate-500",
  secondaryButton: "rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700",
  clearButton: "rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600",
  primaryButton:
    "rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60",
  reviewCard: "space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4",
};

export function StepPills({
  steps,
  currentStep,
  onSelect,
  note,
}: {
  steps: number[];
  currentStep: number;
  onSelect: (step: number) => void;
  note?: string;
}) {
  return (
    <div className={submissionUi.stepContainer}>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((stepNumber) => (
          <button
            key={`step-${stepNumber}`}
            type="button"
            onClick={() => onSelect(stepNumber)}
            className={currentStep === stepNumber ? submissionUi.stepPillActive : submissionUi.stepPillIdle}
          >
            Step {stepNumber}
          </button>
        ))}
        {note && <span className={submissionUi.helperText}>{note}</span>}
      </div>
    </div>
  );
}

export function DraftNotice({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className={submissionUi.draftBanner}>
      <p className={submissionUi.draftText}>A saved draft was found from a previous session.</p>
      <button type="button" onClick={onRestore} className={submissionUi.draftPrimaryButton}>
        Restore draft
      </button>
      <button type="button" onClick={onDiscard} className={submissionUi.draftSecondaryButton}>
        Discard
      </button>
    </div>
  );
}

export function PresetChips({
  title,
  values,
  selected,
  onSelect,
}: {
  title: string;
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className={submissionUi.sectionLabel}>{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => {
          const active = selected === value;
          return (
            <button
              key={`${title}-${value}`}
              type="button"
              onClick={() => onSelect(active ? "" : value)}
              className={active ? submissionUi.chipActive : submissionUi.chipIdle}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function SubmissionActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
