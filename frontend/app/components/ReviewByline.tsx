import Link from "next/link";
import { BadgeStack } from "@/app/components/BadgeChip";
import { computeReviewerBadges, tallyDiscReviewCategories } from "@/lib/badges";
import { getReviewerActivityForUser } from "@/lib/strapi";

type Props = {
  userId?: number | null;
  username?: string | null;
  emailFallback?: string | null;
  createdAt?: string | null;
};

/**
 * Server-rendered byline for a review entry: "username · date · [badges]".
 * Loads the reviewer's badges in-process; React's `cache` dedupes when many
 * reviews share the same author on a single page.
 */
export async function ReviewByline({ userId, username, emailFallback, createdAt }: Props) {
  const label = username || emailFallback || "Community member";
  const date = createdAt ? new Date(createdAt).toLocaleDateString() : "Unknown date";

  if (!userId) {
    return (
      <p className="text-xs text-slate-500">
        {label} · {date}
      </p>
    );
  }

  const activity = await getReviewerActivityForUser(userId);
  const categories = tallyDiscReviewCategories(
    activity.ratedDiscDocumentIds.map((id) => ({
      category: activity.ratedDiscCategoryByDocumentId.get(id) ?? null,
    })),
  );
  const badges = computeReviewerBadges({
    discReviewCount: activity.discReviewCount,
    courseReviewCount: activity.courseReviewCount,
    discReviewsByCategory: categories,
    helpfulVotesReceived: activity.helpfulVotesReceived,
  }).slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {username ? (
        <Link href={`/u/${encodeURIComponent(username)}`} className="font-medium text-slate-700 hover:underline">
          {username}
        </Link>
      ) : (
        <span className="font-medium text-slate-700">{label}</span>
      )}
      <span aria-hidden>·</span>
      <span>{date}</span>
      {badges.length > 0 ? <BadgeStack badges={badges} size="sm" /> : null}
    </div>
  );
}
