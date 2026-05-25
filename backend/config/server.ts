import type { Core } from '@strapi/strapi';

/**
 * OAuth (Grant) stores transient state in `koa-session`. In production the
 * session middleware defaults to `secure: true`, which requires the request
 * to look like HTTPS (`ctx.secure` / `X-Forwarded-Proto`).
 *
 * `proxy.koa` (toggle with `STRAPI_PROXY_KOA`) trusts `X-Forwarded-Proto` from
 * your reverse proxy. If Strapi is still reached over HTTP without that header
 * (e.g. app → localhost:1337), set `SESSION_COOKIE_SECURE=false` in `.env`.
 */
export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  app: {
    keys: env.array('APP_KEYS'),
  },
  proxy: {
    koa: env.bool('STRAPI_PROXY_KOA', true),
  },
});
