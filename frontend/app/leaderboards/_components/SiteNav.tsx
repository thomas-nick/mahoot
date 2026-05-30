"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/leaderboards/manucup", label: "Manufacturers Cup" },
  { href: "/leaderboards/players", label: "Player Tour Stats" },
  { href: "/leaderboards/asia", label: "Asia Leaderboard" },
  { href: "/leaderboards/coverage", label: "Tournament Coverage" },
];

export function SiteNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="site-nav">
      <Link
        href="/leaderboards"
        className={`site-nav-link ${pathname === "/leaderboards" ? "site-nav-active" : ""}`}
      >
        ← All leaderboards
      </Link>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`site-nav-link ${active ? "site-nav-active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
