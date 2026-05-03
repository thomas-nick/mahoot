import Link from "next/link";
import { LeaderboardRank } from "@/app/components/LeaderboardRail";
import { RatingChip } from "@/app/components/RatingChip";
import type { Course } from "@/lib/strapi";

export function CourseLeaderboardCard({ course, rank }: { course: Course; rank: number }) {
  const location = [course.city, course.state].filter(Boolean).join(", ") || "Unknown location";
  return (
    <Link
      href={`/courses/${course.documentId}?tab=reviews`}
      role="listitem"
      className="group relative flex w-[260px] shrink-0 snap-start flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md sm:w-[280px]"
    >
      <div className="flex items-start justify-between gap-2">
        <LeaderboardRank rank={rank} />
        <RatingChip
          average={course.ratingAverageOverall ?? null}
          count={course.ratingCount ?? 0}
          size="sm"
          emphasis="headline"
        />
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-slate-950">
        {course.name}
      </h3>
      <p className="text-xs text-slate-500">{location}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-600">
        {course.difficulty ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{course.difficulty}</span>
        ) : null}
        {course.type ? <span className="rounded bg-slate-100 px-1.5 py-0.5">{course.type}</span> : null}
        {typeof course.ratingAverageLayout === "number" ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5">Layout {course.ratingAverageLayout}</span>
        ) : null}
        {typeof course.ratingAverageScenery === "number" ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5">Scenery {course.ratingAverageScenery}</span>
        ) : null}
      </div>
    </Link>
  );
}
