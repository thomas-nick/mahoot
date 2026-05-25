// import type { Core } from '@strapi/strapi';

/**
 * The Strapi 5 content-API validator runs `throwRestrictedRelations`, which
 * checks that the requesting auth has `find` permission on the *target* of any
 * relation key referenced in the body, in `filters`, or in `populate`.
 *
 * Many of our content types (`profile.user`, `market-listing.seller`,
 * `market-favorite.user`, `market-offer.buyer`, `market-message.sender`,
 * `market-message.recipient`) point at `plugin::users-permissions.user`. By
 * default the Authenticated role does NOT have `find` on that content type, so
 * any request that touches one of those relations fails with
 * `400 ValidationError "Invalid key <relation>"`, and any populated relation is
 * silently stripped from responses.
 *
 * Granting `plugin::users-permissions.user.find` to the Authenticated role
 * unblocks all of those code paths (filters, populates, and write bodies).
 * The user record itself is still gated by sanitizers (we only ever populate
 * `username`/`email`/`id` from the listing pages), so this is safe.
 */
const ENSURED_AUTHENTICATED_PERMISSIONS = [
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  // Helpful-vote endpoints. `create` writes a vote; `deleteByRating` removes
  // the caller's vote. `find`/`findOne` lets the client check their own vote.
  'api::disc-rating-vote.disc-rating-vote.create',
  'api::disc-rating-vote.disc-rating-vote.find',
  'api::disc-rating-vote.disc-rating-vote.findOne',
  'api::disc-rating-vote.disc-rating-vote.deleteByRating',
  'api::course-rating-vote.course-rating-vote.create',
  'api::course-rating-vote.course-rating-vote.find',
  'api::course-rating-vote.course-rating-vote.findOne',
  'api::course-rating-vote.course-rating-vote.deleteByRating',
  // Marketplace: a logged-in user can list, browse, manage, and message.
  // Ownership/visibility is enforced inside each controller.
  'api::market-listing.market-listing.find',
  'api::market-listing.market-listing.findOne',
  'api::market-listing.market-listing.create',
  'api::market-listing.market-listing.update',
  'api::market-listing.market-listing.delete',
  'api::market-favorite.market-favorite.find',
  'api::market-favorite.market-favorite.findOne',
  'api::market-favorite.market-favorite.create',
  'api::market-favorite.market-favorite.delete',
  'api::market-offer.market-offer.find',
  'api::market-offer.market-offer.findOne',
  'api::market-offer.market-offer.create',
  'api::market-offer.market-offer.update',
  'api::market-offer.market-offer.delete',
  'api::market-message.market-message.find',
  'api::market-message.market-message.findOne',
  'api::market-message.market-message.create',
  // `update` is used to mark a message as read.
  'api::market-message.market-message.update',
  // Profile (own settings, payment handles): Authenticated users need read +
  // create + update of profile rows. Ownership is enforced inside the
  // controller by attaching ctx.state.user to writes.
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::profile.profile.create',
  'api::profile.profile.update',
];

const ENSURED_PUBLIC_PERMISSIONS = [
  // Public marketplace browse / listing detail must be able to render the seller
  // username, so we also grant the Public role `find`/`findOne` on user. The
  // sanitizer still enforces the field-level allowlist set by the populate
  // queries (we only ever populate `username` / `email` / `id`).
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  // Reading aggregated vote counts is public (already denormalized on the
  // rating), but `find`/`findOne` on the votes themselves stays open so
  // logged-out viewers can see thumbs-up totals if we ever surface them.
  'api::disc-rating-vote.disc-rating-vote.find',
  'api::disc-rating-vote.disc-rating-vote.findOne',
  'api::course-rating-vote.course-rating-vote.find',
  'api::course-rating-vote.course-rating-vote.findOne',
  // Public marketplace browse + listing detail. Sellers' personal contact
  // details are gated by the listing controller's sanitizer.
  'api::market-listing.market-listing.find',
  'api::market-listing.market-listing.findOne',
  // Public profile pages (/u/[username]) need to render counts of approved
  // submissions and active listings without requiring login.
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::disc-submission.disc-submission.find',
  'api::disc-submission.disc-submission.findOne',
  'api::course-submission.course-submission.find',
  'api::course-submission.course-submission.findOne',
];

const ensureRolePermissions = async (
  strapi: any,
  roleType: 'authenticated' | 'public',
  actions: string[],
) => {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });
  if (!role?.id) return;

  for (const action of actions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: role.id } });
    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: role.id } });
      strapi.log.info(`[bootstrap] Granted ${roleType} role: ${action}`);
    }
  }
};

const ensureAuthenticatedPermissions = async ({ strapi }: { strapi: any }) => {
  try {
    await ensureRolePermissions(strapi, 'authenticated', ENSURED_AUTHENTICATED_PERMISSIONS);
    await ensureRolePermissions(strapi, 'public', ENSURED_PUBLIC_PERMISSIONS);
  } catch (error) {
    strapi.log.warn(
      `[bootstrap] Could not ensure user-relation permissions: ${(error as Error).message}`
    );
  }
};

