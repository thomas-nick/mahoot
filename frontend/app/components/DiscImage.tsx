"use client";

import { useMemo, useState } from "react";

export function DiscImage({
  src,
  alt,
  className,
  fallbackLabel,
  loading = "lazy",
}: {
  src: string | null | undefined;
  alt: string;
  className: string;
  fallbackLabel: string;
  loading?: "lazy" | "eager";
}) {
  const normalized = useMemo(() => (src ?? "").trim(), [src]);
  const [failed, setFailed] = useState(false);

  if (!normalized || failed) {
    return (
      <div className={`flex items-center justify-center text-slate-400 ${className}`}>
        <span className="text-xs uppercase tracking-wide">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={normalized}
        alt={alt}
        className={className}
        loading={loading}
        onError={() => setFailed(true)}
      />
    </>
  );
}
