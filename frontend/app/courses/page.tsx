import Link from "next/link";
import { EmptyState, PageHeader, Pagination } from "@/app/components/ui";
import { CourseLeaderboardCard } from "@/app/components/CourseLeaderboardCard";
import { LeaderboardRail } from "@/app/components/LeaderboardRail";
import { RatingChip } from "@/app/components/RatingChip";
import { withCourseQuery } from "@/lib/course-query";
import { getCourseLeaderboards } from "@/lib/leaderboards";
import { compareByBayes } from "@/lib/rating-score";
import { getCourseFacetOptions, getCourses } from "@/lib/strapi";
import { CourseFiltersForm } from "./CourseFiltersForm";
import { NearbyCitiesPanel } from "./NearbyCitiesPanel";

export const dynamic = "force-dynamic";

type CoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams;
  const page = Number(getString(params.page) ?? "1");
  const q = getString(params.q);
  const state = getString(params.state);
  const city = getString(params.city);
  const difficulty = getString(params.courseDifficulty) ?? getString(params.difficulty);
  const courseType = getString(params.courseType) ?? getString(params.type);

  const hasActiveFilter = Boolean(q || state || city || difficulty || courseType);

  const facetOptions = await getCourseFacetOptions();

  const currentParams: Record<string, string | undefined> = {
    q,
    state,
    city,
    courseDifficulty: difficulty,
    courseType,
  };

  const buildHref = (nextPage: number) =>
    withCourseQuery(currentParams, {
      page: String(nextPage),
    });

  const activeFilters = [
    { key: "q", label: `Query: ${q}`, value: q },
    { key: "state", label: `State: ${state}`, value: state },
    { key: "city", label: `City: ${city}`, value: city },
    { key: "courseDifficulty", label: `Difficulty: ${difficulty}`, value: difficulty },
    { key: "courseType", label: `Type: ${courseType}`, value: courseType },
  ].filter((item) => item.value);

  const sortedStateFacetValues = [...facetOptions.states].sort((a, b) => {
    const countDelta = (facetOptions.stateCounts[b] ?? 0) - (facetOptions.stateCounts[a] ?? 0);
    if (countDelta !== 0) return countDelta;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Courses"
        description="Top-rated layouts from the community — ranked, not alphabetical."
      />

      <CourseFiltersForm
        q={q}
        state={state}
        city={city}
        difficulty={difficulty}
        courseType={courseType}
        states={facetOptions.states}
        difficulties={facetOptions.difficulties}
        types={facetOptions.types}
      />

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          {activeFilters.map((filter) => (
            <Link
              key={filter.key}
              href={withCourseQuery(currentParams, { [filter.key]: undefined, page: undefined })}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
            >
              {filter.label} ×
            </Link>
          ))}
          <Link href="/courses" className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
            Clear all
          </Link>
        </div>
      )}

      {hasActiveFilter ? (
        <FilteredCoursesSection
          page={page}
          query={q}
          state={state}
          city={city}
          difficulty={difficulty}
          courseType={courseType}
          buildHref={buildHref}
          currentParams={currentParams}
          sortedStateFacetValues={sortedStateFacetValues}
          facetOptions={facetOptions}
        />
      ) : (
        <CourseLeaderboardSection state={state} />
      )}
    </div>
  );
}

async function CourseLeaderboardSection({ state }: { state?: string }) {
  const leaderboards = await getCourseLeaderboards({ limit: 8, state });
  const hasAny =
    leaderboards.topOverall.length > 0 ||
    leaderboards.mostReviewed.length > 0 ||
    leaderboards.topByState.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No course reviews yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Leaderboards fill in as the community starts rating courses. Pick a state above or browse all
          courses.
        </p>
        <Link
          href="/courses?q=a"
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Browse the directory
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {leaderboards.topOverall.length > 0 ? (
        <LeaderboardRail
          title="Top-rated courses"
          subtitle="Ranked by community overall score."
          viewAllHref="/leaderboards#top-courses"
        >
          {leaderboards.topOverall.map((course, index) => (
            <CourseLeaderboardCard key={course.documentId} course={course} rank={index + 1} />
          ))}
        </LeaderboardRail>
      ) : null}

      {leaderboards.mostReviewed.length > 0 ? (
        <LeaderboardRail
          title="Most reviewed courses"
          subtitle="Where the community is showing up most."
          viewAllHref="/leaderboards#most-reviewed-courses"
        >
          {leaderboards.mostReviewed.map((course, index) => (
            <CourseLeaderboardCard key={`mr-${course.documentId}`} course={course} rank={index + 1} />
          ))}
        </LeaderboardRail>
      ) : null}

      {leaderboards.topByState.map(({ state: stateName, courses }) => (
        <LeaderboardRail
          key={stateName}
          title={`Top in ${stateName}`}
          viewAllHref={`/courses?state=${encodeURIComponent(stateName)}`}
          viewAllLabel="Browse"
        >
          {courses.map((course, index) => (
            <CourseLeaderboardCard key={`${stateName}-${course.documentId}`} course={course} rank={index + 1} />
          ))}
        </LeaderboardRail>
      ))}
    </div>
  );
}

