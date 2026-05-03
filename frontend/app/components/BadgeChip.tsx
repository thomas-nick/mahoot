import { type Badge, PALETTE_TOKENS } from "@/lib/badges";

type Size = "sm" | "md";

export function BadgeChip({ badge, size = "md" }: { badge: Badge; size?: Size }) {
  const tokens = PALETTE_TOKENS[badge.palette];
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const glyphSize = size === "sm" ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-[11px]";
  return (
    <span
      title={badge.description}
      className={`inline-flex items-center gap-1.5 rounded-full border ${tokens.border} ${tokens.bg} ${tokens.text} font-medium ${padding}`}
    >
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-full font-bold text-white ${tokens.chip} ${glyphSize}`}
      >
        {badge.glyph}
      </span>
      <span>{badge.label}</span>
    </span>
  );
}

export function BadgeStack({ badges, size = "md" }: { badges: Badge[]; size?: Size }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <BadgeChip key={badge.id} badge={badge} size={size} />
      ))}
    </div>
  );
}
