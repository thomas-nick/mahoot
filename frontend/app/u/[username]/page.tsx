import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeStack } from "@/app/components/BadgeChip";
import { computeReviewerBadges, tallyDiscReviewCategories } from "@/lib/badges";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";
import { resolvePublicUserAndProfile } from "@/lib/public-profile-strapi";
import { collectPublicSocialLinks } from "@/lib/social-links";
import { getReviewerActivityForUser } from "@/lib/strapi";
import { Avatar, Badge, Card, CardHeader, Notice, PageHeader } from "@/app/components/ui";

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
  const location =
    [profile?.city, profile?.state, profile?.country].filter((value) => Boolean(value?.trim())).join(", ") || null;
  const totalContributions = discSubmissions.length + courseSubmissions.length + listings.length;
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
    <div className="space-y-6">
      <PageHeader title={displayName} description={user.username ? `@${user.username}` : undefined} />

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={profile?.avatarUrl ?? null} label={displayName} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
            {location ? <p className="text-sm text-slate-500">{location}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {user.confirmed ? <Badge variant="success">verified email</Badge> : null}
              <span>{totalContributions} contribution{totalContributions === 1 ? "" : "s"}</span>
              {user.createdAt ? (
                <span>· joined {new Date(user.createdAt).toLocaleDateString()}</span>
              ) : null}
            </div>
          </div>
        </div>
        {profile?.bio ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{profile.bio}</p>
        ) : null}

        {socialLinks.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Links</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {socialLinks.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white"
                  >
                    {item.label}
                    <span className="ml-1 text-slate-400" aria-hidden>
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              Social and PDGA links are self-reported. They supplement — but don&apos;t replace — marketplace history
              and community reviews below.
            </p>
          </div>
        ) : null}
      </Card>

      {reviewerBadges.length > 0 || activity.discReviewCount + activity.courseReviewCount > 0 ? (
        <Card>
          <CardHeader
            title="Reviewer badges"
            description={`${activity.discReviewCount + activity.courseReviewCount} total review${
              activity.discReviewCount + activity.courseReviewCount === 1 ? "" : "s"
            } · ${activity.helpfulVotesReceived} helpful vote${activity.helpfulVotesReceived === 1 ? "" : "s"} received`}
          />
          {reviewerBadges.length > 0 ? (
            <BadgeStack badges={reviewerBadges} />
          ) : (
            <Notice variant="info">No badges yet — write a few reviews to start collecting them.</Notice>
          )}
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Active marketplace listings" />
        {listings.length === 0 ? (
          <Notice variant="info">No active listings right now.</Notice>
        ) : (
          <ul className="space-y-2">
            {listings.map((listing) => {
              const id = listing.documentId || String(listing.id);
              const href = listing.discDocumentId
                ? `/discs/${listing.discDocumentId}?tab=marketplace`
                : "/marketplace";
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0">
                    <Link href={href} className="truncate font-medium text-slate-900 hover:underline">
                      {listing.title ?? "(Untitled listing)"}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {[
                        formatPrice(listing.priceUsd, listing.currency),
                        listing.discDisplayName || null,
                        listing.condition ? `Condition: ${listing.condition}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge variant="success">active</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Approved disc submissions" />
          {discSubmissions.length === 0 ? (
            <Notice variant="info">No approved disc submissions yet.</Notice>
          ) : (
            <ul className="space-y-2">
              {discSubmissions.map((sub) => (
                <li key={sub.documentId || sub.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{sub.discName ?? "(Untitled)"}</p>
                  <p className="text-xs text-slate-500">
                    {[sub.brand, sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Approved course submissions" />
          {courseSubmissions.length === 0 ? (
            <Notice variant="info">No approved course submissions yet.</Notice>
          ) : (
            <ul className="space-y-2">
              {courseSubmissions.map((sub) => (
                <li key={sub.documentId || sub.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{sub.courseName ?? "(Untitled)"}</p>
                  <p className="text-xs text-slate-500">
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
  );
}
