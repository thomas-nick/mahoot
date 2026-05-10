/**
 * Allowlisted Asia hub countries. `strapiCountry` must match the `country` field on
 * Strapi courses and profiles (e.g. "Thailand").
 */

export type AsiaCuratedSpotlight = {
  /** Mahoot username — shown only if the account resolves publicly. */
  username: string;
  blurb: string;
};

export type AsiaEventLink = {
  label: string;
  href: string;
  description?: string;
};

/** Curated photo, video, article, or social links for the Media tab. */
export type AsiaMediaItem = {
  title: string;
  href: string;
  kind?: "video" | "article" | "photo" | "social" | "other";
  description?: string;
  /** e.g. “YouTube”, local news outlet */
  sourceLabel?: string;
};

/** Past or notable PDGA-sanctioned events — link to the official event page on pdga.com when possible. */
export type AsiaPdgaHistoricalEvent = {
  title: string;
  href: string;
  year?: number;
  tier?: string;
  notes?: string;
};

export type AsiaCountryPageConfig = {
  slug: string;
  name: string;
  strapiCountry: string;
  iso2?: string;
  /** Short editorial paragraphs (plain text). */
  narrative: string[];
  curatedSpotlight: AsiaCuratedSpotlight[];
  eventLinks: AsiaEventLink[];
  /** Media tab — add YouTube features, albums, Instagram, local press, etc. */
  mediaItems?: AsiaMediaItem[];
  /** PDGA history tab — manually curated links to past events on PDGA. */
  pdgaHistory?: AsiaPdgaHistoricalEvent[];
};

export const ASIA_HUB_INTRO: string[] = [
  "Mahoot is building a global home for disc golf catalogs, course notes, and honest community ratings. This hub focuses on East and Southeast Asia, with select neighbors where the community is growing — national associations, school and university programs, and more destinations worth mapping every season.",
  "This hub highlights countries we are watching closely. Course lists pull from the same directory as the rest of Mahoot; community rows respect public profile rules. Rankings labeled “Active on Mahoot” measure reviews and helpful votes here — not PDGA ratings or tour finishes.",
  "National competitive rankings can land here when we have trustworthy, permissioned data. Until then, we will stay precise about what the numbers mean.",
];

export const ASIA_COUNTRY_PAGES: AsiaCountryPageConfig[] = [
  {
    slug: "thailand",
    name: "Thailand",
    strapiCountry: "Thailand",
    iso2: "TH",
    narrative: [
      "Thailand’s disc golf scene blends tropical destinations with rapidly improving infrastructure — from Chiang Mai highlands to Bangkok-area layouts.",
      "Use the course list to plan rounds, and the community directory to find locals already reviewing on Mahoot. Competitive depth will map cleanly once official results and ratings are part of the data we can cite.",
    ],
    curatedSpotlight: [],
    eventLinks: [
      {
        label: "PDGA Thailand events",
        href: "https://www.pdga.com",
        description: "Search PDGA sanctioned events by region (when listed).",
      },
    ],
  },
  {
    slug: "philippines",
    name: "Philippines",
    strapiCountry: "Philippines",
    iso2: "PH",
    narrative: [
      "The Philippines continues to invest in accessible courses and youth-friendly formats — a strong match for Mahoot’s community-first ratings.",
      "Help us keep course pins accurate: submit layouts you play and leave grounded reviews for travelers.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "japan",
    name: "Japan",
    strapiCountry: "Japan",
    iso2: "JP",
    narrative: [
      "Japan’s disc golf footprint spans manicured resort courses and tight urban-edge layouts — each with distinct maintenance and signage stories worth capturing.",
      "Mahoot’s reviews shine when locals explain what actually plays like in each season.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "south-korea",
    name: "South Korea",
    strapiCountry: "South Korea",
    iso2: "KR",
    narrative: [
      "South Korea’s outdoor culture and strong association scene make it a natural anchor for East Asian growth.",
      "If you represent a club or school program, reach out — we’d love to link official calendars alongside community reviews.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "singapore",
    name: "Singapore",
    strapiCountry: "Singapore",
    iso2: "SG",
    narrative: [
      "In compact cities, every permanent versus pop-up layout matters — course metadata and honest condition notes help visitors immensely.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "malaysia",
    name: "Malaysia",
    strapiCountry: "Malaysia",
    iso2: "MY",
    narrative: [
      "Malaysia’s mix of elevation and tropical weather makes upkeep and signage highly variable — the kind of detail Mahoot reviewers handle well.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "indonesia",
    name: "Indonesia",
    strapiCountry: "Indonesia",
    iso2: "ID",
    narrative: [
      "Island geography means clusters of play — accurate country and city tags on courses help travelers stitch together trips.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "vietnam",
    name: "Vietnam",
    strapiCountry: "Vietnam",
    iso2: "VN",
    narrative: [
      "Vietnam’s scene is emerging quickly; early course pages and reviews become the references the next wave of players rely on.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "taiwan",
    name: "Taiwan",
    strapiCountry: "Taiwan",
    iso2: "TW",
    narrative: [
      "Taiwan punches above its weight for technical golf and community organizing — spotlight locals who keep calendars accurate.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "china",
    name: "China",
    strapiCountry: "China",
    iso2: "CN",
    narrative: [
      "China’s disc golf footprint is uneven by region — resort destinations, metro-edge clubs, and newer layouts all benefit from clear pins and seasonal condition notes.",
      "Tag courses and cities consistently so travelers and locals can find each other on Mahoot.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "mongolia",
    name: "Mongolia",
    strapiCountry: "Mongolia",
    iso2: "MN",
    narrative: [
      "Mongolia’s wide-open landscapes suit dedicated course-builders and events — sparse coverage today makes every verified layout and review disproportionately valuable.",
      "If you host or maintain a course, help others find it with accurate country and city metadata.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
  {
    slug: "russia",
    name: "Russia",
    strapiCountry: "Russia",
    iso2: "RU",
    narrative: [
      "Disc golf in Russia spans European cities and huge Asian geographies — course density varies, so good directory data matters for trip planning.",
      "Mahoot lists mirror what you tag in Strapi; align spelling on profiles and courses so community and course filters stay in sync.",
    ],
    curatedSpotlight: [],
    eventLinks: [],
  },
];

const bySlug = new Map(ASIA_COUNTRY_PAGES.map((c) => [c.slug, c]));

export function getAsiaCountryConfig(slug: string): AsiaCountryPageConfig | null {
  const key = (slug ?? "").trim().toLowerCase();
  return bySlug.get(key) ?? null;
}

export function getAsiaCountrySlugs(): string[] {
  return ASIA_COUNTRY_PAGES.map((c) => c.slug);
}
