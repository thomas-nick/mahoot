import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const PROFILE_FIELDS = [
  'displayName',
  'bio',
  'city',
  'state',
  'country',
  'avatarUrl',
  'paypalHandle',
  'venmoHandle',
  'stripePaymentLinkUrl',
  'acceptsCashOnPickup',
  'ethAddress',
  'solAddress',
  'dotAddress',
  'ksmAddress',
  'btcAddress',
  'cryptoNotes',
  'pdgaNumber',
  'socialInstagram',
  'socialLine',
  'socialTwitter',
  'socialYoutube',
  'socialTiktok',
  'socialFacebook',
  'socialUdisc',
] as const;

const pickProfileFields = (raw: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      out[key] = raw[key];
    }
  }
  return out;
};

const pickPublicProfile = (row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      out[key] = row[key];
    }
  }
  if (typeof row.id === 'number') {
    out.id = row.id;
  } else if (typeof row.id === 'string' && row.id.trim() !== '') {
    const n = Number(row.id);
    if (Number.isFinite(n)) out.id = n;
  }
  if (typeof row.documentId === 'string') {
    out.documentId = row.documentId;
  }
  return out;
};

const pickPublicUser = (u: Record<string, unknown>) => {
  const id = typeof u.id === 'number' ? u.id : Number(u.id);
  if (!Number.isFinite(id)) {
    throw new errors.ApplicationError('Invalid user id');
  }
  return {
    id,
    documentId: typeof u.documentId === 'string' ? u.documentId : undefined,
    username: typeof u.username === 'string' ? u.username : null,
    confirmed: Boolean(u.confirmed),
    createdAt: typeof u.createdAt === 'string' ? u.createdAt : null,
  };
};

const requireDataObject = (body: unknown): Record<string, unknown> => {
  const dataPayload = (body as { data?: unknown } | null | undefined)?.data;
  if (!dataPayload || typeof dataPayload !== 'object' || Array.isArray(dataPayload)) {
    throw new errors.ValidationError('Missing "data" payload in the request body');
  }
  return dataPayload as Record<string, unknown>;
};

/**
 * Profile is owned by `user` (users-permissions). Strapi's content-API validator runs
 * `throwRestrictedRelations`, which calls `strapi.auth.verify(auth, { scope: 'plugin::users-permissions.user.find' })`.
 * The Authenticated role does not have that scope by default, so any body referencing
 * `user` (or any user relation) throws `Invalid key user`.
 *
 * We bypass validateInput, whitelist the writable scalar fields ourselves, and attach
 * the owning user server-side from `ctx.state.user`.
 */
export default factories.createCoreController('api::profile.profile', ({ strapi }) => ({
  /**
   * Public server-side resolve for `/u/:username`.
   * Uses the Document Service so we are not blocked by REST sanitization stripping `user`
   * from profile list responses or by disabled `user.find` for the Public role.
   */
  async lookupPublic(ctx) {
    const q = ctx.query as { username?: string | string[] };
    const raw0 = Array.isArray(q.username) ? q.username[0] : q.username;
    const raw = String(raw0 ?? '').trim();
    if (!raw) {
      throw new errors.ValidationError('Missing username');
    }
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    decoded = decoded.trim();
    if (!decoded) {
      throw new errors.ValidationError('Missing username');
    }

    const variants = Array.from(new Set([decoded, decoded.toLowerCase()].filter(Boolean)));

    const findProfileBundle = async (usernameFilter: string) => {
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            username: { $eqi: usernameFilter },
          },
        },
        populate: ['user'],
        limit: 1,
      });
      const profile = profiles[0] as Record<string, unknown> | undefined;
      if (!profile) {
        return null;
      }
      const u = profile.user as Record<string, unknown> | undefined;
      if (!u?.id || u.blocked) {
        return null;
      }
      const { user: _drop, ...profileRest } = profile;
      return { user: pickPublicUser(u), profile: pickPublicProfile(profileRest) };
    };

    const findUserOnly = async (usernameFilter: string) => {
      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { username: { $eqi: usernameFilter } },
        limit: 1,
      });
      const u = users[0] as Record<string, unknown> | undefined;
      if (!u?.id || u.blocked) {
        return null;
      }
      return { user: pickPublicUser(u), profile: null };
    };

    for (const v of variants) {
      const bundle = await findProfileBundle(v);
      if (bundle) {
        return ctx.send({ data: bundle });
      }
    }
    for (const v of variants) {
      const bundle = await findUserOnly(v);
      if (bundle) {
        return ctx.send({ data: bundle });
      }
    }

    throw new errors.NotFoundError(`No user for username: ${decoded}`);
  },

  async create(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const data = pickProfileFields(requireDataObject(ctx.request.body));

    const authUser = ctx.state.user as { id: number; documentId?: string } | undefined;
    if (!authUser?.id) {
      throw new errors.UnauthorizedError();
    }

    const userLink =
      typeof authUser.documentId === 'string' && authUser.documentId.length > 0
        ? authUser.documentId
        : authUser.id;

    const entity = await strapi.documents('api::profile.profile').create({
      ...sanitizedQuery,
      data: { ...data, user: userLink } as never,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    ctx.status = 201;
    return this.transformResponse(sanitizedEntity);
  },

  async update(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const documentId = (ctx.params as { id?: string })?.id;
    if (!documentId) {
      throw new errors.ValidationError('Missing document id in route params');
    }

    const data = pickProfileFields(requireDataObject(ctx.request.body));

    const entity = await strapi.documents('api::profile.profile').update({
      ...sanitizedQuery,
      documentId,
      data: data as never,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
