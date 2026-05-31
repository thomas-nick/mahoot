"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const links: NavLink[] = [
  {
    href: "/leaderboards/manucup",
    label: "Manufacturers Cup",
    isActive: (p) => p.startsWith("/leaderboards/manucup"),
  },
  {
    href: "/leaderboards/players",
    label: "Player Tour Stats",
    isActive: (p) => p === "/leaderboards/players",
  },
  {
    href: "/leaderboards/coverage/players",
    label: "Players",
    isActive: (p) =>
      p.startsWith("/leaderboards/coverage/players") ||
      p.startsWith("/leaderboards/coverage/player/") ||
      p.startsWith("/leaderboards/coverage/matchup"),
  },
  {
    href: "/leaderboards/asia",
    label: "Asia Leaderboard",
    isActive: (p) => p.startsWith("/leaderboards/asia"),
  },
  {
    href: "/leaderboards/skins",
    label: "Tour Skins",
    isActive: (p) => p.startsWith("/leaderboards/skins"),
  },
  {
    href: "/leaderboards/coverage/worlds",
    label: "Worlds",
    isActive: (p) => p.startsWith("/leaderboards/coverage/worlds"),
  },
  {
    href: "/leaderboards/coverage",
    label: "Tournament Coverage",
    isActive: (p) => {
      if (p === "/leaderboards/coverage") return true;
      const rest = p.replace("/leaderboards/coverage/", "");
      if (!rest || rest.includes("/")) return false;
      return rest !== "players" && rest !== "worlds" && !rest.startsWith("player/") && rest !== "matchup";
    },
  },
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
        const active = link.isActive(pathname);
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
