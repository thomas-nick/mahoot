import Link from "next/link";
import { DiscImage } from "@/app/components/DiscImage";
import { LeaderboardRank } from "@/app/components/LeaderboardRail";
import { RatingChip } from "@/app/components/RatingChip";
import type { DiscLeaderboardItem } from "@/lib/leaderboards";

const getDiscDisplayName = (disc: { name: string; plasticName?: string | null }) => {
  const plastic = (disc.plasticName ?? "").trim();
  if (!plastic) return disc.name;
  const lowerName = disc.name.toLowerCase();
  if (lowerName.includes(plastic.toLowerCase())) return disc.name;
  return `${plastic} ${disc.name}`.trim();
};

export function DiscLeaderboardCard({ item, rank }: { item: DiscLeaderboardItem; rank: number }) {
  const { disc, summary } = item;
  return (
    <Link
      href={`/discs/${disc.documentId}`}
      role="listitem"
      className="group relative flex w-[230px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md sm:w-[240px]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
        <DiscImage
          src={disc.imageUrl}
          alt={`${disc.name} preview`}
          className="h-full w-full object-cover"
          fallbackLabel="No image"
          loading="lazy"
        />
        <div className="absolute left-2 top-2">
          <LeaderboardRank rank={rank} />
        </div>
        <div className="absolute right-2 top-2">
          <RatingChip
            average={summary?.ratingAverageOverall ?? null}
            count={summary?.ratingCount ?? 0}
            size="sm"
            emphasis="headline"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">
          {disc.brand || "Unknown brand"}
        </p>
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-slate-950">
          {getDiscDisplayName(disc)}
        </h3>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-600">
          <span className="rounded bg-slate-100 px-1.5 py-0.5">S {disc.speed ?? "-"}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">G {disc.glide ?? "-"}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">T {disc.turn ?? "-"}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">F {disc.fade ?? "-"}</span>
        </div>
      </div>
    </Link>
  );
}
