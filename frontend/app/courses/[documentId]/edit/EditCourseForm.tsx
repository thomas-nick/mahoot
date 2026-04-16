"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import type { Course, CourseHole, CourseLayout } from "@/lib/strapi";
import { readAuthToken } from "@/lib/auth";

const DIFFICULTIES = ["", "championship", "advanced", "intermediate", "easy"] as const;
const COURSE_TYPES = ["", "championship", "wooded", "park style", "pitch and putt"] as const;

type EditCourseFormProps = {
  course: Course;
};

type EditableHole = {
  holeNumber: string;
  par: string;
  distanceFt: string;
  distanceM: string;
  notes: string;
};

type EditableLayout = {
  name: string;
  holes: string;
  parTotal: string;
  distanceFtTotal: string;
  distanceMTotal: string;
  notes: string;
  holeDetails: EditableHole[];
};

const toNumberString = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const normalizeHole = (hole: CourseHole | null | undefined): EditableHole => ({
  holeNumber: toNumberString(hole?.holeNumber),
  par: toNumberString(hole?.par),
  distanceFt: toNumberString(hole?.distanceFt),
  distanceM: toNumberString(hole?.distanceM),
  notes: hole?.notes ?? "",
});

const blankHole = (): EditableHole => ({
  holeNumber: "",
  par: "",
  distanceFt: "",
  distanceM: "",
  notes: "",
});

const normalizeLayout = (layout: CourseLayout | null | undefined): EditableLayout => ({
  name: layout?.name ?? "",
  holes: toNumberString(layout?.holes),
  parTotal: toNumberString(layout?.parTotal),
  distanceFtTotal: toNumberString(layout?.distanceFtTotal),
  distanceMTotal: toNumberString(layout?.distanceMTotal),
  notes: layout?.notes ?? "",
  holeDetails: Array.isArray(layout?.holeDetails) ? layout.holeDetails.map((hole) => normalizeHole(hole)) : [],
});

const blankLayout = (): EditableLayout => ({
  name: "",
  holes: "",
  parTotal: "",
  distanceFtTotal: "",
  distanceMTotal: "",
  notes: "",
  holeDetails: [],
});

const buildSequentialHoles = (count: number): EditableHole[] =>
  Array.from({ length: count }, (_, index) => ({
    ...blankHole(),
    holeNumber: String(index + 1),
  }));

const toOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const hasHoleContent = (hole: EditableHole) =>
  Boolean(
    hole.holeNumber.trim() ||
      hole.par.trim() ||
      hole.distanceFt.trim() ||
      hole.distanceM.trim() ||
      hole.notes.trim()
  );

const serializeLayouts = (layouts: EditableLayout[]) => {
  const serialized = layouts
    .map((layout) => {
      const holeDetails = layout.holeDetails
        .filter(hasHoleContent)
        .map((hole) => ({
          ...(toOptionalNumber(hole.holeNumber) !== undefined ? { holeNumber: toOptionalNumber(hole.holeNumber) } : {}),
          ...(toOptionalNumber(hole.par) !== undefined ? { par: toOptionalNumber(hole.par) } : {}),
          ...(toOptionalNumber(hole.distanceFt) !== undefined ? { distanceFt: toOptionalNumber(hole.distanceFt) } : {}),
          ...(toOptionalNumber(hole.distanceM) !== undefined ? { distanceM: toOptionalNumber(hole.distanceM) } : {}),
          ...(hole.notes.trim() ? { notes: hole.notes.trim() } : {}),
        }));

      const next: Record<string, unknown> = {
        ...(layout.name.trim() ? { name: layout.name.trim() } : {}),
        ...(toOptionalNumber(layout.holes) !== undefined ? { holes: toOptionalNumber(layout.holes) } : {}),
        ...(toOptionalNumber(layout.parTotal) !== undefined ? { parTotal: toOptionalNumber(layout.parTotal) } : {}),
        ...(toOptionalNumber(layout.distanceFtTotal) !== undefined
          ? { distanceFtTotal: toOptionalNumber(layout.distanceFtTotal) }
          : {}),
        ...(toOptionalNumber(layout.distanceMTotal) !== undefined
          ? { distanceMTotal: toOptionalNumber(layout.distanceMTotal) }
          : {}),
        ...(layout.notes.trim() ? { notes: layout.notes.trim() } : {}),
      };

      if (holeDetails.length > 0) {
        next.holeDetails = holeDetails;
      }

      return next;
    })
    .filter((layout) => Object.keys(layout).length > 0);

  return serialized.length > 0 ? serialized : null;
};

