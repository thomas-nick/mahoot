export const POST_AUTH_REDIRECT_KEY = "mahoot_post_auth_redirect";

/** Only same-origin paths we allow after login (open redirect safe). */
export const getSafePostAuthPath = (raw: string | null | undefined): string | null => {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  if (value.includes("://") || value.includes("\\")) {
    return null;
  }
  const path = value.split("?")[0]?.split("#")[0] ?? "";
  if (path === "/submit-disc" || path === "/submit-course" || path === "/account") {
    return path;
  }
  return null;
};

export const rememberPostAuthRedirect = (path: string | null) => {
  if (typeof window === "undefined" || !path) {
    return;
  }
  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
};

export const clearPostAuthRedirect = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
};

export const consumePostAuthRedirect = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return getSafePostAuthPath(raw);
};
