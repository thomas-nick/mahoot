import type { Core } from '@strapi/strapi';

function sessionCookieSecure(): boolean {
  const raw = process.env.SESSION_COOKIE_SECURE;
  if (raw === 'false') {
    return false;
  }
  if (raw === 'true') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  {
    name: 'strapi::session',
    config: {
      secure: sessionCookieSecure(),
    },
  },
  'strapi::favicon',
  'strapi::public',
];

export default config;
