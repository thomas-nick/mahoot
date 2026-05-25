/**
 * users-permissions extension — link OAuth sign-in to existing local accounts.
 *
 * Default Strapi behavior: when /api/auth/google/callback fires for an email that
 * already exists in `up_users`, it tries to create a new row and hits the
 * unique-email constraint, returning HTTP 400 with "Email is already taken."
 *
 * For Google (verified email), we attach OAuth sign-in to the existing local
 * account instead of refusing the login.
 *
 * LINE: registers a custom `line` provider in the providers registry (Grant +
 * id_token verify + profile fallback). LINE often has no email; we use a stable
 * synthetic address `{sub}@line.local` so repeat logins map to the same user.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const urlJoin = require('url-join') as typeof import('url-join');

type ProvidersService = {
  connect: (provider: string, query: Record<string, unknown>) => Promise<unknown>;
  buildRedirectUri?: (provider?: string) => string;
};

type StrapiInstance = {
  db: {
    query: (uid: string) => {
      findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>>;
      update: (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Promise<Record<string, unknown>>;
    };
  };
  store: (args: { type: string; name: string; key: string }) => { get: () => Promise<unknown> };
  plugin: (name: string) => {
    service: (name: string) => { run: (args: Record<string, unknown>) => Promise<{ email?: string }> };
  };
};

type ProvidersFactory = (ctx: { strapi: StrapiInstance }) => ProvidersService;

type Plugin = {
  services: {
    providers: ProvidersFactory;
    'providers-registry': () => any;
  } & Record<string, unknown>;
} & Record<string, unknown>;

const looksLikeJwt = (value: string) => value.startsWith('eyJ');

export default (plugin: Plugin) => {
  const originalRegistryFactory = plugin.services['providers-registry'];

  plugin.services['providers-registry'] = () => {
    const registry = originalRegistryFactory();
    // `strapi` is a global set by Strapi before services load (same as core plugin).
    const globalStrapi = (global as any).strapi;
    const apiPrefix = globalStrapi.config.get('api.rest.prefix');
    const baseURL = urlJoin(globalStrapi.config.server.url, apiPrefix, 'auth');

    registry.add('line', {
      enabled: false,
      icon: 'comment',
      grantConfig: {
        key: '',
        secret: '',
        callbackUrl: `${baseURL}/line/callback`,
        scope: ['openid', 'profile', 'email'],
        // Grant only generates these when truthy; LINE requires `state` on authorize.
        state: true,
        nonce: true,
        // Omit Grant's default `raw` payload on redirect (avoids huge / truncated callback URLs).
        response: ['tokens'],
      },
      async authCallback({
        accessToken,
        query,
        providers,
        purest,
      }: {
        accessToken: string;
        query: Record<string, unknown>;
        providers: Record<string, any>;
        purest: (opts: { provider: string }) => any;
      }) {
        const lineChannelId = String(providers?.line?.key ?? '').trim();
        const accessFromQuery = String((query as { access_token?: string }).access_token ?? '').trim();
        const idTokenFromQuery = String((query as { id_token?: string }).id_token ?? '').trim();

        const idCandidate =
          idTokenFromQuery ||
          (looksLikeJwt(String(accessToken)) ? String(accessToken) : '') ||
          (looksLikeJwt(accessFromQuery) ? accessFromQuery : '');

        if (idCandidate && lineChannelId) {
          const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              id_token: idCandidate,
              client_id: lineChannelId,
            }).toString(),
          });
          const body = (await res.json()) as {
            sub?: string;
            name?: string;
            email?: string;
            error?: string;
            error_description?: string;
          };
          if (!res.ok) {
            throw new Error(
              body.error_description || body.error || 'LINE id_token verification failed.'
            );
          }
          if (!body.sub) {
            throw new Error('LINE verify response missing subject.');
          }
          const emailRaw =
            typeof body.email === 'string' && body.email.trim()
              ? body.email.trim().toLowerCase()
              : `${String(body.sub)}@line.local`;
          return {
            username: body.name || String(body.sub),
            email: emailRaw,
          };
        }

        const bearer = String(accessToken || accessFromQuery || '').trim();
        if (!bearer) {
          throw new Error('No LINE access token or id_token.');
        }

        const line = purest({ provider: 'line' });
        const { body } = await line.get('profile').auth(bearer).request();
        const userId = String(body.userId);
        return {
          username: body.displayName || userId,
          email: `${userId}@line.local`,
        };
      },
    });

    return registry;
  };

  const originalProvidersFactory = plugin.services.providers;

  plugin.services.providers = ({ strapi }: { strapi: StrapiInstance }): ProvidersService => {
    const original = originalProvidersFactory({ strapi });

    const connect: ProvidersService['connect'] = async (provider, query) => {
      let accessToken =
        (query.access_token as string) || (query.code as string) || (query.oauth_token as string);
      if (!accessToken && provider === 'line') {
        accessToken = (query.id_token as string) || '';
      }
      if (!accessToken) {
        throw new Error('No access_token.');
      }

      const proxyQuery =
        provider === 'line'
          ? { ...query, access_token: accessToken || query.access_token }
          : { ...query, access_token: accessToken };

      const providers = await strapi
        .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
        .get();

      const profile = await strapi
        .plugin('users-permissions')
        .service('providers-registry')
        .run({ provider, query: proxyQuery, accessToken, providers });

      const email = String(profile?.email ?? '').toLowerCase();
      if (!email) {
        throw new Error('Email was not available.');
      }

      const users = await strapi.db
        .query('plugin::users-permissions.user')
        .findMany({ where: { email } });

      const sameProviderUser = users.find((u) => u.provider === provider);
      if (sameProviderUser) {
        return sameProviderUser;
      }

      if (users.length > 0) {
        const existing = users[0];
        if (!existing.confirmed) {
          await strapi.db
            .query('plugin::users-permissions.user')
            .update({ where: { id: existing.id }, data: { confirmed: true } });
          return { ...existing, confirmed: true };
        }
        return existing;
      }

      return original.connect(provider, proxyQuery);
    };

    return {
      ...original,
      connect,
    };
  };

  return plugin;
};
