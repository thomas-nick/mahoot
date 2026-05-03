"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readAuthToken, readAuthUser, subscribeToAuthChanges } from "@/lib/auth";
import { subscribeToNotificationChanges } from "@/lib/notifications";
import { Notice } from "@/app/components/ui";

type Message = {
  id?: number;
  documentId?: string;
  body?: string;
  createdAt?: string;
  readAt?: string | null;
  sender?: { id?: number; username?: string | null } | null;
  recipient?: { id?: number; username?: string | null } | null;
  listing?: { documentId?: string; title?: string } | null;
};

type Thread = {
  key: string;
  listingDocumentId: string;
  listingTitle: string;
  otherUserId: number;
  otherUsername: string;
  lastBody: string;
  lastAt: string;
  unread: boolean;
};

const groupIntoThreads = (messages: Message[], myId: number): Thread[] => {
  const sorted = [...messages].sort((a, b) =>
    String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
  );
  const map = new Map<string, Thread>();
  for (const message of sorted) {
    const listingId = message.listing?.documentId;
    if (!listingId) continue;
    const otherId = message.sender?.id === myId ? message.recipient?.id : message.sender?.id;
    if (!otherId) continue;
    const otherUsername =
      (message.sender?.id === myId ? message.recipient?.username : message.sender?.username) ?? "user";
    const key = `${listingId}::${otherId}`;
    const at = message.createdAt ?? "";
    const existing = map.get(key);
    if (!existing || at > existing.lastAt) {
      map.set(key, {
        key,
        listingDocumentId: listingId,
        listingTitle: message.listing?.title ?? "(untitled listing)",
        otherUserId: otherId,
        otherUsername,
        lastBody: message.body ?? "",
        lastAt: at,
        unread: false,
      });
    }
  }
  for (const message of sorted) {
    const listingId = message.listing?.documentId;
    if (!listingId) continue;
    const otherId = message.sender?.id === myId ? message.recipient?.id : message.sender?.id;
    if (!otherId) continue;
    const key = `${listingId}::${otherId}`;
    const inboundUnread =
      message.recipient?.id === myId && !message.readAt && message.sender?.id !== myId;
    if (inboundUnread) {
      const row = map.get(key);
      if (row) row.unread = true;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
};

export function Inbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = readAuthToken();
    const me = readAuthUser<{ id?: number }>();
    if (!token || !me?.id) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { messages?: Message[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load messages.");
      setThreads(groupIntoThreads(payload.messages ?? [], me.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubAuth = subscribeToAuthChanges(() => void load());
    const unsubNotify = subscribeToNotificationChanges(() => void load());
    return () => {
      unsubAuth();
      unsubNotify();
    };
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500">Loading inbox…</p>;
  if (error) return <Notice variant="error">{error}</Notice>;
  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">No conversations yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Open a listing, tap <span className="font-medium text-slate-900">Contact seller</span>, and send a
          message. When someone writes you about your listings, it shows up here automatically.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map((thread) => (
        <li key={thread.key}>
          <Link
            href={`/marketplace/${thread.listingDocumentId}`}
            className="block rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{thread.listingTitle}</p>
              <div className="flex shrink-0 items-center gap-2">
                {thread.unread ? (
                  <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    New
                  </span>
                ) : null}
                <span className="text-xs text-slate-500">
                  {thread.lastAt ? new Date(thread.lastAt).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">with @{thread.otherUsername}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-700">{thread.lastBody}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
