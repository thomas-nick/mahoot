export const AUTH_TOKEN_KEY = "mahoot_auth_jwt";
export const AUTH_USER_KEY = "mahoot_auth_user";

export const readAuthToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
};

export const writeAuthSession = (token: string, user: unknown) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? null));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

export const readAuthUser = <T>() => {
  if (typeof window === "undefined") {
    return null as T | null;
  }
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null as T | null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
};
