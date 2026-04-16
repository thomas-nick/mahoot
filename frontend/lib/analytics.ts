"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: AnalyticsPayload }) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (eventName: string, payload?: AnalyticsPayload) => {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.plausible === "function") {
    window.plausible(eventName, payload ? { props: payload } : undefined);
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload ?? {});
  }
};
