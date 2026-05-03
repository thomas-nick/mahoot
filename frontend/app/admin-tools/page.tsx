"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { Badge, Button, Card, CardHeader, Notice, PageHeader } from "@/app/components/ui";

type Item = {
  kind: "disc" | "course";
  id: string;
  name: string;
  meta: string | null;
  moderation: string;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string | null;
  submittedBy: { id: number | null; label: string };
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; items: Item[]; moderator: { username?: string | null; roleName: string | null } }
  | { kind: "denied"; message: string }
  | { kind: "anonymous" }
  | { kind: "error"; message: string };

const moderationBadge = (status: string) => {
  if (status === "approved") return <Badge variant="success">approved</Badge>;
  if (status === "rejected") return <Badge variant="warn">rejected</Badge>;
  return <Badge>pending</Badge>;
};

export default function AdminToolsPage() {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [pendingId, setPendingId] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string>("");

  const load = useCallback(async () => {
    const token = readAuthToken();
    if (!token) {
      setState({ kind: "anonymous" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/moderation/queue", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        items?: Item[];
        moderator?: { username?: string | null; roleName: string | null };
        error?: string;
      };
      if (response.status === 401) {
        setState({ kind: "anonymous" });
        return;
      }
      if (response.status === 403) {
        setState({ kind: "denied", message: payload.error ?? "Not authorized." });
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load queue.");
      }
      setState({
        kind: "ready",
        items: payload.items ?? [],
        moderator: payload.moderator ?? { roleName: null },
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load queue.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribeToAuthChanges(() => {
      void load();
    });
  }, [load]);

  const decide = async (item: Item, decision: "approved" | "rejected") => {
    const token = readAuthToken();
    if (!token) return;
    setPendingId(`${item.kind}-${item.id}`);
    setActionMessage("");
    try {
      const response = await fetch("/api/moderation/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kind: item.kind, documentId: item.id, decision }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Decision failed.");
      }
      setActionMessage(`${item.kind === "disc" ? "Disc" : "Course"} "${item.name}" ${decision}.`);
      await load();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Decision failed.");
    } finally {
      setPendingId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation"
        description="Review pending disc and course submissions. Approve to publish, reject to remove from the queue."
      />

      {state.kind === "anonymous" ? (
        <Notice variant="info">
          <Link href="/account?next=/admin-tools" className="font-medium text-slate-900 underline">
            Sign in
          </Link>{" "}
          with a Moderator account to review submissions.
        </Notice>
      ) : null}

      {state.kind === "denied" ? <Notice variant="warn">{state.message}</Notice> : null}

      {state.kind === "loading" || state.kind === "idle" ? (
        <Card>
          <p className="text-sm text-slate-500">Loading queue…</p>
        </Card>
      ) : null}

      {state.kind === "error" ? <Notice variant="error">{state.message}</Notice> : null}

      {state.kind === "ready" ? (
        <>
          <Card>
            <CardHeader
              title={`${state.items.length} submission${state.items.length === 1 ? "" : "s"} awaiting review`}
              description={
                state.moderator.roleName
                  ? `Acting as @${state.moderator.username ?? "moderator"} (${state.moderator.roleName})`
                  : undefined
              }
            />
            {actionMessage ? <Notice variant="info">{actionMessage}</Notice> : null}
          </Card>

          {state.items.length === 0 ? (
            <Notice variant="success">Inbox zero. Nothing pending.</Notice>
          ) : (
            <ul className="space-y-3">
              {state.items.map((item) => {
                const tokenKey = `${item.kind}-${item.id}`;
                const isPending = pendingId === tokenKey;
                return (
                  <li key={tokenKey}>
                    <Card>
                      <div className="flex flex-wrap gap-4">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-24 w-24 shrink-0 rounded-xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                            No photo
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-slate-500">
                              {item.kind}
                            </span>
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            {moderationBadge(item.moderation)}
                          </div>
                          <p className="text-xs text-slate-500">
                            {[
                              item.meta,
                              `Submitted by ${item.submittedBy.label}`,
                              item.createdAt ? new Date(item.createdAt).toLocaleString() : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {item.notes ? (
                            <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                              {item.notes}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isPending}
                              onClick={() => void decide(item, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isPending}
                              onClick={() => void decide(item, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
