"use client";

import { useRef, useState } from "react";
import { readAuthToken } from "@/lib/auth";
import { Notice } from "@/app/components/ui";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Maximum number of photos. Defaults to 6. */
  max?: number;
};

const PlusIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const StarIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
    <path d="M12 2 14.6 8.6 21.6 9 16.3 13.5 18 20l-6-3.6L6 20l1.7-6.5L2.4 9l7-.4L12 2z" />
  </svg>
);
const TrashIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const reorder = (urls: string[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0 || from >= urls.length || to >= urls.length) return urls;
  const next = [...urls];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export function PhotosField({ value, onChange, max = 6 }: Props) {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerPicker = () => {
    if (uploading || value.length >= max) return;
    fileInputRef.current?.click();
  };

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const token = readAuthToken();
    if (!token) {
      setError("Please log in to upload images.");
      return;
    }
    setError("");
    setUploading(true);
    const slotsLeft = Math.max(0, max - value.length);
    const accepted = files.slice(0, slotsLeft);
    const collected: string[] = [];
    try {
      for (const file of accepted) {
        if (!file.type.startsWith("image/")) continue;
        const formData = new FormData();
        formData.append("file", file, file.name);
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? `Upload failed (${response.status}).`);
        }
        collected.push(payload.url);
      }
      if (collected.length > 0) {
        onChange([...value, ...collected].slice(0, max));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };
  const moveTo = (from: number, to: number) => {
    onChange(reorder(value, from, to));
  };
  const setCover = (index: number) => moveTo(index, 0);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveTo(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`group relative aspect-square overflow-hidden rounded-xl border bg-slate-100 ${
              index === 0 ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"
            } ${dragIndex === index ? "opacity-60" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
            {index === 0 ? (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                <StarIcon /> Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setCover(index)}
                title="Make cover"
                className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 opacity-0 shadow-sm transition group-hover:opacity-100"
              >
                <StarIcon /> Make cover
              </button>
            )}
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 opacity-0 transition group-hover:opacity-100">
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveTo(index, index - 1)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-white disabled:opacity-50"
                  aria-label="Move left"
                >
                  <ArrowLeftIcon />
                </button>
                <button
                  type="button"
                  disabled={index === value.length - 1}
                  onClick={() => moveTo(index, index + 1)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-white disabled:opacity-50"
                  aria-label="Move right"
                >
                  <ArrowRightIcon />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm hover:bg-white"
                aria-label="Remove photo"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}

        {value.length < max ? (
          <button
            type="button"
            onClick={triggerPicker}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:bg-white disabled:opacity-60"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              {uploading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              ) : (
                <PlusIcon />
              )}
            </span>
            {uploading ? "Uploading…" : value.length === 0 ? "Add photos" : "Add more"}
          </button>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Up to {max} photos. The first one is the cover. Drag tiles to reorder, or use the arrows.
      </p>
      {error ? <Notice variant="error">{error}</Notice> : null}
    </div>
  );
}
