"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readAuthUser } from "@/lib/auth";

type AuthUser = {
  username?: string;
  email?: string;
  confirmed?: boolean;
};

export function AccountBadge() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const load = () => {
      setUser(readAuthUser<AuthUser>());
    };

    load();
    window.addEventListener("storage", load);

    const interval = window.setInterval(load, 1000);
    return () => {
      window.removeEventListener("storage", load);
      window.clearInterval(interval);
    };
  }, []);

  if (!user) {
    return (
      <Link
        href="/account"
        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
      >
        Guest
      </Link>
    );
  }

  const label = user.username ?? user.email ?? "Account";
  const verified = Boolean(user.confirmed);

  return (
    <Link
      href="/account"
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
      title={verified ? "Email verified" : "Email not verified"}
    >
      {label} {verified ? "✓" : "!"}
    </Link>
  );
}
