/** Logo files live in dashboard/public/logos/ — keys are manufacturer names from the data. */

const LOGO_FILES: Record<string, string> = {
  // Manufacturers Cup brands (MPO/FPO)
  Discraft: "discraft.png",
  Innova: "innova.png",
  Discmania: "discmania.png",
  MVP: "mvp.png",
  DGA: "dga.png",
  "Latitude 64": "lat64.png",
  Latitude64: "lat64.png",
  Prodigy: "prodigy.png", // add prodigy.png when available
  DD: "dd.png",
  "Dynamic Discs": "dd.png",
  Kastaplast: "kasta.png",
  Infinite: "infinite.png",
  Westside: "Westside.png",
  Mint: "mint.png",
  OTB: "otb.png", // add otb.png when available
  ThoughtSpace: "thought.png",
  Clash: "clasg.png",

  // Extra brands (for future rosters)
  Axiom: "axiom.png",
  Streamline: "streamline.png",
  Gateway: "gateway.png",
  Legacy: "legacy.png",
  "Lone Star": "lonestar.png",
  Millennium: "millenium.png",
  ProDiscus: "prodiscus.png",
  RPM: "rpm.png",
  Yikun: "yikun.png",
};

/** Only brands with a file that actually exists on disk should load an <img>. */
export const BRANDS_WITH_LOGOS = new Set<string>(
  Object.keys(LOGO_FILES).filter((name) => {
    const file = LOGO_FILES[name];
    // OTB / Prodigy placeholders — no file yet
    if (file === "otb.png" || file === "prodigy.png") return false;
    return true;
  }),
);

export function hasLogo(manufacturer: string): boolean {
  return BRANDS_WITH_LOGOS.has(manufacturer);
}

export function brandSlug(manufacturer: string): string {
  const file = LOGO_FILES[manufacturer];
  if (file) return file.replace(/\.(png|svg)$/i, "");
  return manufacturer
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function brandLogoUrl(manufacturer: string): string {
  const file = LOGO_FILES[manufacturer];
  if (file) return `/logos/leaderboards/${file}`;
  return `/logos/leaderboards/${brandSlug(manufacturer)}.png`;
}

export function brandInitials(manufacturer: string): string {
  const cleaned = manufacturer.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const BRAND_COLORS: Record<string, string> = {
  Discmania: "#f59e0b",
  Discraft: "#2563eb",
  Innova: "#dc2626",
  "Latitude 64": "#0891b2",
  Latitude64: "#0891b2",
  MVP: "#7c3aed",
  Axiom: "#a855f7",
  Prodigy: "#059669",
  "Dynamic Discs": "#ca8a04",
  DD: "#ca8a04",
  Westside: "#64748b",
  Gateway: "#16a34a",
  DGA: "#0d9488",
  Kastaplast: "#475569",
  ThoughtSpace: "#8b5cf6",
  Clash: "#f97316",
  OTB: "#334155",
  Unknown: "#94a3b8",
};

export function brandColor(manufacturer: string): string {
  return BRAND_COLORS[manufacturer] ?? BRAND_COLORS.Unknown;
}
