/**
 * users-permissions extension — link OAuth sign-in to existing local accounts.
 *
 * Default Strapi behavior: when /api/auth/google/callback fires for an email that
 * already exists in `up_users`, it tries to create a new row and hits the
 * unique-email constraint, returning HTTP 400 with "Email is already taken."
 *
 * That is the right protection if we DO NOT trust the OAuth provider. For Google,
 * the profile payload uses a verified email, so it's safe to attach the OAuth
 * sign-in to their existing local account instead of refusing the login.
 *
 * After this extension is in place:
 *   - Local account with email X exists.
 *   - User clicks "Continue with Google", Google returns email X.
 *   - We sign them in to the existing local account and mark it confirmed.
 *   - They can still log in with EITHER Google OR their original password.
 */

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
  services: { providers: ProvidersFactory } & Record<string, unknown>;
} & Record<string, unknown>;

export default (plugin: Plugin) => {
  const originalProvidersFactory = plugin.services.providers;

  plugin.services.providers = ({ strapi }: { strapi: StrapiInstance }): ProvidersService => {
    const original = originalProvidersFactory({ strapi });

    const connect: ProvidersService['connect'] = async (provider, query) => {
      const accessToken = (query.access_token as string) || (query.code as string) || (query.oauth_token as string);
      if (!accessToken) {
        throw new Error('No access_token.');
      }

      const providers = await strapi
        .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
        .get();

      const profile = await strapi
        .plugin('users-permissions')
        .service('providers-registry')
        .run({ provider, query, accessToken, providers });

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

      return original.connect(provider, query);
    };

    return {
      ...original,
      connect,
    };
  };

  return plugin;
};
