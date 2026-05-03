"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readAuthToken } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { ImageUploadField } from "@/app/components/ImageUploadField";
import {
  DraftNotice,
  PresetChips,
  StepPills,
  StepSection,
  SubmissionActionRow,
  submissionUi,
} from "@/app/components/submission-ui";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type Step = 1 | 2 | 3;

type FormValues = {
  discName: string;
  brand: string;
  category: string;
  speed: string;
  glide: string;
  turn: string;
  fade: string;
  stability: string;
  plastic: string;
  diameterCm: string;
  heightCm: string;
  rimDepthCm: string;
  rimThicknessCm: string;
  maxWeightGr: string;
  link: string;
  imageUrl: string;
  color: string;
  backgroundColor: string;
  notes: string;
};

const DRAFT_KEY = "disc-submission-draft-v1";
const DISC_CATEGORIES = ["Distance Driver", "Fairway Driver", "Midrange", "Putter", "Approach"] as const;
const STABILITY_PRESETS = ["Overstable", "Stable", "Understable"] as const;
const SPEED_PRESETS = ["2", "3", "4", "5", "7", "9", "11", "12", "13"] as const;
const GLIDE_PRESETS = ["1", "2", "3", "4", "5", "6", "7"] as const;
const TURN_PRESETS = ["-5", "-4", "-3", "-2", "-1", "0", "1"] as const;
const FADE_PRESETS = ["0", "1", "2", "3", "4", "5"] as const;

const initialValues: FormValues = {
  discName: "",
  brand: "",
  category: "",
  speed: "",
  glide: "",
  turn: "",
  fade: "",
  stability: "",
  plastic: "",
  diameterCm: "",
  heightCm: "",
  rimDepthCm: "",
  rimThicknessCm: "",
  maxWeightGr: "",
  link: "",
  imageUrl: "",
  color: "",
  backgroundColor: "",
  notes: "",
};



type Suggestion = {
  id: string;
  label: string;
  meta?: string;
};

