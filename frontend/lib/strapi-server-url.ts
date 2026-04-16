/**
 * Base URL for server-side requests to Strapi (Next.js RSC, Route Handlers).
 *
 * - Prefer `STRAPI_URL` so the Node server can reach Strapi on an internal host
 *   (e.g. Docker service name) while `NEXT_PUBLIC_STRAPI_URL` stays browser-facing.
 * - Default `127.0.0.1` avoids some environments where `localhost` resolves to IPv6
 *   first and nothing is listening on `[::1]:1337`.
 *
 * Client components that call Strapi from the browser must use `NEXT_PUBLIC_STRAPI_URL`
 * only — do not use this helper there.
 */
export function getStrapiServerUrl(): string {
  const raw =
    process.env.STRAPI_URL?.trim() ||
    process.env.NEXT_PUBLIC_STRAPI_URL?.trim() ||
    "http://127.0.0.1:1337";
  return raw.replace(/\/$/, "");
}

/** URL the browser can reach (CORS). Never use internal-only `STRAPI_URL` here. */
export function getStrapiBrowserUrl(): string {
  const raw = process.env.NEXT_PUBLIC_STRAPI_URL?.trim() || "http://127.0.0.1:1337";
  return raw.replace(/\/$/, "");
}
