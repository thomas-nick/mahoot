import Link from "next/link";
import { EmptyState, PageHeader, Pagination } from "@/app/components/ui";
import { withCourseQuery } from "@/lib/course-query";
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

  const [result, facetOptions] = await Promise.all([
    getCourses({ page, query: q, state, city, difficulty, type: courseType }),
    getCourseFacetOptions(),
  ]);

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
    <div className="space-y-5">
      <PageHeader
        title="Courses"
        description="Browse and filter course catalog entries with facet-style controls."
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
          {result.items.length === 0 ? (
            <EmptyState label="No courses found for this filter." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {result.items.map((course) => (
                <Link
                  key={course.documentId}
                  href={`/courses/${course.documentId}`}
                  className="block cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
                >
                  <p className="text-sm text-slate-500">
                    {[course.city, course.state, course.country].filter(Boolean).join(", ") ||
                      "Unknown location"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{course.name}</h2>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-1">
                      Difficulty {course.difficulty || "-"}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1">Type {course.type || "-"}</span>
                    <span className="rounded bg-slate-100 px-2 py-1">
                      Rating{" "}
                      {course.ratingAverageOverall !== null
                        ? `${course.ratingAverageOverall}/10 (${course.ratingCount ?? 0})`
                        : "-"}
                    </span>
                  </div>
                  {(course.description || course.pros || course.cons) && (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                      {course.description || course.pros || course.cons}
                    </p>
                  )}
                  {course.state && (
                    <div className="mt-4">
                      <span className="text-xs text-slate-600">State: {course.state}</span>
                    </div>
                  )}
                  <div className="mt-4 text-xs font-medium text-slate-700">View details →</div>
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