/**
 * Strip any query string from a Grant `callback` URL so Grant's
 * `${callback}?${qs.stringify(output)}` never produces `?provider=line?id_token=...`.
 * The front-end remembers the provider in `sessionStorage`.
 */
const sanitizeFrontendCallback = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const qIdx = trimmed.indexOf('?');
  return qIdx >= 0 ? trimmed.slice(0, qIdx) : trimmed;
};

/**
 * Merge LINE OAuth credentials from env into the users-permissions `grant` store.
 * Registers `state` + `nonce` so Grant generates CSRF/OIDC parameters (LINE requires `state`).
 */
const seedLineGrantConfig = async ({ strapi }: { strapi: any }) => {
  try {
    const channelId = (process.env.LINE_CHANNEL_ID || '').trim();
    const channelSecret = (process.env.LINE_CHANNEL_SECRET || '').trim();
    const frontendCallbackRaw = (process.env.LINE_FRONTEND_CALLBACK || '').trim();
    const frontendCallback = sanitizeFrontendCallback(frontendCallbackRaw);
    const enabledFlag = (process.env.LINE_ENABLED || '').toLowerCase();
    const enabled =
      enabledFlag === 'true'
        ? true
        : enabledFlag === 'false'
          ? false
          : Boolean(channelId && channelSecret);

    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const current = (await pluginStore.get({ key: 'grant' })) || {};
    const currentLine = current.line || {};
    const nextLine = {
      ...currentLine,
      enabled,
      state: true,
      nonce: true,
      response: ['tokens'],
      ...(channelId ? { key: channelId } : {}),
      ...(channelSecret ? { secret: channelSecret } : {}),
      ...(frontendCallback ? { callback: frontendCallback } : {}),
    };
    if (JSON.stringify(currentLine) !== JSON.stringify(nextLine)) {
      await pluginStore.set({ key: 'grant', value: { ...current, line: nextLine } });
      strapi.log.info(
        `[bootstrap] Updated LINE grant config (enabled=${enabled}, key=${channelId ? 'set' : 'empty'}, callback=${frontendCallback ? 'set' : 'unchanged'})`,
      );
    }
    if (frontendCallbackRaw && frontendCallbackRaw !== frontendCallback) {
      strapi.log.warn(
        `[bootstrap] Stripped query string from LINE_FRONTEND_CALLBACK (${frontendCallbackRaw} -> ${frontendCallback}); the front-end reads the provider from sessionStorage.`,
      );
    }

    // Print the exact URL LINE Developers must whitelist for this Strapi.
    const apiPrefix = strapi.config.get('api.rest.prefix') || '/api';
    const publicUrl = (process.env.PUBLIC_URL || strapi.config.get('server.url') || '').replace(/\/$/, '');
    if (enabled && publicUrl) {
      strapi.log.info(
        `[line-oauth] Strapi will send redirect_uri=${publicUrl}${apiPrefix}/connect/line/callback ` +
          `to LINE for both /authorize and /token. This EXACT URL must appear in the ` +
          `LINE Developers console (Login channel -> LINE Login settings -> Callback URL).`,
      );
    }
  } catch (error) {
    strapi.log.warn(`[bootstrap] Could not seed LINE grant config: ${(error as Error).message}`);
  }
};

/**
 * Wrap Grant's OAuth 2 `access` flow so the LINE token-exchange response is
 * mirrored into Strapi logs. Without this, LINE's `invalid_grant` /
 * "Malformed auth code." only reaches the browser via Grant's redirect; the
 * server logs say nothing about *why* LINE rejected the code.
 */
/**
 * On `/api/connect/<provider>/callback`, Grant looks up the provider config
 * from `ctx.session.grant.provider` (NOT the URL path). If a previous OAuth
 * attempt (e.g. Google) left `session.grant.provider='google'` and the new
 * `/api/connect/line` request failed to overwrite the cookie, the LINE
 * callback ends up exchanging LINE's `code` at Google's `/token`, which
 * always fails `invalid_grant`. This middleware logs session/cookie state
 * for every `/api/connect/*` round trip and forces
 * `session.grant.provider` to match the URL path on callbacks.
 */
