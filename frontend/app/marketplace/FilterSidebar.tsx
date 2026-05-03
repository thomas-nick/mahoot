"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button, Field, Input } from "@/app/components/ui";
import { CONDITION_LABEL, SHIPPING_LABEL } from "@/app/marketplace/lib";

type Props = {
  brands: string[];
};

const conditionOptions = ["new", "like-new", "used", "inked", "unknown"] as const;
const shippingOptions = (Object.keys(SHIPPING_LABEL) as Array<keyof typeof SHIPPING_LABEL>);

export function FilterSidebar({ brands }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const current = useMemo(
    () => ({
      q: params.get("q") ?? "",
      brand: params.get("brand") ?? "",
      condition: params.get("condition") ?? "",
      shipping: params.get("shipping") ?? "",
      priceMin: params.get("priceMin") ?? "",
      priceMax: params.get("priceMax") ?? "",
      negotiable: params.get("negotiable") === "1",
    }),
    [params],
  );

  const update = (next: Partial<typeof current>, resetSort = false) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries({ ...current, ...next }).forEach(([key, value]) => {
      const stringValue =
        typeof value === "boolean" ? (value ? "1" : "") : String(value ?? "");
      if (stringValue) {
        sp.set(key, stringValue);
      } else {
        sp.delete(key);
      }
    });
    if (resetSort) sp.delete("sort");
    router.replace(`/marketplace?${sp.toString()}`, { scroll: false });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update({
      q: String(form.get("q") ?? ""),
      brand: String(form.get("brand") ?? ""),
      condition: String(form.get("condition") ?? ""),
      shipping: String(form.get("shipping") ?? ""),
      priceMin: String(form.get("priceMin") ?? ""),
      priceMax: String(form.get("priceMax") ?? ""),
      negotiable: form.get("negotiable") === "on",
    });
  };

  const onClear = () => router.replace("/marketplace");

  const hasFilters =
    current.q ||
    current.brand ||
    current.condition ||
    current.shipping ||
    current.priceMin ||
    current.priceMax ||
    current.negotiable;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <Field label="Search">
        <Input name="q" defaultValue={current.q} placeholder="Disc name, plastic, color…" />
      </Field>

      <Field label="Brand / mold">
        <select
          name="brand"
          defaultValue={current.brand}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Any brand</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Condition">
        <select
          name="condition"
          defaultValue={current.condition}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Any condition</option>
          {conditionOptions.map((value) => (
            <option key={value} value={value}>
              {CONDITION_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Shipping">
        <select
          name="shipping"
          defaultValue={current.shipping}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Any</option>
          {shippingOptions.map((value) => (
            <option key={value} value={value}>
              {SHIPPING_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Min $">
          <Input name="priceMin" type="number" min={0} step="1" defaultValue={current.priceMin} placeholder="0" />
        </Field>
        <Field label="Max $">
          <Input name="priceMax" type="number" min={0} step="1" defaultValue={current.priceMax} placeholder="100" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="negotiable"
          defaultChecked={current.negotiable}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        />
        Accepts offers only
      </label>

      <Button type="submit" fullWidth>
        Apply filters
      </Button>
    </form>
  );
}