async function FilteredCoursesSection({
  page,
  query,
  state,
  city,
  difficulty,
  courseType,
  buildHref,
  currentParams,
  sortedStateFacetValues,
  facetOptions,
}: {
  page: number;
  query?: string;
  state?: string;
  city?: string;
  difficulty?: string;
  courseType?: string;
  buildHref: (nextPage: number) => string;
  currentParams: Record<string, string | undefined>;
  sortedStateFacetValues: string[];
  facetOptions: Awaited<ReturnType<typeof getCourseFacetOptions>>;
}) {
  const result = await getCourses({ page, query, state, city, difficulty, type: courseType });

  const ranked = [...result.items].sort(
    compareByBayes((course) => ({
      avg: course.ratingAverageOverall ?? null,
      count: course.ratingCount ?? 0,
    })),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <aside className="space-y-4 lg:col-span-1">
        <NearbyCitiesPanel currentParams={currentParams} />
        <FacetGroup
          title="State"
          values={sortedStateFacetValues}
          counts={facetOptions.stateCounts}
          paramKey="state"
          current={currentParams}
        />
        <FacetGroup
          title="Difficulty"
          values={facetOptions.difficulties}
          paramKey="courseDifficulty"
          current={currentParams}
        />
        <FacetGroup title="Type" values={facetOptions.types} paramKey="courseType" current={currentParams} />
      </aside>

      <section className="space-y-4 lg:col-span-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Filtered results</h2>
          <p className="text-xs text-slate-500">Sorted by community score, highest first.</p>
        </div>

        {ranked.length === 0 ? (
          <EmptyState label="No courses match those filters." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ranked.map((course) => (
              <Link
                key={course.documentId}
                href={`/courses/${course.documentId}?tab=reviews`}
                className="block cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <p className="text-sm text-slate-500">
                  {[course.city, course.state, course.country].filter(Boolean).join(", ") || "Unknown location"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{course.name}</h3>
                  <RatingChip
                    average={course.ratingAverageOverall ?? null}
                    count={course.ratingCount ?? 0}
                    emphasis="headline"
                    size="sm"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-600">
                  {course.difficulty ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{course.difficulty}</span>
                  ) : null}
                  {course.type ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{course.type}</span>
                  ) : null}
                  {typeof course.ratingAverageLayout === "number" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      Layout {course.ratingAverageLayout}
                    </span>
                  ) : null}
                  {typeof course.ratingAverageScenery === "number" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      Scenery {course.ratingAverageScenery}
                    </span>
                  ) : null}
                </div>
                {(course.description || course.pros || course.cons) && (
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                    {course.description || course.pros || course.cons}
                  </p>
                )}
                <div className="mt-4 text-xs font-medium text-slate-700">View reviews →</div>
              </Link>
            ))}
          </div>
        )}

        <Pagination
          page={result.pagination.page}
          pageCount={result.pagination.pageCount}
          buildHref={buildHref}
        />
      </section>
    </div>
  );
}

function FacetGroup({
  title,
  values,
  counts,
  paramKey,
  current,
}: {
  title: string;
  values: string[];
  counts?: Record<string, number>;
  paramKey: "state" | "courseDifficulty" | "courseType";
  current: Record<string, string | undefined>;
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => {
          const isActive = current[paramKey] === value;
          const count = counts?.[value];
          const isZero = typeof count === "number" && count === 0;
          return (
            <Link
              key={`${paramKey}-${value}`}
              href={withCourseQuery(current, { [paramKey]: isActive ? undefined : value, page: undefined })}
              className={`rounded-full px-2.5 py-1 text-xs ${
                isActive
                  ? "bg-slate-900 text-white"
                  : isZero
                    ? "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {value}
              {typeof count === "number" ? ` (${count})` : ""}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
