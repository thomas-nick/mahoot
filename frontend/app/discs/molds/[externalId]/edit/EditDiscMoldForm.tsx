"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscMold } from "@/lib/strapi";
import { readAuthToken } from "@/lib/auth";

type EditDiscMoldFormProps = {
  mold: DiscMold;
};

const toStringValue = (value: number | string | null | undefined) => (value == null ? "" : String(value));

export function EditDiscMoldForm({ mold }: EditDiscMoldFormProps) {
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "success" | "error"; message?: string }>({
    kind: "idle",
  });
  const router = useRouter();

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
      name: String(form.get("name") ?? ""),
      brand: String(form.get("brand") ?? ""),
      category: String(form.get("category") ?? ""),
      speed: String(form.get("speed") ?? ""),
      glide: String(form.get("glide") ?? ""),
      turn: String(form.get("turn") ?? ""),
      fade: String(form.get("fade") ?? ""),
      stability: String(form.get("stability") ?? ""),
      diameterCm: String(form.get("diameterCm") ?? ""),
      heightCm: String(form.get("heightCm") ?? ""),
      rimDepthCm: String(form.get("rimDepthCm") ?? ""),
      rimThicknessCm: String(form.get("rimThicknessCm") ?? ""),
      maxWeightGr: String(form.get("maxWeightGr") ?? ""),
      color: String(form.get("color") ?? ""),
      backgroundColor: String(form.get("backgroundColor") ?? ""),
    };

    try {
      const response = await fetch(`/api/disc-molds/${mold.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update disc mold.");
      }

      setStatus({ kind: "success", message: "Disc mold updated successfully." });
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
          name="name"
          defaultValue={mold.name}
          placeholder="Mold name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="brand"
          defaultValue={mold.brand ?? ""}
          placeholder="Brand"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="category"
          defaultValue={mold.category ?? ""}
          placeholder="Category"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <input
          name="speed"
          defaultValue={toStringValue(mold.speed)}
          placeholder="Speed"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="glide"
          defaultValue={toStringValue(mold.glide)}
          placeholder="Glide"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="turn"
          defaultValue={toStringValue(mold.turn)}
          placeholder="Turn"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="fade"
          defaultValue={toStringValue(mold.fade)}
          placeholder="Fade"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="stability"
          defaultValue={mold.stability ?? ""}
          placeholder="Stability"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <input
          name="diameterCm"
          defaultValue={toStringValue(mold.diameterCm)}
          placeholder="Diameter (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="heightCm"
          defaultValue={toStringValue(mold.heightCm)}
          placeholder="Height (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="rimDepthCm"
          defaultValue={toStringValue(mold.rimDepthCm)}
          placeholder="Rim depth (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="rimThicknessCm"
          defaultValue={toStringValue(mold.rimThicknessCm)}
          placeholder="Rim thickness (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="maxWeightGr"
          defaultValue={toStringValue(mold.maxWeightGr)}
          placeholder="Max weight (g)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="color"
          defaultValue={mold.color ?? ""}
          placeholder="Color"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="backgroundColor"
          defaultValue={mold.backgroundColor ?? ""}
          placeholder="Background color"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {status.kind === "saving" ? "Saving..." : "Save mold changes"}
        </button>
        {status.kind === "success" && <p className="text-sm text-emerald-700">{status.message}</p>}
        {status.kind === "error" && <p className="text-sm text-rose-700">{status.message}</p>}
      </div>
    </form>
  );
}
