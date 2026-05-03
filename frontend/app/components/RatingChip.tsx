import { formatRating } from "@/lib/rating-score";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, { wrap: string; star: string }> = {
  sm: { wrap: "px-2 py-0.5 text-xs", star: "text-[11px]" },
  md: { wrap: "px-2.5 py-1 text-sm", star: "text-sm" },
  lg: { wrap: "px-3 py-1.5 text-base", star: "text-base" },
};

export function RatingChip({
  average,
  count,
  size = "md",
  emphasis = "default",
}: {
  average: number | null | undefined;
  count: number | null | undefined;
  size?: Size;
  emphasis?: "default" | "subtle" | "headline";
}) {
  const has = typeof average === "number" && Number.isFinite(average) && (count ?? 0) > 0;
  const sz = SIZE[size];

  if (!has) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 text-slate-400 ${sz.wrap}`}
        title="No reviews yet"
      >
        <span aria-hidden className={sz.star}>
          ☆
        </span>
        Not yet rated
      </span>
    );
  }

  const palette =
    emphasis === "headline"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : emphasis === "subtle"
        ? "border-slate-200 bg-white text-slate-700"
        : "border-emerald-100 bg-emerald-50/60 text-emerald-800";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${palette} ${sz.wrap}`}
      title={`${formatRating(average)} / 10 from ${count} review${(count ?? 0) === 1 ? "" : "s"}`}
    >
      <span aria-hidden className={sz.star}>
        ★
      </span>
      <span>{formatRating(average)}</span>
      <span className="text-slate-500">
        <span className="sr-only">Reviewed </span>
        ({count})
      </span>
    </span>
  );
}
