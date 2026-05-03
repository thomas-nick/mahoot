"use client";

import { useState } from "react";

type Props = {
  photos: string[];
  alt: string;
};

export function Gallery({ photos, alt }: Props) {
  const [active, setActive] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        No photos yet
      </div>
    );
  }
  const current = photos[Math.min(active, photos.length - 1)];
  return (
    <div className="space-y-3">
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={alt} className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(idx)}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                idx === active ? "border-slate-900" : "border-slate-200 hover:border-slate-300"
              }`}
              aria-label={`Photo ${idx + 1} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
