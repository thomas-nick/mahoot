"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AUTH_TOKEN_KEY,
  clearAuthSession,
  readAuthToken,
  readAuthUser,
  subscribeToAuthChanges,
} from "@/lib/auth";
import { subscribeToNotificationChanges } from "@/lib/notifications";

type AuthUser = {
  username?: string;
  email?: string;
  confirmed?: boolean;
  avatarUrl?: string;
};

const initialFromName = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return trimmed.slice(0, 1).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
};

type NotifyCounts = {
  unreadMessages: number;
  offersAttention: number;
  totalAttention: number;
};

export function AccountBadge() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState<NotifyCounts | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setUser(readAuthUser<AuthUser>());
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotify(null);
      return;
    }
    const load = async () => {
      const token = readAuthToken();
      if (!token) return;
      try {
        const response = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as NotifyCounts;
        setNotify({
          unreadMessages: payload.unreadMessages ?? 0,
          offersAttention: payload.offersAttention ?? 0,
          totalAttention: payload.totalAttention ?? 0,
        });
      } catch {
        /* ignore */
      }
    };
    void load();
    const interval = window.setInterval(load, 90_000);
    const unsubNotify = subscribeToNotificationChanges(load);
    return () => {
      window.clearInterval(interval);
      unsubNotify();
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
      >
        Sign in
      </Link>
    );
  }

  const label = user.username ?? user.email ?? "Account";
  const verified = Boolean(user.confirmed);
  const initials = initialFromName(label);

  const onLogout = () => {
    clearAuthSession();
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setOpen(false);
  };

  const hasAttention = Boolean(notify && notify.totalAttention > 0);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-sm hover:border-slate-300"
      >
        {hasAttention ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white"
            aria-label="Unread marketplace activity"
          />
        ) : null}
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            aria-hidden
            className={`h-7 w-7 rounded-full object-cover ring-1 ${
              verified ? "ring-emerald-200" : "ring-amber-200"
            }`}
            title={verified ? "Email verified" : "Email not verified"}
          />
        ) : (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
              verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
            title={verified ? "Email verified" : "Email not verified"}
            aria-hidden
          >
            {initials}
          </span>
        )}
        <span className="hidden max-w-[10ch] truncate sm:inline">{label}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3 w-3 text-slate-500">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-lg"
        >
          <div className="px-2 py-2">
            <p className="truncate font-medium text-slate-900">{label}</p>
            <p className="truncate text-xs text-slate-500">
              {verified ? "Email verified" : "Email not verified"}
            </p>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
          >
            My account
          </Link>
          {user.username ? (
            <Link
              href={`/u/${encodeURIComponent(user.username)}`}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              Public profile
            </Link>
          ) : null}
          <Link
            href="/account?tab=submissions"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
          >
            My submissions
          </Link>
          <Link
            href="/account?tab=listings"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
          >
            My listings
          </Link>
          <Link
            href="/account?tab=saved"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
          >
            Saved
          </Link>
          <Link
            href="/account?tab=inbox"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
          >
            <span>Inbox</span>
            {notify && notify.unreadMessages > 0 ? (
              <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {notify.unreadMessages > 99 ? "99+" : notify.unreadMessages}
              </span>
            ) : null}
          </Link>
          <Link
            href="/account?tab=offers"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
          >
            <span>Offers</span>
            {notify && notify.offersAttention > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {notify.offersAttention > 99 ? "99+" : notify.offersAttention}
              </span>
            ) : null}
          </Link>
          <Link
            href="/admin-tools"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            role="menuitem"
            title="Visible only when your account has the Moderator role."
          >
            Moderation
          </Link>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            onClick={onLogout}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-rose-700 hover:bg-rose-50"
            role="menuitem"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
