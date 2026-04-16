"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Disc } from "@/lib/strapi";
import { readAuthToken } from "@/lib/auth";

type EditDiscFormProps = {
  disc: Disc;
};

const toStringValue = (value: number | string | null | undefined) => (value == null ? "" : String(value));

export function EditDiscForm({ disc }: EditDiscFormProps) {
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "success" | "error"; message?: string }>({
    kind: "idle",
  });
  const router = useRouter();
  const isVariantLike = Boolean(disc.moldExternalId || disc.plasticExternalId);

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
      plastic: String(form.get("plastic") ?? ""),
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
      link: String(form.get("link") ?? ""),
      imageUrl: String(form.get("imageUrl") ?? ""),
      color: String(form.get("color") ?? ""),
      backgroundColor: String(form.get("backgroundColor") ?? ""),
    };

    try {
      const response = await fetch(`/api/discs/${disc.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update disc.");
      }

      setStatus({ kind: "success", message: "Disc updated successfully." });
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
      {isVariantLike ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">
            This appears to be a catalog variant. Mold-level fields (brand/category/plastic/dimensions) may remain
            controlled by mold/plastic records.
          </p>
          {disc.moldExternalId ? (
            <Link
              href={`/discs/molds/${encodeURIComponent(disc.moldExternalId)}/edit?fromDisc=${encodeURIComponent(
                disc.documentId
              )}`}
              className="inline-flex items-center rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:border-amber-400"
            >
              Edit mold fields
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          defaultValue={disc.name}
          placeholder="Disc name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="brand"
          defaultValue={disc.brand ?? ""}
          placeholder="Brand"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="category"
          defaultValue={disc.category ?? ""}
          placeholder="Category"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="plastic"
          defaultValue={disc.plasticName ?? disc.plastic ?? ""}
          placeholder="Plastic"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <input
          name="speed"
          defaultValue={toStringValue(disc.speed)}
          placeholder="Speed"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="glide"
          defaultValue={toStringValue(disc.glide)}
          placeholder="Glide"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="turn"
          defaultValue={toStringValue(disc.turn)}
          placeholder="Turn"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="fade"
          defaultValue={toStringValue(disc.fade)}
          placeholder="Fade"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="stability"
          defaultValue={disc.stability ?? ""}
          placeholder="Stability"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <input
          name="diameterCm"
          defaultValue={toStringValue(disc.diameterCm)}
          placeholder="Diameter (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="heightCm"
          defaultValue={toStringValue(disc.heightCm)}
          placeholder="Height (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="rimDepthCm"
          defaultValue={toStringValue(disc.rimDepthCm)}
          placeholder="Rim depth (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="rimThicknessCm"
          defaultValue={toStringValue(disc.rimThicknessCm)}
          placeholder="Rim thickness (cm)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="maxWeightGr"
          defaultValue={toStringValue(disc.maxWeightGr)}
          placeholder="Max weight (g)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <input
        name="link"
        defaultValue={disc.link ?? ""}
        placeholder="Product URL"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <input
        name="imageUrl"
        defaultValue={disc.imageUrl ?? ""}
        placeholder="Image URL"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="color"
          defaultValue={disc.color ?? ""}
          placeholder="Color"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          name="backgroundColor"
          defaultValue={disc.backgroundColor ?? ""}
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
          {status.kind === "saving" ? "Saving..." : "Save changes"}
        </button>
        {status.kind === "success" && <p className="text-sm text-emerald-700">{status.message}</p>}
        {status.kind === "error" && <p className="text-sm text-rose-700">{status.message}</p>}
      </div>
    </form>
  );
}
