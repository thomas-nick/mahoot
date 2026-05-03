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
