import Image from "next/image";
import Link from "next/link";
import type { AsiaCountryPageConfig } from "@/lib/asia-regions";

type AsiaHubFlagHeroProps = {
  countries: AsiaCountryPageConfig[];
};

/** Regional hub header: mosaic of country flags linking into each sub-hub. */
export function AsiaHubFlagHero({ countries }: AsiaHubFlagHeroProps) {
  const withFlags = countries.filter((c) => c.iso2);

  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-slate-900 via-sky-900 to-violet-900 px-5 py-8 text-white shadow-[0_28px_64px_-24px_rgba(15,23,42,0.55)] ring-1 ring-white/10 sm:px-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-sky-400/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-10 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="min-w-0 text-center lg:max-w-xl lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/95">Regional hub</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Asia disc golf spotlight</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-sky-100/90 lg:mx-0">
            Southeast and East Asia — courses from the Mahoot directory, community profiles, and honest reviewer activity.
            Pick a flag to open that country&apos;s hub.
          </p>
        </div>

        {withFlags.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2.5 sm:justify-end lg:max-w-md">
            {withFlags.map((c) => {
              const raw = c.iso2?.trim().toLowerCase();
              if (!raw) return null;
              return (
                <Link
                  key={c.slug}
                  href={`/asia/${c.slug}`}
                  title={`${c.name} hub`}
                  className="group relative overflow-hidden rounded-xl border-2 border-white/25 bg-white/10 shadow-lg shadow-black/20 ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/15"
                >
                  <div className="relative h-11 w-[4.25rem] sm:h-12 sm:w-[4.6rem]">
                    <Image
                      src={`https://flagcdn.com/w160/${raw}.png`}
                      alt={`${c.name} — open hub`}
                      fill
                      className="object-cover transition group-hover:brightness-110"
                      sizes="80px"
                    />
                  </div>
                  <span className="sr-only">{c.name}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </header>
  );
}