export function SubmitDiscForm() {
  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [draftFound, setDraftFound] = useState(false);
  const [hasLoadedDraftCheck, setHasLoadedDraftCheck] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [duplicateCheckState, setDuplicateCheckState] = useState<
    { kind: "idle" | "loading" } | { kind: "ready"; items: Suggestion[] }
  >({ kind: "idle" });

  const isSubmitting = submitState.kind === "submitting";

  useEffect(() => {
    trackEvent("submit_disc_started");
  }, []);

  useEffect(() => {
    const name = values.discName.trim();
    if (name.length < 3) {
      setDuplicateCheckState({ kind: "idle" });
      return;
    }

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        kind: "disc",
        name,
      });
      if (values.brand.trim()) params.set("brand", values.brand.trim());
      if (values.speed.trim()) params.set("speed", values.speed.trim());
      setDuplicateCheckState({ kind: "loading" });
      void fetch(`/api/submission-suggestions?${params.toString()}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) {
            return { suggestions: [] as Suggestion[] };
          }
          return (await response.json()) as { suggestions?: Suggestion[] };
        })
        .then((payload) => {
          setDuplicateCheckState({
            kind: "ready",
            items: payload.suggestions ?? [],
          });
        })
        .catch(() => {
          setDuplicateCheckState({ kind: "ready", items: [] });
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [values.discName, values.brand, values.speed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FormValues>;
      const hasContent =
        parsed && typeof parsed === "object"
          ? Object.values(parsed).some((value) => typeof value === "string" && value.trim().length > 0)
          : false;
      setDraftFound(hasContent);
    } catch {
      setDraftFound(false);
    } finally {
      setHasLoadedDraftCheck(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasContent = Object.values(values).some((value) => value.trim().length > 0);
    if (!hasContent) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [values]);

  const restoreDraft = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FormValues>;
      setValues((prev) => ({ ...prev, ...parsed }));
      setDraftFound(false);
      setStep(1);
    } catch {
      setDraftFound(false);
    }
  };

  const clearDraftStorage = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  };

  const discardDraft = () => {
    resetForm();
    setDraftFound(false);
    setSubmitState({ kind: "idle" });
  };

  const resetForm = () => {
    setValues(initialValues);
    setStep(1);
    clearDraftStorage();
  };

  const updateValue = (key: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const canGoStep2 = values.discName.trim().length > 0;
  const canGoStep3 =
    [
      values.speed,
      values.glide,
      values.turn,
      values.fade,
      values.diameterCm,
      values.heightCm,
      values.rimDepthCm,
      values.rimThicknessCm,
      values.maxWeightGr,
    ].every((value) => {
      if (!value.trim()) return true;
      return Number.isFinite(Number(value));
    }) && values.notes.length <= 3000;

  const submitDisabledReason = useMemo(() => {
    if (values.discName.trim().length === 0) return "Disc name is required.";
    if (
      [
        values.speed,
        values.glide,
        values.turn,
        values.fade,
        values.diameterCm,
        values.heightCm,
        values.rimDepthCm,
        values.rimThicknessCm,
        values.maxWeightGr,
      ].some(
        (value) => value.trim().length > 0 && !Number.isFinite(Number(value))
      )
    ) {
      return "Flight numbers and dimensions must be valid numbers.";
    }
    if (values.notes.length > 3000) return "Notes must be 3000 characters or fewer.";
    return "";
  }, [values]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitDisabledReason) {
      setSubmitState({ kind: "error", message: submitDisabledReason });
      return;
    }
    setSubmitState({ kind: "submitting" });

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value);
    }

    try {
      const token = readAuthToken();
      if (!token) {
        throw new Error("Please log in from Account before submitting a disc.");
      }

      const response = await fetch("/api/disc-submissions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const raw = await response.text();
      let payload = {} as { error?: string };
      try {
        payload = raw ? (JSON.parse(raw) as { error?: string }) : {};
      } catch {
        throw new Error(
          `Server error (${response.status}). If this persists, confirm Strapi is running and NEXT_PUBLIC_STRAPI_URL / STRAPI_URL are correct.`
        );
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not submit disc.");
      }

      setSubmitState({
        kind: "success",
        message: "Thanks! Your disc submission was received and is pending review.",
      });
      trackEvent("submit_disc_submitted", {
        hasImageUrl: Boolean(values.imageUrl.trim()),
      });
      resetForm();
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <StepPills
        steps={[1, 2, 3]}
        currentStep={step}
        onSelect={(next) => setStep(next as Step)}
        note="Autosaved locally while you type"
      />

      {hasLoadedDraftCheck && draftFound && (
        <DraftNotice onRestore={restoreDraft} onDiscard={discardDraft} />
      )}

      {step === 1 && (
        <StepSection>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="discName"
              required
              value={values.discName}
              onChange={(event) => updateValue("discName", event.target.value)}
              placeholder="Disc name *"
              className={submissionUi.input}
            />
            <input
              name="brand"
              value={values.brand}
              onChange={(event) => updateValue("brand", event.target.value)}
              placeholder="Brand"
              className={submissionUi.input}
            />
            <input
              name="category"
              value={values.category}
              onChange={(event) => updateValue("category", event.target.value)}
              placeholder="Category (Driver, Midrange, Putter)"
              className={submissionUi.input}
            />
            <input
              name="stability"
              value={values.stability}
              onChange={(event) => updateValue("stability", event.target.value)}
              placeholder="Stability"
              className={submissionUi.input}
            />
            <input
              name="plastic"
              value={values.plastic}
              onChange={(event) => updateValue("plastic", event.target.value)}
              placeholder="Plastic (e.g. Star, DX, Neutron)"
              className={submissionUi.input}
            />
          </div>

          <PresetChips
            title="Quick category presets"
            values={DISC_CATEGORIES}
            selected={values.category}
            onSelect={(value) => updateValue("category", value)}
          />
          <PresetChips
            title="Quick stability presets"
            values={STABILITY_PRESETS}
            selected={values.stability}
            onSelect={(value) => updateValue("stability", value)}
          />
        </StepSection>
      )}

      {step === 2 && (
        <StepSection>
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              name="speed"
              value={values.speed}
              onChange={(event) => updateValue("speed", event.target.value)}
              placeholder="Speed"
              className={submissionUi.input}
            />
            <input
              name="glide"
              value={values.glide}
              onChange={(event) => updateValue("glide", event.target.value)}
              placeholder="Glide"
              className={submissionUi.input}
            />
            <input
              name="turn"
              value={values.turn}
              onChange={(event) => updateValue("turn", event.target.value)}
              placeholder="Turn"
              className={submissionUi.input}
            />
            <input
              name="fade"
              value={values.fade}
              onChange={(event) => updateValue("fade", event.target.value)}
              placeholder="Fade"
              className={submissionUi.input}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            <input
              name="diameterCm"
              value={values.diameterCm}
              onChange={(event) => updateValue("diameterCm", event.target.value)}
              placeholder="Diameter (cm)"
              className={submissionUi.input}
            />
            <input
              name="heightCm"
              value={values.heightCm}
              onChange={(event) => updateValue("heightCm", event.target.value)}
              placeholder="Height (cm)"
              className={submissionUi.input}
            />
            <input
              name="rimDepthCm"
              value={values.rimDepthCm}
              onChange={(event) => updateValue("rimDepthCm", event.target.value)}
              placeholder="Rim depth (cm)"
              className={submissionUi.input}
            />
            <input
              name="rimThicknessCm"
              value={values.rimThicknessCm}
              onChange={(event) => updateValue("rimThicknessCm", event.target.value)}
              placeholder="Rim thickness (cm)"
              className={submissionUi.input}
            />
            <input
              name="maxWeightGr"
              value={values.maxWeightGr}
              onChange={(event) => updateValue("maxWeightGr", event.target.value)}
              placeholder="Max weight (g)"
              className={submissionUi.input}
            />
          </div>
          <p className={submissionUi.helperText}>
            Leave dimension fields blank if unknown - mold defaults will apply when available.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <PresetChips
              title="Speed presets"
              values={SPEED_PRESETS}
              selected={values.speed}
              onSelect={(value) => updateValue("speed", value)}
            />
            <PresetChips
              title="Glide presets"
              values={GLIDE_PRESETS}
              selected={values.glide}
              onSelect={(value) => updateValue("glide", value)}
            />
            <PresetChips
              title="Turn presets"
              values={TURN_PRESETS}
              selected={values.turn}
              onSelect={(value) => updateValue("turn", value)}
            />
            <PresetChips
              title="Fade presets"
              values={FADE_PRESETS}
              selected={values.fade}
              onSelect={(value) => updateValue("fade", value)}
            />
          </div>

          <input
            name="link"
            value={values.link}
            onChange={(event) => updateValue("link", event.target.value)}
            placeholder="Product URL (optional)"
            className={submissionUi.inputFull}
          />

          <ImageUploadField
            name="imageUrl"
            label="Disc photo (optional)"
            defaultUrl={values.imageUrl}
            onChange={(next) => updateValue("imageUrl", next)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="color"
              value={values.color}
              onChange={(event) => updateValue("color", event.target.value)}
              placeholder="Color (optional)"
              className={submissionUi.input}
            />
            <input
              name="backgroundColor"
              value={values.backgroundColor}
              onChange={(event) => updateValue("backgroundColor", event.target.value)}
              placeholder="Background color (optional)"
              className={submissionUi.input}
            />
          </div>

          <textarea
            name="notes"
            rows={5}
            value={values.notes}
            onChange={(event) => updateValue("notes", event.target.value)}
            placeholder="Notes for moderation (optional)"
            className={submissionUi.textarea}
          />
          <p className={submissionUi.helperText}>{values.notes.length} / 3000 max</p>
        </StepSection>
      )}

      {step === 3 && (
        <div className={submissionUi.reviewCard}>
          <h3 className="text-sm font-semibold text-slate-900">Review before submit</h3>
          {duplicateCheckState.kind === "loading" && (
            <p className="text-xs text-amber-700">Checking for possible existing discs...</p>
          )}
          {duplicateCheckState.kind === "ready" && duplicateCheckState.items.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Possible duplicates</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {duplicateCheckState.items.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    {item.label}
                    {item.meta ? ` (${item.meta})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Disc</dt>
              <dd>{values.discName || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Brand / Category</dt>
              <dd>{[values.brand, values.category].filter(Boolean).join(" / ") || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Flight</dt>
              <dd>{[values.speed, values.glide, values.turn, values.fade].filter(Boolean).join(" | ") || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Dimensions</dt>
              <dd>
                {[
                  values.diameterCm ? `D ${values.diameterCm}cm` : "",
                  values.heightCm ? `H ${values.heightCm}cm` : "",
                  values.rimDepthCm ? `RD ${values.rimDepthCm}cm` : "",
                  values.rimThicknessCm ? `RT ${values.rimThicknessCm}cm` : "",
                  values.maxWeightGr ? `MW ${values.maxWeightGr}g` : "",
                ]
                  .filter(Boolean)
                  .join(" | ") || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Stability</dt>
              <dd>{values.stability || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Plastic</dt>
              <dd>{values.plastic || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Photo</dt>
              <dd>{values.imageUrl.trim() ? "Attached" : "None"}</dd>
            </div>
          </dl>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{values.notes || "-"}</p>
          </div>
        </div>
      )}

      <SubmissionActionRow>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)))}
              className={submissionUi.secondaryButton}
            >
              ← Back
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev === 3 ? 3 : ((prev + 1) as Step)))}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
              className={submissionUi.primaryButton}
            >
              Continue →
            </button>
          )}

          {step === 3 && (
            <button
              type="submit"
              disabled={isSubmitting || Boolean(submitDisabledReason)}
              className={submissionUi.primaryButton}
            >
              {isSubmitting ? "Submitting..." : "Submit disc"}
            </button>
          )}
        </div>
      </SubmissionActionRow>

      {step === 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={discardDraft}
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Clear draft
          </button>
        </div>
      )}

      {submitState.kind === "success" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-800">{submitState.message}</p>
          <Link href="/discs" className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-800">
            Browse discs
          </Link>
          <button
            type="button"
            onClick={() => setSubmitState({ kind: "idle" })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
          >
            Add another
          </button>
        </div>
      )}
      {submitState.kind === "error" && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {submitState.message}
        </p>
      )}
    </form>
  );
}
