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

/** Grant serializes nested API errors with qs (e.g. error[error]=invalid_grant). */
export function readGrantStyleOAuthError(search: URLSearchParams): {
  error: string;
  error_description: string;
} {
  const flatErr = (search.get("error") ?? "").trim();
  const flatDesc = (search.get("error_description") ?? "").trim();
  const nestErr = (search.get("error[error]") ?? "").trim();
  const nestDesc = (search.get("error[error_description]") ?? "").trim();
  return {
    error: flatErr || nestErr,
    error_description: flatDesc || nestDesc,
  };
}

const tryDecodeOAuth = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
};

/**
 * Regex fallback when URLSearchParams misses tokens (double `?`, unusual encoding,
 * or params only in hash while search is odd).
 */
export function scrapeOAuthParamsFromHref(href: string): {
  access_token: string;
  id_token: string;
  code: string;
  state: string;
  error: string;
  error_description: string;
  provider: string;
} {
  const empty = {
    access_token: "",
    id_token: "",
    code: "",
    state: "",
    error: "",
    error_description: "",
    provider: "",
  };
  if (!href) {
    return empty;
  }
  const keys = [
    "access_token",
    "id_token",
    "code",
    "state",
    "error",
    "error_description",
    "error[error]",
    "error[error_description]",
    "provider",
  ] as const;
  const out = { ...empty };
  for (const key of keys) {
    const escaped = key.replace(/[\\[\]]/g, "\\$&");
    const re = new RegExp(`[?&#]${escaped}=([^&#]*)`, "gi");
    let last: string | undefined;
    for (const m of href.matchAll(re)) {
      if (m[1] !== undefined && m[1] !== "") {
        last = m[1];
      }
    }
    if (last) {
      if (key === "error[error]") {
        out.error = tryDecodeOAuth(last);
      } else if (key === "error[error_description]") {
        out.error_description = tryDecodeOAuth(last);
      } else {
        out[key] = tryDecodeOAuth(last);
      }
    }
  }
  return out;
}
