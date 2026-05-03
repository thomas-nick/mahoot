import type { Core } from '@strapi/strapi';

/**
 * Setting `url` to an absolute URL is REQUIRED for OAuth (Google)
 * to redirect back correctly. Without it, the users-permissions plugin logs
 * a warning and the provider exchange fails with 400.
 *
 * For local dev, `PUBLIC_URL=http://localhost:1337`.
 * For prod, set `PUBLIC_URL=https://api.your-domain.com` (the URL clients hit).
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;
