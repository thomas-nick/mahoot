import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeStack } from "@/app/components/BadgeChip";
import { computeReviewerBadges, tallyDiscReviewCategories } from "@/lib/badges";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";
import { resolvePublicUserAndProfile } from "@/lib/public-profile-strapi";
import { collectPublicSocialLinks } from "@/lib/social-links";
import { getReviewerActivityForUser } from "@/lib/strapi";
import { MemberShell, memberActivityCardTint, memberSectionSurface } from "@/app/components/MemberShell";
import { Avatar, Badge, Card, CardHeader, Notice } from "@/app/components/ui";

const STRAPI_URL = getStrapiServerUrl();
const STRAPI_TOKEN = (process.env.STRAPI_API_TOKEN ?? "").trim();

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
};

type DiscSubmission = {
  id: number;
  documentId?: string;
  discName?: string | null;
  brand?: string | null;
  moderation?: string | null;
  createdAt?: string | null;
};

type CourseSubmission = {
  id: number;
  documentId?: string;
  courseName?: string | null;
  city?: string | null;
  state?: string | null;
  moderation?: string | null;
  createdAt?: string | null;
};

type MarketListing = {
  id: number;
  documentId?: string;
  title?: string | null;
  priceUsd?: number | string | null;
  currency?: string | null;
  condition?: string | null;
  status?: string | null;
  discDocumentId?: string | null;
  discDisplayName?: string | null;
  imageUrl?: string | null;
  createdAt?: string | null;
};

const authHeaders = (): HeadersInit => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  return headers;
};

