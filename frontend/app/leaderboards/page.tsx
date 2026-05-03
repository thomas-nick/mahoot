import Link from "next/link";
import { CourseLeaderboardCard } from "@/app/components/CourseLeaderboardCard";
import { DiscLeaderboardCard } from "@/app/components/DiscLeaderboardCard";
import { LeaderboardRail } from "@/app/components/LeaderboardRail";
import { PageHeader } from "@/app/components/ui";
import { getCourseLeaderboards, getDiscLeaderboards } from "@/lib/leaderboards";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leaderboards · Mahoot",
  description: "Top-rated discs and courses ranked by community reviews.",
};

export default async function LeaderboardsPage() {
  const [discs, courses] = await Promise.all([
    getDiscLeaderboards({ limit: 10, minRatings: 1 }),
    getCourseLeaderboards({ limit: 10 }),
  ]);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Leaderboards"
        description="Community-ranked discs and courses. Bayesian-smoothed so a single 10/10 doesn't beat a 9.4 with hundreds of reviews."
      />

      <SectionAnchor id="top-courses" title="Courses" subtitle="What players are loving and reviewing the most.">
        <div className="space-y-8">
          {courses.topOverall.length > 0 ? (
            <LeaderboardRail title="Top-rated courses" subtitle="Highest community score with at least one review.">
              {courses.topOverall.map((course, index) => (
                <CourseLeaderboardCard key={course.documentId} course={course} rank={index + 1} />
              ))}
            </LeaderboardRail>
          ) : null}

          {courses.mostReviewed.length > 0 ? (
            <div id="most-reviewed-courses">
              <LeaderboardRail title="Most reviewed courses" subtitle="Where the community shows up most.">
                {courses.mostReviewed.map((course, index) => (
                  <CourseLeaderboardCard
                    key={`mr-course-${course.documentId}`}
                    course={course}
                    rank={index + 1}
                  />
                ))}
              </LeaderboardRail>
            </div>
          ) : null}

          {courses.topByState.map(({ state, courses: list }) => (
            <LeaderboardRail
              key={`state-${state}`}
              title={`Top in ${state}`}
              viewAllHref={`/courses?state=${encodeURIComponent(state)}`}
              viewAllLabel="Browse"
            >
              {list.map((course, index) => (
                <CourseLeaderboardCard
                  key={`${state}-${course.documentId}`}
                  course={course}
                  rank={index + 1}
                />
              ))}
            </LeaderboardRail>
          ))}

          {courses.topOverall.length === 0 && courses.mostReviewed.length === 0 ? (
            <EmptySection
              title="No course reviews yet"
              cta={{ href: "/courses", label: "Browse courses" }}
            />
          ) : null}
        </div>
      </SectionAnchor>

      <SectionAnchor id="top-discs" title="Discs" subtitle="Top molds across every category.">
        <div className="space-y-8">
          {discs.rails.map(({ rail, items }) => (
            <div key={rail.id} id={rail.id}>
              <LeaderboardRail
                title={rail.label}
                subtitle="Bayesian-smoothed community score, deduplicated by mold."
                viewAllHref={`/discs?category=${encodeURIComponent(rail.matches[0])}`}
                viewAllLabel="Filter on /discs"
              >
                {items.map((item, index) => (
                  <DiscLeaderboardCard key={item.disc.documentId} item={item} rank={index + 1} />
                ))}
              </LeaderboardRail>
            </div>
          ))}

          {discs.mostReviewed.length > 0 ? (
            <div id="most-reviewed-discs">
              <LeaderboardRail
                title="Most reviewed discs"
                subtitle="Volume leaderboard — most player ratings, regardless of score."
              >
                {discs.mostReviewed.map((item, index) => (
                  <DiscLeaderboardCard key={`mr-${item.disc.documentId}`} item={item} rank={index + 1} />
                ))}
              </LeaderboardRail>
            </div>
          ) : null}

          {discs.rails.length === 0 && discs.mostReviewed.length === 0 ? (
            <EmptySection title="No disc reviews yet" cta={{ href: "/discs", label: "Browse discs" }} />
          ) : null}
        </div>
      </SectionAnchor>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <h2 className="text-base font-semibold text-slate-900">How rankings work</h2>
        <p className="mt-2">
          Each entry&apos;s score is a Bayesian-smoothed average: items with very few reviews get pulled toward
          the global mean, so a single 10/10 won&apos;t outrank an established 9.4. As more players rate, scores
          drift toward the raw community average.
        </p>
        <p className="mt-2">
          Want to move a disc up the board?{" "}
          <Link href="/discs" className="font-medium text-slate-900 underline">
            Rate the discs you&apos;ve thrown
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function SectionAnchor({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5 scroll-mt-24">
      <header className="border-b border-slate-200 pb-3">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function EmptySection({ title, cta }: { title: string; cta: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">
        Leaderboards fill in as the community starts reviewing.
      </p>
      <Link
        href={cta.href}
        className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {cta.label}
      </Link>
    </div>
  );
}
