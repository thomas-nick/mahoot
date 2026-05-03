export const AUTH_TOKEN_KEY = "mahoot_auth_jwt";
export const AUTH_USER_KEY = "mahoot_auth_user";
export const AUTH_CHANGE_EVENT = "mahoot:auth-changed";

const emitAuthChanged = () => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    /* old browsers — no-op */
  }
};

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
  emitAuthChanged();
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  emitAuthChanged();
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

/**
 * Subscribe to auth session changes (login, logout, profile refresh).
 * Listens to the same-tab `mahoot:auth-changed` event AND cross-tab `storage` events.
 */
export const subscribeToAuthChanges = (listener: () => void): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) {
      listener();
    }
  };
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
};
