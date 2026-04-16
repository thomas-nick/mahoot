/**
 * Strapi's OAuth redirect can append a second `?` when the configured front-end URL
 * already has a query string (e.g. `.../auth/callback?provider=google?id_token=...`),
 * which breaks URLSearchParams. Collapse inner `?` into `&`.
 */
export function repairOAuthSearchString(search: string): string {
  if (!search || search === "?") {
    return search;
  }
  const body = search.startsWith("?") ? search.slice(1) : search;
  const parts = body.split("?");
  if (parts.length <= 1) {
    return search.startsWith("?") ? search : `?${search}`;
  }
  return `?${parts[0]}&${parts.slice(1).join("&")}`;
}

/** Strip junk when a provider value was merged with another param (e.g. `google?id_token=`). */
export function normalizeOAuthProvider(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) {
    return "";
  }
  const head = t.split(/[?&#]/)[0] ?? "";
  return head;
}