export function EditCourseForm({ course }: EditCourseFormProps) {
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "success" | "error"; message?: string }>({
    kind: "idle",
  });
  const [layouts, setLayouts] = useState<EditableLayout[]>(
    Array.isArray(course.layouts) ? course.layouts.map((layout) => normalizeLayout(layout)) : []
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const layoutsRef = useRef<HTMLDivElement | null>(null);
  const [highlightLayouts, setHighlightLayouts] = useState(false);

  useEffect(() => {
    if (searchParams.get("focus") !== "layouts") {
      return;
    }
    const node = layoutsRef.current;
    if (!node) {
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.focus({ preventScroll: true });
    setHighlightLayouts(true);
    const timeout = window.setTimeout(() => setHighlightLayouts(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ kind: "saving" });
    const token = readAuthToken();

    if (!token) {
      setStatus({ kind: "error", message: "Please log in from Account first." });
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      country: String(form.get("country") ?? ""),
      latitude: String(form.get("latitude") ?? ""),
      longitude: String(form.get("longitude") ?? ""),
      difficulty: String(form.get("difficulty") ?? ""),
      type: String(form.get("type") ?? ""),
      pros: String(form.get("pros") ?? ""),
      cons: String(form.get("cons") ?? ""),
      description: String(form.get("description") ?? ""),
      videoLinks: String(form.get("videoLinks") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      layouts: serializeLayouts(layouts),
    };

    try {
      const response = await fetch(`/api/courses/${course.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update course.");
      }

      setStatus({ kind: "success", message: "Course updated successfully." });
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="city"
          defaultValue={course.city ?? ""}
          placeholder="City"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="state"
          defaultValue={course.state ?? ""}
          placeholder="State / Province"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="country"
          defaultValue={course.country ?? ""}
          placeholder="Country"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="latitude"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={course.latitude ?? ""}
          placeholder="Latitude (e.g. 28.553)"
          title={"Accepts decimal or DMS (e.g. 13°37'19.8\"N)"}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="longitude"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={course.longitude ?? ""}
          placeholder="Longitude (e.g. -81.379)"
          title={"Accepts decimal or DMS (e.g. 100°46'45.9\"E)"}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="difficulty"
          defaultValue={course.difficulty ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          {DIFFICULTIES.map((value) => (
            <option key={`difficulty-${value || "none"}`} value={value}>
              {value ? value : "No difficulty"}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={course.type ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          {COURSE_TYPES.map((value) => (
            <option key={`type-${value || "none"}`} value={value}>
              {value ? value : "No type"}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="pros"
        rows={3}
        defaultValue={course.pros ?? ""}
        placeholder="Pros"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <textarea
        name="cons"
        rows={3}
        defaultValue={course.cons ?? ""}
        placeholder="Cons"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <textarea
        name="description"
        rows={8}
        defaultValue={course.description ?? ""}
        placeholder="Description"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <textarea
        name="videoLinks"
        rows={3}
        defaultValue={(course.videoLinks ?? []).join("\n")}
        placeholder="Video links (one per line)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />

      <div
        ref={layoutsRef}
        className={`space-y-3 rounded-xl border p-3 transition-colors ${
          highlightLayouts ? "border-amber-400 bg-amber-50" : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Layouts & Holes</h3>
          <button
            type="button"
            onClick={() => setLayouts((prev) => [...prev, blankLayout()])}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
          >
            Add layout
          </button>
        </div>

        {layouts.length === 0 ? (
          <p className="text-xs text-slate-500">No layouts yet. Add a layout to start entering hole data.</p>
        ) : (
          <div className="space-y-3">
            {layouts.map((layout, layoutIndex) => (
              <article key={`layout-${layoutIndex}`} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">Layout {layoutIndex + 1}</p>
                  <button
                    type="button"
                    onClick={() => setLayouts((prev) => prev.filter((_, idx) => idx !== layoutIndex))}
                    className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:border-rose-300"
                  >
                    Remove layout
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <input
                    value={layout.name}
                    onChange={(event) =>
                      setLayouts((prev) =>
                        prev.map((item, idx) =>
                          idx === layoutIndex ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Layout name (e.g. Blue Tees)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                  />
                  <input
                    value={layout.holes}
                    onChange={(event) =>
                      setLayouts((prev) =>
                        prev.map((item, idx) =>
                          idx === layoutIndex ? { ...item, holes: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Holes"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                  />
                  <input
                    value={layout.parTotal}
                    onChange={(event) =>
                      setLayouts((prev) =>
                        prev.map((item, idx) =>
                          idx === layoutIndex ? { ...item, parTotal: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Par total"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                  />
                  <input
                    value={layout.distanceFtTotal}
                    onChange={(event) =>
                      setLayouts((prev) =>
                        prev.map((item, idx) =>
                          idx === layoutIndex ? { ...item, distanceFtTotal: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Distance total (ft)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                  />
                  <input
                    value={layout.distanceMTotal}
                    onChange={(event) =>
                      setLayouts((prev) =>
                        prev.map((item, idx) =>
                          idx === layoutIndex ? { ...item, distanceMTotal: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Distance total (m)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                  />
                </div>
                <textarea
                  rows={2}
                  value={layout.notes}
                  onChange={(event) =>
                    setLayouts((prev) =>
                      prev.map((item, idx) =>
                        idx === layoutIndex ? { ...item, notes: event.target.value } : item
                      )
                    )
                  }
                  placeholder="Layout notes (optional)"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                />

                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hole details</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLayouts((prev) =>
                            prev.map((item, idx) =>
                              idx === layoutIndex
                                ? {
                                    ...item,
                                    holeDetails: item.holeDetails.length > 0 ? item.holeDetails : buildSequentialHoles(9),
                                    holes: item.holes.trim() ? item.holes : "9",
                                  }
                                : item
                            )
                          )
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-slate-400"
                      >
                        Auto-fill 1-9
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLayouts((prev) =>
                            prev.map((item, idx) =>
                              idx === layoutIndex
                                ? {
                                    ...item,
                                    holeDetails:
                                      item.holeDetails.length > 0 ? item.holeDetails : buildSequentialHoles(18),
                                    holes: item.holes.trim() ? item.holes : "18",
                                  }
                                : item
                            )
                          )
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-slate-400"
                      >
                        Auto-fill 1-18
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLayouts((prev) =>
                            prev.map((item, idx) =>
                              idx === layoutIndex
                                ? { ...item, holeDetails: [...item.holeDetails, blankHole()] }
                                : item
                            )
                          )
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-slate-400"
                      >
                        Add hole
                      </button>
                    </div>
                  </div>
                  {layout.holeDetails.length === 0 ? (
                    <p className="text-xs text-slate-500">No holes added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {layout.holeDetails.map((hole, holeIndex) => (
                        <div key={`hole-${holeIndex}`} className="rounded-lg border border-slate-200 p-2">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            <input
                              value={hole.holeNumber}
                              onChange={(event) =>
                                setLayouts((prev) =>
                                  prev.map((layoutItem, lIdx) =>
                                    lIdx !== layoutIndex
                                      ? layoutItem
                                      : {
                                          ...layoutItem,
                                          holeDetails: layoutItem.holeDetails.map((holeItem, hIdx) =>
                                            hIdx === holeIndex
                                              ? { ...holeItem, holeNumber: event.target.value }
                                              : holeItem
                                          ),
                                        }
                                  )
                                )
                              }
                              placeholder="Hole #"
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                            />
                            <input
                              value={hole.par}
                              onChange={(event) =>
                                setLayouts((prev) =>
                                  prev.map((layoutItem, lIdx) =>
                                    lIdx !== layoutIndex
                                      ? layoutItem
                                      : {
                                          ...layoutItem,
                                          holeDetails: layoutItem.holeDetails.map((holeItem, hIdx) =>
                                            hIdx === holeIndex ? { ...holeItem, par: event.target.value } : holeItem
                                          ),
                                        }
                                  )
                                )
                              }
                              placeholder="Par"
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                            />
                            <input
                              value={hole.distanceFt}
                              onChange={(event) =>
                                setLayouts((prev) =>
                                  prev.map((layoutItem, lIdx) =>
                                    lIdx !== layoutIndex
                                      ? layoutItem
                                      : {
                                          ...layoutItem,
                                          holeDetails: layoutItem.holeDetails.map((holeItem, hIdx) =>
                                            hIdx === holeIndex
                                              ? { ...holeItem, distanceFt: event.target.value }
                                              : holeItem
                                          ),
                                        }
                                  )
                                )
                              }
                              placeholder="Distance ft"
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                            />
                            <input
                              value={hole.distanceM}
                              onChange={(event) =>
                                setLayouts((prev) =>
                                  prev.map((layoutItem, lIdx) =>
                                    lIdx !== layoutIndex
                                      ? layoutItem
                                      : {
                                          ...layoutItem,
                                          holeDetails: layoutItem.holeDetails.map((holeItem, hIdx) =>
                                            hIdx === holeIndex
                                              ? { ...holeItem, distanceM: event.target.value }
                                              : holeItem
                                          ),
                                        }
                                  )
                                )
                              }
                              placeholder="Distance m"
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setLayouts((prev) =>
                                  prev.map((layoutItem, lIdx) =>
                                    lIdx !== layoutIndex
                                      ? layoutItem
                                      : {
                                          ...layoutItem,
                                          holeDetails: layoutItem.holeDetails.filter((_, hIdx) => hIdx !== holeIndex),
                                        }
                                  )
                                )
                              }
                              className="rounded-lg border border-rose-200 px-2 py-1.5 text-xs text-rose-700 hover:border-rose-300"
                            >
                              Remove hole
                            </button>
                          </div>
                          <input
                            value={hole.notes}
                            onChange={(event) =>
                              setLayouts((prev) =>
                                prev.map((layoutItem, lIdx) =>
                                  lIdx !== layoutIndex
                                    ? layoutItem
                                    : {
                                        ...layoutItem,
                                        holeDetails: layoutItem.holeDetails.map((holeItem, hIdx) =>
                                          hIdx === holeIndex ? { ...holeItem, notes: event.target.value } : holeItem
                                        ),
                                      }
                                )
                              )
                            }
                            placeholder="Hole notes (optional)"
                            className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {status.kind === "saving" ? "Saving..." : "Save changes"}
        </button>
        {status.kind === "success" && <p className="text-sm text-emerald-700">{status.message}</p>}
        {status.kind === "error" && <p className="text-sm text-rose-700">{status.message}</p>}
      </div>
    </form>
  );
}
