"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readAuthToken } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  DraftNotice,
  StepPills,
  StepSection,
  SubmissionActionRow,
  submissionUi,
} from "@/app/components/submission-ui";

const DIFFICULTIES = ["championship", "advanced", "intermediate", "easy"] as const;
const COURSE_TYPES = ["championship", "wooded", "park style", "pitch and putt"] as const;

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 3;
const DRAFT_KEY = "course-submission-draft-v1";

type Step = 1 | 2 | 3;

type FormValues = {
  courseName: string;
  country: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  difficulty: string;
  courseType: string;
  pros: string;
  cons: string;
  description: string;
  videoLinks: string;
  layoutsJson: string;
};

type Suggestion = {
  id: string;
  label: string;
  meta?: string;
};

const initialValues: FormValues = {
  courseName: "",
  country: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
  difficulty: "",
  courseType: "",
  pros: "",
  cons: "",
  description: "",
  videoLinks: "",
  layoutsJson: "",
};

export function SubmitCourseForm() {
  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [draftFound, setDraftFound] = useState(false);
  const [hasLoadedDraftCheck, setHasLoadedDraftCheck] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [duplicateCheckState, setDuplicateCheckState] = useState<
    { kind: "idle" | "loading" } | { kind: "ready"; items: Suggestion[] }
  >({ kind: "idle" });

  const isSubmitting = submitState.kind === "submitting";
  const descriptionCount = useMemo(() => values.description.trim().length, [values.description]);

  useEffect(() => {
    trackEvent("submit_course_started");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FormValues>;
      if (parsed && typeof parsed === "object") {
        const hasContent = Object.values(parsed).some((value) => typeof value === "string" && value.trim().length > 0);
        setDraftFound(hasContent);
      }
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

  useEffect(() => {
    const name = values.courseName.trim();
    if (name.length < 3) {
      setDuplicateCheckState({ kind: "idle" });
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        kind: "course",
        name,
      });
      if (values.city.trim()) params.set("city", values.city.trim());
      if (values.state.trim()) params.set("state", values.state.trim());
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
  }, [values.courseName, values.city, values.state]);

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

  const discardDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
    setDraftFound(false);
  };

  const updateValue = (key: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const canGoStep2 = values.courseName.trim().length > 0;
  const canGoStep3 = values.description.trim().length >= 80;

  const submitDisabledReason = useMemo(() => {
    if (values.courseName.trim().length === 0) return "Course name is required.";
    if (values.description.trim().length < 80) return "Description must be at least 80 characters.";
    return "";
  }, [values.courseName, values.description]);

  const resetForm = () => {
    setValues(initialValues);
    setPhotos([]);
    setVideos([]);
    setStep(1);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitDisabledReason) {
      setSubmitState({ kind: "error", message: submitDisabledReason });
      return;
    }
    setSubmitState({ kind: "submitting" });

    const formData = new FormData();
    formData.set("courseName", values.courseName);
    formData.set("country", values.country);
    formData.set("city", values.city);
    formData.set("state", values.state);
    formData.set("latitude", values.latitude);
    formData.set("longitude", values.longitude);
    formData.set("difficulty", values.difficulty);
    formData.set("courseType", values.courseType);
    formData.set("pros", values.pros);
    formData.set("cons", values.cons);
    formData.set("description", values.description);
    formData.set("videoLinks", values.videoLinks);
    formData.set("layoutsJson", values.layoutsJson);

    for (const file of photos) {
      formData.append("photos", file);
    }
    for (const file of videos) {
      formData.append("videos", file);
    }

    try {
      const token = readAuthToken();
      if (!token) {
        throw new Error("Please log in from Account before submitting a course.");
      }

      const response = await fetch("/api/course-submissions", {
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
        throw new Error(payload.error ?? "Could not submit course.");
      }

      setSubmitState({
        kind: "success",
        message: "Thanks! Your submission was received and is pending review.",
      });
      trackEvent("submit_course_submitted", {
        photoCount: photos.length,
        videoCount: videos.length,
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
              name="courseName"
              required
              value={values.courseName}
              onChange={(event) => updateValue("courseName", event.target.value)}
              placeholder="Course name *"
              className={submissionUi.input}
            />
            <input
              name="country"
              value={values.country}
              onChange={(event) => updateValue("country", event.target.value)}
              placeholder="Country"
              className={submissionUi.input}
            />
            <input
              name="city"
              value={values.city}
              onChange={(event) => updateValue("city", event.target.value)}
              placeholder="City"
              className={submissionUi.input}
            />
            <input
              name="state"
              value={values.state}
              onChange={(event) => updateValue("state", event.target.value)}
              placeholder="State / Province"
              className={submissionUi.input}
            />
            <input
              name="latitude"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values.latitude}
              onChange={(event) => updateValue("latitude", event.target.value)}
              placeholder="Latitude (e.g. 28.553)"
              title={"Accepts decimal or DMS (e.g. 13°37'19.8\"N)"}
              className={submissionUi.input}
            />
            <input
              name="longitude"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values.longitude}
              onChange={(event) => updateValue("longitude", event.target.value)}
              placeholder="Longitude (e.g. -81.379)"
              title={"Accepts decimal or DMS (e.g. 100°46'45.9\"E)"}
              className={submissionUi.input}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="difficulty"
              value={values.difficulty}
              onChange={(event) => updateValue("difficulty", event.target.value)}
              className={submissionUi.input}
            >
              <option value="">Select difficulty</option>
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              name="courseType"
              value={values.courseType}
              onChange={(event) => updateValue("courseType", event.target.value)}
              className={submissionUi.input}
            >
              <option value="">Select type</option>
              {COURSE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </StepSection>
      )}

      {step === 2 && (
        <StepSection>
          <textarea
            name="pros"
            rows={3}
            value={values.pros}
            onChange={(event) => updateValue("pros", event.target.value)}
            placeholder="Quick pros (what you like)"
            className={submissionUi.textarea}
          />
          <textarea
            name="cons"
            rows={3}
            value={values.cons}
            onChange={(event) => updateValue("cons", event.target.value)}
            placeholder="Quick cons (what could improve)"
            className={submissionUi.textarea}
          />

          <textarea
            name="description"
            required
            rows={8}
            value={values.description}
            onChange={(event) => updateValue("description", event.target.value)}
            placeholder="Detailed description * (minimum 80 characters)"
            className={submissionUi.textarea}
          />
          <p className="text-xs text-slate-500">{descriptionCount} / 80 minimum</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Photos (max {MAX_PHOTOS})</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS))}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:text-white"
              />
              {photos.length > 0 && <p className="text-xs text-slate-500">{photos.length} photo file(s) selected</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Videos (max {MAX_VIDEOS})</label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(event) => setVideos(Array.from(event.target.files ?? []).slice(0, MAX_VIDEOS))}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:text-white"
              />
              {videos.length > 0 && <p className="text-xs text-slate-500">{videos.length} video file(s) selected</p>}
            </div>
          </div>

          <textarea
            name="videoLinks"
            rows={3}
            value={values.videoLinks}
            onChange={(event) => updateValue("videoLinks", event.target.value)}
            placeholder="Optional video links, one URL per line"
            className={submissionUi.textarea}
          />
          <textarea
            name="layoutsJson"
            rows={8}
            value={values.layoutsJson}
            onChange={(event) => updateValue("layoutsJson", event.target.value)}
            placeholder='Optional layouts JSON (example: [{"name":"Blue Tees","holes":18,"holeDetails":[{"holeNumber":1,"par":3,"distanceFt":325}]}])'
            className={submissionUi.textarea}
          />
          <p className="text-xs text-slate-500">
            Optional. Paste valid JSON array to add layouts/hole data for this course.
          </p>
        </StepSection>
      )}

      {step === 3 && (
        <div className={submissionUi.reviewCard}>
          <h3 className="text-sm font-semibold text-slate-900">Review before submit</h3>
          {duplicateCheckState.kind === "loading" && (
            <p className="text-xs text-amber-700">Checking for possible existing courses...</p>
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
              <dt className="text-xs uppercase tracking-wide text-slate-500">Course</dt>
              <dd>{values.courseName || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Location</dt>
              <dd>{[values.city, values.state, values.country].filter(Boolean).join(", ") || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Difficulty</dt>
              <dd>{values.difficulty || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Coordinates</dt>
              <dd>
                {values.latitude || values.longitude
                  ? `${values.latitude || "-"}, ${values.longitude || "-"}`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
              <dd>{values.courseType || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Photos</dt>
              <dd>{photos.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Videos</dt>
              <dd>{videos.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Layouts JSON</dt>
              <dd>{values.layoutsJson.trim() ? "Provided" : "Not provided"}</dd>
            </div>
          </dl>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{values.description || "-"}</p>
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
              {isSubmitting ? "Submitting..." : "Submit course"}
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
          <Link href="/courses" className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-800">
            Browse courses
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
