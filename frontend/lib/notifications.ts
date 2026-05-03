/**
 * Lightweight client-side signal so the header badge and account tabs can
 * refresh counts without polling aggressively. Fire after messages are read,
 * sent, offers change, or favorites toggle.
 */
export const NOTIFICATIONS_CHANGE_EVENT = "mahoot:notifications-changed";

export const emitNotificationsChanged = () => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGE_EVENT));
  } catch {
    /* no-op */
  }
};

export const subscribeToNotificationChanges = (listener: () => void): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(NOTIFICATIONS_CHANGE_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATIONS_CHANGE_EVENT, listener);
};
