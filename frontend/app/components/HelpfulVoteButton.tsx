"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuthToken, readAuthUser } from "@/lib/auth";

export type HelpfulKind = "disc" | "course";

type Props = {
  kind: HelpfulKind;
  ratingDocumentId: string | undefined;
  initialHelpfulCount: number;
  /** documentId of the user who wrote the review — they cannot vote on their own. */
  reviewAuthorUserId?: number | null;
};

/**
 * Thumbs-up button for a review. Optimistic UI; on auth failure or write
 * error it rolls back to the server-provided count.
 *
 * One vote per (user, review). Clicking again removes the vote.
 */
export function HelpfulVoteButton({
  kind,
  ratingDocumentId,
  initialHelpfulCount,
  reviewAuthorUserId,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState(initialHelpfulCount ?? 0);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authedUserId, setAuthedUserId] = useState<number | null>(null);

  const apiBase = kind === "disc" ? "/api/disc-review-votes" : "/api/course-review-votes";

  useEffect(() => {
    const me = readAuthUser<{ id?: number }>();
    setAuthedUserId(me?.id ?? null);
    if (!ratingDocumentId) return;
    const token = readAuthToken();
    if (!token) return;

    const url = `${apiBase}?ratings=${encodeURIComponent(ratingDocumentId)}`;
    void fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const json = (await response.json()) as { votes?: Record<string, number> };
        if (json.votes?.[ratingDocumentId] === 1) {
          setVoted(true);
        }
      })
      .catch(() => {
        /* ignore — non-critical */
      });
  }, [apiBase, ratingDocumentId]);

  const isOwn =
    authedUserId !== null &&
    typeof reviewAuthorUserId === "number" &&
    authedUserId === reviewAuthorUserId;

  const onToggle = async () => {
    if (!ratingDocumentId || busy) return;
    const token = readAuthToken();
    if (!token) {
      router.push(`/account?next=${encodeURIComponent(window.location.pathname + window.location.hash)}`);
      return;
    }
    if (isOwn) return;
    const previousVoted = voted;
    const previousCount = count;
    const nextVoted = !voted;
    setVoted(nextVoted);
    setCount(previousCount + (nextVoted ? 1 : -1));
    setError(null);
    setBusy(true);
    try {
      const response = nextVoted
        ? await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ratingDocumentId, value: 1 }),
          })
        : await fetch(`${apiBase}?rating=${encodeURIComponent(ratingDocumentId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err) {
      setVoted(previousVoted);
      setCount(previousCount);
      setError(err instanceof Error ? err.message : "Could not save vote.");
    } finally {
      setBusy(false);
    }
  };

  if (!ratingDocumentId) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={busy || isOwn}
        title={
          isOwn
            ? "You wrote this review."
            : voted
              ? "Remove your vote"
              : "Mark this review as helpful"
        }
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
          voted
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        } ${isOwn ? "cursor-not-allowed opacity-60" : ""}`}
        aria-pressed={voted}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          aria-hidden
          className={voted ? "fill-emerald-600" : "fill-slate-500"}
        >
          <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466 6.86 2.94 6.32 5.183 4.96 6.667c-.683.733-1.473 1.122-2.214 1.328-.745.207-1.435.224-1.93.244h-.012c-.428.018-.792.39-.79.819v6.625c0 .404.293.762.694.821.6.087 1.65.282 2.713.74 1.06.453 2.18 1.182 2.97 2.328.51.74 1.286 1.218 2.142 1.218 1.05 0 1.85-.557 2.36-1.282.515-.74.734-1.661.734-2.474 0-1.382-.41-2.508-1.038-3.342h2.7c1.085 0 1.984-.86 2.034-1.949.022-.46-.069-.842-.182-1.137a3 3 0 0 0-.241-.51 1 1 0 0 0 .145-.227c.054-.13.114-.305.16-.535.097-.488.13-1.224-.153-2.066a1 1 0 0 0 .184-.226c.075-.123.16-.291.232-.49.144-.401.27-.965.27-1.61 0-.693-.07-1.34-.34-1.835-.286-.524-.7-.74-1.118-.804V2.467c0-.394-.227-.728-.498-.917A2 2 0 0 0 12 1.184c-.482 0-.939.087-1.244.16l-.006.001-.038.01a8 8 0 0 0-.41-.054c-.39-.05-.785-.155-1.131-.244l-.01-.003a4 4 0 0 0-.297-.008z" />
        </svg>
        <span>{count > 0 ? count : ""}</span>
        <span className={count > 0 ? "" : "text-slate-600"}>
          {voted ? "Helpful" : "Helpful?"}
        </span>
      </button>
      {error ? <span className="text-[11px] text-rose-700">{error}</span> : null}
    </div>
  );
}
