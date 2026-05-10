import Image from "next/image";

type AsiaCountryFlagHeroProps = {
  name: string;
  iso2?: string;
  subtitle: string;
};

/**
 * Prominent flag + title band for country hub pages. Uses official ISO 3166-1 alpha-2
 * codes with flagcdn (PNG) when `iso2` is set.
 */
export function AsiaCountryFlagHero({ name, iso2, subtitle }: AsiaCountryFlagHeroProps) {
  const code = iso2?.trim().toLowerCase();

  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-sky-100/95 via-white to-violet-100/85 px-5 py-7 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/[0.04] sm:px-8 sm:py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-sky-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[12%] top-1/2 h-32 w-64 -translate-y-1/2 rotate-[12deg] rounded-[3rem] bg-gradient-to-r from-white/50 to-transparent opacity-80"
      />

      <div className="relative flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:gap-10">
        {code ? (
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute -inset-3 -z-10 rotate-[8deg] rounded-[1.35rem] bg-gradient-to-br from-slate-900/12 to-sky-600/10 blur-[2px]"
            />
            <div className="relative overflow-hidden rounded-2xl border-[5px] border-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10">
              <div className="relative h-[5.75rem] w-[8.75rem] sm:h-[7.25rem] sm:w-[11rem]">
                <Image
                  src={`https://flagcdn.com/w320/${code}.png`}
                  alt={`Flag of ${name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 140px, 176px"
                  priority
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex h-[5.75rem] w-[8.75rem] shrink-0 items-center justify-center rounded-2xl border-[5px] border-white bg-gradient-to-br from-slate-100 to-slate-200 text-5xl shadow-xl sm:h-[7.25rem] sm:w-[11rem]"
            aria-hidden
          >
            🌏
          </div>
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-800/90">Asia spotlight</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{name}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mx-0">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
