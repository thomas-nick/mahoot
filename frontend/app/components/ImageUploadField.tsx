"use client";

import { useEffect, useRef, useState } from "react";
import { readAuthToken } from "@/lib/auth";
import { Button, Field, Input, Notice } from "@/app/components/ui";

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; pct: number }
  | { kind: "ready"; url: string; name?: string }
  | { kind: "error"; message: string };

type Props = {
  /** Field name to ship in the parent form (we render a hidden input). */
  name: string;
  /** Initial URL (from a draft, an existing record, etc.). */
  defaultUrl?: string | null;
  /** Optional label override. */
  label?: string;
  /** Allow showing a fallback URL field (default true). Hides when uploaded. */
  allowUrlFallback?: boolean;
  /** Called whenever the resolved URL changes (upload, paste, clear). */
  onChange?: (url: string) => void;
};

export function ImageUploadField({
  name,
  defaultUrl,
  label = "Image",
  allowUrlFallback = true,
  onChange,
}: Props) {
  const [url, setUrl] = useState((defaultUrl ?? "").trim());
  const [status, setStatus] = useState<Status>(
    defaultUrl ? { kind: "ready", url: defaultUrl } : { kind: "idle" },
  );
  const [previewBroken, setPreviewBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange?.(url);
  }, [url, onChange]);

  useEffect(() => {
    setPreviewBroken(false);
  }, [url]);

  const triggerPicker = () => {
    if (status.kind === "uploading") return;
    fileInputRef.current?.click();
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "Only image files are accepted." });
      return;
    }

    const token = readAuthToken();
    if (!token) {
      setStatus({
        kind: "error",
        message: "Please log in to upload images. You can still paste a URL below.",
      });
      return;
    }

    setStatus({ kind: "uploading", pct: 0 });
    const formData = new FormData();
    formData.append("file", file, file.name);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Upload failed.");
      }
      setUrl(payload.url);
      setStatus({ kind: "ready", url: payload.url, name: file.name });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  };

  const clear = () => {
    setUrl("");
    setStatus({ kind: "idle" });
  };

  const previewSrc = url.startsWith("http://") || url.startsWith("https://") ? url : "";

  return (
    <div className="space-y-2">
      <Field label={label} hint="JPG, PNG, or WebP up to 8 MB. Or paste a URL.">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <input type="hidden" name={name} value={url} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={triggerPicker}
            disabled={status.kind === "uploading"}
          >
            {status.kind === "uploading" ? "Uploading…" : url ? "Replace photo" : "Choose photo"}
          </Button>
          {url ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              Remove
            </Button>
          ) : null}
          {status.kind === "ready" && status.name ? (
            <span className="text-xs text-slate-500">{status.name}</span>
          ) : null}
        </div>
      </Field>

      {allowUrlFallback ? (
        <Field label="…or image URL" htmlFor={`${name}-url`}>
          <Input
            id={`${name}-url`}
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setStatus(event.target.value ? { kind: "ready", url: event.target.value } : { kind: "idle" });
            }}
          />
        </Field>
      ) : null}

      {previewSrc ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Preview"
            className="h-40 w-full object-cover"
            onError={() => setPreviewBroken(true)}
          />
          {previewBroken ? (
            <p className="px-3 py-2 text-xs text-rose-700">
              Preview failed to load. The URL may be invalid.
            </p>
          ) : null}
        </div>
      ) : null}

      {status.kind === "error" ? <Notice variant="error">{status.message}</Notice> : null}
    </div>
  );
}
