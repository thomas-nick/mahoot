"use client";

import Link from "next/link";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type SiteNavDiscFacets = {
  manufacturers: string[];
  types: string[];
};

type MenuId = "discs" | "contribute";

type MegaItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const iconClass = "h-5 w-5";

const contributeItems: MegaItem[] = [
  {
    href: "/submit-disc",
    label: "Add a disc",
    description: "Submit a mold, plastic, or variant to the catalog.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/submit-course",
    label: "Add a course",
    description: "Suggest a layout for the course directory.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
  },
];

const collectorLinks: { href: string; label: string; description: string }[] = [
  {
    href: "/collector",
    label: "Tour series & limited runs",
    description: "Special-edition discs across the catalog.",
  },
  {
    href: "/discs?productionStatus=oop",
    label: "Out-of-production discs",
    description: "Discontinued runs and OOP plastic.",
  },
  {
    href: "/marketplace/new",
    label: "List a disc",
    description: "Sell from your collection on the marketplace.",
  },
  {
    href: "/account",
    label: "Account & saved",
    description: "Watchlist, offers, and profile settings.",
  },
];

function MegaMenuPanel({
  items,
  onNavigate,
}: {
  items: MegaItem[];
  onNavigate: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
      role="menu"
    >
      <ul className="grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              role="menuitem"
              className="flex gap-3 rounded-xl p-3 text-left text-slate-700 outline-none transition hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiscsMegaPanel({
  facets,
  searchParams,
  onNavigate,
}: {
  facets: SiteNavDiscFacets;
  searchParams: ReadonlyURLSearchParams;
  onNavigate: () => void;
}) {
  const brand = searchParams.get("brand") ?? "";
  const category = searchParams.get("category") ?? "";

  const columnClass =
    "min-h-0 min-w-0 flex flex-col gap-1 border-slate-100 sm:border-r sm:pr-3 last:border-r-0 last:pr-0 sm:last:pl-1";

  const linkClass = (active: boolean) =>
    `block rounded-lg px-2 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
      active
        ? "bg-slate-900 font-medium text-white"
        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
      role="menu"
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <p className="text-sm font-semibold text-slate-900">Browse discs</p>
        <Link
          href="/discs"
          onClick={onNavigate}
          className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={columnClass}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Manufacturers
          </h3>
          <ul className="max-h-52 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
            {facets.manufacturers.length === 0 ? (
              <li className="text-xs text-slate-400">No brands yet</li>
            ) : (
              facets.manufacturers.map((name) => (
                <li key={name}>
                  <Link
                    href={`/discs?brand=${encodeURIComponent(name)}`}
                    onClick={onNavigate}
                    role="menuitem"
                    className={linkClass(brand === name)}
                  >
                    {name}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className={columnClass}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</h3>
          <ul className="max-h-52 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
            {facets.types.length === 0 ? (
              <li className="text-xs text-slate-400">No types yet</li>
            ) : (
              facets.types.map((name) => (
                <li key={name}>
                  <Link
                    href={`/discs?category=${encodeURIComponent(name)}`}
                    onClick={onNavigate}
                    role="menuitem"
                    className={linkClass(category === name)}
                  >
                    {name}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className={`${columnClass} sm:border-r-0`}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Collectors</h3>
          <ul className="space-y-1">
            {collectorLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  role="menuitem"
                  className="block rounded-lg px-2 py-2 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                >
                  <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MegaMenuTrigger({
  id,
  label,
  open,
  onOpen,
  onClose,
  active,
  children,
  panelWidthClass,
}: {
  id: MenuId;
  label: string;
  open: boolean;
  onOpen: (id: MenuId) => void;
  onClose: () => void;
  active: boolean;
  children: ReactNode;
  panelWidthClass: string;
}) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => onClose(), 120);
  }, [clearCloseTimer, onClose]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const triggerClasses = `inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm transition ${
    active || open
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer();
        onOpen(id);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`mega-${id}`}
        onClick={() => (open ? onClose() : onOpen(id))}
        className={triggerClasses}
      >
        {label}
        <ChevronDown open={open} />
      </button>
      {open ? (
        <div
          id={`mega-${id}`}
          className={`absolute left-0 top-full z-50 mt-2 ${panelWidthClass}`}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SiteNavClient({ discFacets }: { discFacets: SiteNavDiscFacets }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();

  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const onNavigate = () => setOpenMenu(null);

  const linkClasses = (active: boolean) =>
    `inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm transition ${
      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const isDiscsPath = pathname.startsWith("/discs");
  const isCoursesActive = pathname.startsWith("/courses");
  const isAsiaActive = pathname.startsWith("/asia");
  const isMarketplaceActive = pathname.startsWith("/marketplace");
  const isLeaderboardsActive = pathname.startsWith("/leaderboards");
  const isContributeActive = contributeItems.some((item) => pathname.startsWith(item.href));

  return (
    <nav ref={navRef} className="flex flex-wrap items-center gap-1">
      <MegaMenuTrigger
        id="discs"
        label="Discs"
        open={openMenu === "discs"}
        onOpen={(next) => setOpenMenu(next)}
        onClose={() => setOpenMenu(null)}
        active={isDiscsPath}
        panelWidthClass="w-[min(calc(100vw-1.5rem),42rem)] sm:w-[44rem]"
      >
        <DiscsMegaPanel facets={discFacets} searchParams={searchParams} onNavigate={onNavigate} />
      </MegaMenuTrigger>

      <Link href="/courses" className={linkClasses(isCoursesActive)}>
        Courses
      </Link>

      <Link href="/asia" className={linkClasses(isAsiaActive)}>
        Asia
      </Link>

      <Link href="/marketplace" className={linkClasses(isMarketplaceActive)}>
        Marketplace
      </Link>

      <Link href="/leaderboards" className={linkClasses(isLeaderboardsActive)}>
        Leaderboards
      </Link>

      <MegaMenuTrigger
        id="contribute"
        label="Contribute"
        open={openMenu === "contribute"}
        onOpen={(next) => setOpenMenu(next)}
        onClose={() => setOpenMenu(null)}
        active={isContributeActive}
        panelWidthClass="w-[min(calc(100vw-1.5rem),22rem)] sm:w-[24rem]"
      >
        <MegaMenuPanel items={contributeItems} onNavigate={onNavigate} />
      </MegaMenuTrigger>
    </nav>
  );
}