async function fetchDiscSubmissions(userId: number): Promise<DiscSubmission[]> {
  const params = new URLSearchParams({
    "filters[submittedBy][id][$eq]": String(userId),
    "filters[moderation][$eq]": "approved",
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "20",
    "fields[0]": "discName",
    "fields[1]": "brand",
    "fields[2]": "moderation",
    "fields[3]": "createdAt",
    status: "published",
  });
  try {
    const response = await fetch(`${STRAPI_URL}/api/disc-submissions?${params.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { data?: DiscSubmission[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function fetchCourseSubmissions(userId: number): Promise<CourseSubmission[]> {
  const params = new URLSearchParams({
    "filters[submittedBy][id][$eq]": String(userId),
    "filters[moderation][$eq]": "approved",
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "20",
    "fields[0]": "courseName",
    "fields[1]": "city",
    "fields[2]": "state",
    "fields[3]": "moderation",
    "fields[4]": "createdAt",
    status: "published",
  });
  try {
    const response = await fetch(`${STRAPI_URL}/api/course-submissions?${params.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { data?: CourseSubmission[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function fetchListings(userId: number): Promise<MarketListing[]> {
  const params = new URLSearchParams({
    "filters[seller][id][$eq]": String(userId),
    "filters[status][$eq]": "active",
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "20",
  });
  try {
    const response = await fetch(`${STRAPI_URL}/api/market-listings?${params.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { data?: MarketListing[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

const formatPrice = (raw: number | string | null | undefined, currency?: string | null) => {
  const value = typeof raw === "number" ? raw : Number(raw ?? NaN);
  if (!Number.isFinite(value)) return "—";
  const suffix = currency && currency !== "USD" ? ` ${currency}` : "";
  return `$${value.toFixed(2)}${suffix}`;
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const trimmed = username.trim();
  if (!trimmed) notFound();

  const resolved = await resolvePublicUserAndProfile(trimmed);
  if (!resolved?.user?.id) notFound();

  const { user, profile } = resolved;

  const [discSubmissions, courseSubmissions, listings, activity] = await Promise.all([
    fetchDiscSubmissions(user.id),
    fetchCourseSubmissions(user.id),
    fetchListings(user.id),
    getReviewerActivityForUser(user.id),
  ]);

  const displayName = (profile?.displayName?.trim() || user.username || "Community member") as string;
  const handle = user.username ? `@${user.username}` : null;
  const location =
    [profile?.city, profile?.state, profile?.country].filter((value) => Boolean(value?.trim())).join(", ") || null;
  const totalContributions = discSubmissions.length + courseSubmissions.length + listings.length;
  const totalReviews = activity.discReviewCount + activity.courseReviewCount;
  const categoryTally = tallyDiscReviewCategories(
    activity.ratedDiscDocumentIds.map((id) => ({
      category: activity.ratedDiscCategoryByDocumentId.get(id) ?? null,
    })),
  );
  const reviewerBadges = computeReviewerBadges({
    discReviewCount: activity.discReviewCount,
    courseReviewCount: activity.courseReviewCount,
    discReviewsByCategory: categoryTally,
    helpfulVotesReceived: activity.helpfulVotesReceived,
  });

  const socialLinks = collectPublicSocialLinks(profile ?? {});

  return (
    <MemberShell className="space-y-8 lg:space-y-10">
      <header>
        <div
          className={`flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:gap-10 ${memberSectionSurface}`}
        >
          <div className="flex shrink-0 justify-center lg:justify-start">
            <div className="rounded-full bg-gradient-to-br from-sky-400 via-violet-400 to-amber-300 p-[3px] shadow-lg shadow-slate-900/10">
              <div className="rounded-full bg-white p-1">
                <Avatar src={profile?.avatarUrl ?? null} label={displayName} size="xl" className="!h-24 !w-24 !text-2xl sm:!h-28 sm:!w-28" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4 text-center lg:text-left">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {displayName}
              </p>
              {handle ? (
                <p className="text-[15px] font-medium text-sky-700/90">{handle}</p>
              ) : null}
              {location ? <p className="text-sm text-slate-600">{location}</p> : null}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {user.confirmed ? (
                <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm">
                  Verified
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                {totalContributions} contribution{totalContributions === 1 ? "" : "s"}
              </span>
              {totalReviews > 0 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                  {totalReviews} review{totalReviews === 1 ? "" : "s"}
                </span>
              ) : null}
              {activity.helpfulVotesReceived > 0 ? (
                <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-xs font-medium text-amber-900 shadow-sm">
                  {activity.helpfulVotesReceived} helpful
                  {activity.helpfulVotesReceived === 1 ? "" : " votes"}
                </span>
              ) : null}
              {user.createdAt ? (
                <span className="text-xs text-slate-500">
                  Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              ) : null}
            </div>

            {profile?.bio ? (
              <div className="rounded-2xl border border-sky-100/80 bg-white/70 px-4 py-3 text-left text-sm leading-relaxed text-slate-700 shadow-inner shadow-sky-100/50 backdrop-blur-sm sm:px-5 sm:py-4">
                <p className="whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No bio yet — still a valued part of the community.
              </p>
            )}

            {socialLinks.length > 0 ? (
              <div className="space-y-2 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Elsewhere</p>
                <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
                  {socialLinks.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-900"
                      >
                        {item.label}
                        <span className="ml-1 text-slate-400" aria-hidden>
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] leading-snug text-slate-500">
                  Links are self-reported for context — your history on Mahoot still tells the story.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <Card className={`border-white/60 ${memberSectionSurface}`} padded={false}>
            <div className="border-b border-slate-100/80 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <CardHeader
                title="Selling now"
                description="Live marketplace listings — tap through to message or buy."
              />
            </div>
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {listings.length === 0 ? (
                <Notice variant="info" className="border-slate-200/80 bg-white/70">
                  Nothing listed at the moment. Check back later or browse the marketplace.
                </Notice>
              ) : (
                <ul className="space-y-3">
                  {listings.map((listing, i) => {
                    const id = listing.documentId || String(listing.id);
                    const href = listing.discDocumentId
                      ? `/discs/${listing.discDocumentId}?tab=marketplace`
                      : "/marketplace";
                    return (
                      <li key={id}>
                        <Link
                          href={href}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-gradient-to-br p-4 shadow-sm transition hover:border-sky-200/80 hover:shadow-md ${memberActivityCardTint(i)}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {listing.title ?? "Listing"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600">
                              {[
                                formatPrice(listing.priceUsd, listing.currency),
                                listing.discDisplayName || null,
                                listing.condition ? listing.condition : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <Badge variant="success">Active</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className={`border-white/60 ${memberSectionSurface}`}>
              <CardHeader title="Discs they added" description="Approved catalog contributions." />
              {discSubmissions.length === 0 ? (
                <Notice variant="info" className="border-slate-200/80 bg-white/70 text-xs">
                  No disc submissions yet.
                </Notice>
              ) : (
                <ul className="space-y-2">
                  {discSubmissions.map((sub, i) => (
                    <li
                      key={sub.documentId || sub.id}
                      className={`rounded-2xl border border-slate-200/50 bg-gradient-to-br p-3 text-sm shadow-sm ${memberActivityCardTint(i)}`}
                    >
                      <p className="font-semibold text-slate-900">{sub.discName ?? "Untitled"}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {[sub.brand, sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className={`border-white/60 ${memberSectionSurface}`}>
              <CardHeader title="Courses they added" description="Approved course pages." />
              {courseSubmissions.length === 0 ? (
                <Notice variant="info" className="border-slate-200/80 bg-white/70 text-xs">
                  No course submissions yet.
                </Notice>
              ) : (
                <ul className="space-y-2">
                  {courseSubmissions.map((sub, i) => (
                    <li
                      key={sub.documentId || sub.id}
                      className={`rounded-2xl border border-slate-200/50 bg-gradient-to-br p-3 text-sm shadow-sm ${memberActivityCardTint(i + 1)}`}
                    >
                      <p className="font-semibold text-slate-900">{sub.courseName ?? "Untitled"}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {[
                          [sub.city, sub.state].filter(Boolean).join(", ") || null,
                          sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <aside className="space-y-6 lg:col-span-1">
          {(reviewerBadges.length > 0 || totalReviews > 0) && (
            <Card className={`border-white/60 ${memberSectionSurface}`}>
              <CardHeader
                title="On the course"
                description={
                  totalReviews > 0
                    ? `${totalReviews} review${totalReviews === 1 ? "" : "s"} · ${activity.helpfulVotesReceived} helpful`
                    : "Reviews and recognition from the community."
                }
              />
              {reviewerBadges.length > 0 ? (
                <BadgeStack badges={reviewerBadges} />
              ) : (
                <p className="text-sm text-slate-600">
                  Badges unlock as reviews stack up — share a round recap to get started.
                </p>
              )}
            </Card>
          )}

          <Card className={`border-violet-100/80 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/40 ${memberSectionSurface}`}>
            <CardHeader title="At a glance" />
            <ul className="space-y-1 text-sm text-slate-700">
              <li className="flex justify-between gap-2 border-b border-slate-100/80 pb-2">
                <span className="text-slate-600">Contributions</span>
                <span className="font-semibold tabular-nums text-slate-900">{totalContributions}</span>
              </li>
              <li className="flex justify-between gap-2 border-b border-slate-100/80 pb-2">
                <span className="text-slate-600">Reviews written</span>
                <span className="font-semibold tabular-nums text-slate-900">{totalReviews}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-slate-600">Helpful votes</span>
                <span className="font-semibold tabular-nums text-slate-900">{activity.helpfulVotesReceived}</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </MemberShell>
  );
}