const installOAuthSessionGuard = (strapi: any) => {
  try {
    const koaApp = strapi.server.app;
    koaApp.use(async (ctx: any, next: any) => {
      const path: string = ctx.path || '';
      const m = path.match(/^\/api\/connect\/([^\/]+)(?:\/([^\/]+))?\/?$/);
      const isConnect = Boolean(m);
      const urlProvider = m && m[1];
      const isCallback = m && m[2] === 'callback';
      if (isConnect) {
        const incomingCookie = ctx.headers.cookie || '';
        const cookieNames = incomingCookie
          .split(';')
          .map((c: string) => c.trim().split('=')[0])
          .filter(Boolean)
          .join(',');
        const sessGrant = (ctx.session && ctx.session.grant) || null;
        process.stderr.write(
          `[oauth-guard] PRE  ${ctx.method} ${path} ` +
            `url_provider=${urlProvider} is_callback=${isCallback} ` +
            `session.grant=${JSON.stringify(sessGrant)} ` +
            `cookies=${cookieNames}\n`,
        );
        if (isCallback && ctx.session) {
          const old = ctx.session.grant && ctx.session.grant.provider;
          if (!ctx.session.grant || old !== urlProvider) {
            ctx.session.grant = { provider: urlProvider };
            process.stderr.write(
              `[oauth-guard] FIX  reset session.grant (was provider=${old}) ` +
                `forcing provider=${urlProvider} on ${path}\n`,
            );
          }
        }
      }
      await next();
      if (isConnect) {
        const sessGrant = (ctx.session && ctx.session.grant) || null;
        const setCookie = ctx.response.headers['set-cookie'];
        const setCookieNames = Array.isArray(setCookie)
          ? setCookie.map((c: string) => String(c).split('=')[0]).join(',')
          : '';
        process.stderr.write(
          `[oauth-guard] POST ${ctx.method} ${path} status=${ctx.status} ` +
            `session.grant=${JSON.stringify(sessGrant)} ` +
            `set_cookie_names=${setCookieNames}\n`,
        );
      }
    });
    process.stderr.write('[oauth-guard] middleware installed.\n');
    strapi.log.info('[oauth-guard] middleware installed.');
  } catch (error) {
    strapi.log.warn(`[oauth-guard] could not install: ${(error as Error).message}`);
  }
};

const installLineOAuthLogger = (strapi: any) => {
  try {
    const oauth2 = require('grant/lib/flow/oauth2');
    if ((oauth2 as any).__mahootLogged) return;
    const original = oauth2.access;
    oauth2.access = ({ request }: { request: unknown }) => {
      const inner = original({ request });
      return async (input: any) => {
        let result: any;
        try {
          result = await inner(input);
        } catch (callErr) {
          process.stderr.write(
            `[line-oauth] inner threw: ${(callErr as Error).message}\n`,
          );
          throw callErr;
        }
        try {
          const provider = result?.provider || input?.provider || {};
          const out = result?.output ?? {};
          process.stderr.write(
            `[line-oauth] access ran. provider=${provider.name} ` +
              `redirect_uri=${provider.redirect_uri} client_id=${provider.key} ` +
              `has_error=${Boolean(out && (out as any).error)}\n`,
          );
          if (out && (out as any).error) {
            const err = (out as any).error;
            const errCode = typeof err === 'string' ? err : (err.error ?? '');
            const errDesc =
              typeof err === 'string' ? '' : (err.error_description ?? '');
            const msg =
              `[line-oauth] Token exchange FAILED. error=${errCode || JSON.stringify(err)} ` +
              `description=${errDesc} ` +
              `redirect_uri=${provider.redirect_uri} client_id=${provider.key}`;
            try { strapi.log.error(msg); } catch (_) { /* ignore */ }
            process.stderr.write(msg + '\n');
            if (errCode === 'invalid_grant') {
              const fixMsg =
                `[line-oauth] FIX: in the LINE Developers console open your Login channel -> ` +
                `LINE Login settings, and ensure the Callback URL contains EXACTLY ` +
                `${provider.redirect_uri} (same scheme, host, path, no trailing slash). ` +
                `Also confirm LINE_CHANNEL_ID matches that channel.`;
              try { strapi.log.error(fixMsg); } catch (_) { /* ignore */ }
              process.stderr.write(fixMsg + '\n');
            }
          } else if (String(provider.name || '').toLowerCase() === 'line') {
            const okMsg =
              `[line-oauth] Token exchange OK (id_token=${out?.id_token ? 'yes' : 'no'}, ` +
              `access_token=${out?.access_token ? 'yes' : 'no'}).`;
            try { strapi.log.info(okMsg); } catch (_) { /* ignore */ }
            process.stderr.write(okMsg + '\n');
          }
        } catch (logErr) {
          process.stderr.write(
            `[line-oauth] logger error: ${(logErr as Error).message}\n`,
          );
        }
        return result;
      };
    };
    (oauth2 as any).__mahootLogged = true;
    const installMsg = `[line-oauth] Token-exchange logger installed (oauth2.access patched at ${new Date().toISOString()}).`;
    strapi.log.info(installMsg);
    process.stderr.write(installMsg + '\n');
  } catch (error) {
    strapi.log.warn(`[line-oauth] Could not install token logger: ${(error as Error).message}`);
  }
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    await ensureAuthenticatedPermissions({ strapi });
    await seedLineGrantConfig({ strapi });
    installLineOAuthLogger(strapi);
    installOAuthSessionGuard(strapi);
  },
};
