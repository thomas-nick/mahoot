export type PublicSocialLink = {
  id: string;
  label: string;
  href: string;
};

const trim = (s: string) => s.trim();

const withHttps = (raw: string): string => {
  const t = trim(raw);
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
};

/** Instagram: URL, or @handle / handle → instagram.com/{handle} */
export function instagramHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  if (/instagram\.com/i.test(t) || /^https?:\/\//i.test(t)) {
    return withHttps(t);
  }
  const h = t.replace(/^@+/, "").replace(/[^\w.]/g, "");
  return h ? `https://www.instagram.com/${h}/` : null;
}

/** X / Twitter: URL or handle */
export function twitterHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  if (/^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\b/i.test(t)) {
    return withHttps(t);
  }
  const h = t.replace(/^@+/, "").replace(/[^\w]/g, "");
  return h ? `https://x.com/${h}` : null;
}

/** YouTube: full URL, or @channel / channel handle */
export function youtubeHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  if (/youtube\.com|youtu\.be/i.test(t) || /^https?:\/\//i.test(t)) {
    return withHttps(t);
  }
  const h = t.replace(/^@+/, "").replace(/\s+/g, "");
  return h ? `https://www.youtube.com/@${h}` : null;
}

/** TikTok: URL or handle */
export function tiktokHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  if (/tiktok\.com/i.test(t) || /^https?:\/\//i.test(t)) {
    return withHttps(t);
  }
  const h = t.replace(/^@+/, "").replace(/[^\w._]/g, "");
  return h ? `https://www.tiktok.com/@${h}` : null;
}

/** Facebook: expect pasted profile URL */
export function facebookHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  return withHttps(t);
}

/** UDisc or other pasted profile URL */
export function genericProfileHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  return withHttps(t);
}

/** LINE: add-friend / profile URL, or raw ID (we normalize to line.me/ti/p/~…) */
export function lineHref(raw: string): string | null {
  const t = trim(raw);
  if (!t) return null;
  if (/line\.me|line\.naver|line\.tc|^https?:\/\//i.test(t)) {
    return withHttps(t);
  }
  const id = t.replace(/^@+/, "").trim();
  if (!id) return null;
  const suffix = id.startsWith("~") ? id : `~${id}`;
  return `https://line.me/ti/p/${suffix}`;
}

export function pdgaPlayerHref(pdgaNumber: number): string {
  return `https://www.pdga.com/player/${pdgaNumber}`;
}

export function collectPublicSocialLinks(profile: {
  pdgaNumber?: number | null;
  socialInstagram?: string | null;
  socialTwitter?: string | null;
  socialYoutube?: string | null;
  socialTiktok?: string | null;
  socialFacebook?: string | null;
  socialUdisc?: string | null;
  socialLine?: string | null;
}): PublicSocialLink[] {
  const out: PublicSocialLink[] = [];

  if (typeof profile.pdgaNumber === "number" && Number.isFinite(profile.pdgaNumber) && profile.pdgaNumber > 0) {
    out.push({
      id: "pdga",
      label: `PDGA #${profile.pdgaNumber}`,
      href: pdgaPlayerHref(Math.trunc(profile.pdgaNumber)),
    });
  }

  const pairs: Array<{
    id: string;
    label: string;
    raw: string | null | undefined;
    build: (s: string) => string | null;
  }> = [
    { id: "instagram", label: "Instagram", raw: profile.socialInstagram, build: instagramHref },
    { id: "twitter", label: "X (Twitter)", raw: profile.socialTwitter, build: twitterHref },
    { id: "youtube", label: "YouTube", raw: profile.socialYoutube, build: youtubeHref },
    { id: "tiktok", label: "TikTok", raw: profile.socialTiktok, build: tiktokHref },
    { id: "facebook", label: "Facebook", raw: profile.socialFacebook, build: facebookHref },
    { id: "line", label: "LINE", raw: profile.socialLine, build: lineHref },
    { id: "udisc", label: "UDisc", raw: profile.socialUdisc, build: genericProfileHref },
  ];

  for (const { id, label, raw, build } of pairs) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const href = build(raw);
    if (href) out.push({ id, label, href });
  }

  return out;
}
