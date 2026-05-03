import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

type RelationLike =
  | string
  | number
  | { id?: number | string; documentId?: string; connect?: Array<{ id?: number | string; documentId?: string } | number | string> };

const MESSAGE_FIELDS = ['body', 'readAt'] as const;

const pickMessageFields = (raw: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of MESSAGE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) out[key] = raw[key];
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

const resolveDocumentId = async (
  uid: 'api::market-listing.market-listing' | 'plugin::users-permissions.user',
  raw: RelationLike | undefined
): Promise<string | null> => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') {
    const found = await strapi.db.query(uid).findOne({ where: { id: raw }, select: ['documentId'] });
    return (found?.documentId as string | undefined) ?? null;
  }
  if (typeof raw === 'object') {
    if (typeof raw.documentId === 'string') return raw.documentId;
    if (Array.isArray(raw.connect) && raw.connect.length > 0) {
      const first = raw.connect[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && typeof first.documentId === 'string') return first.documentId;
      const numericId = typeof first === 'number' ? first : typeof first?.id === 'number' ? first.id : null;
      if (numericId != null) {
        const found = await strapi.db.query(uid).findOne({ where: { id: numericId }, select: ['documentId'] });
        return (found?.documentId as string | undefined) ?? null;
      }
    }
    if (typeof raw.id === 'number') {
      const found = await strapi.db.query(uid).findOne({ where: { id: raw.id }, select: ['documentId'] });
      return (found?.documentId as string | undefined) ?? null;
    }
  }
  return null;
};

/**
 * `sender`/`recipient` reference users-permissions which the Authenticated role
 * can't `find`, so any of those keys in the body fail validation. We attach
 * `sender` from the session and resolve `recipient`/`listing` to documentIds.
 */
export default factories.createCoreController('api::market-message.market-message' as never, ({ strapi }) => ({
  async create(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const raw = requireDataObject(ctx.request.body);
    const authUser = ctx.state.user as { id: number; documentId?: string } | undefined;
    if (!authUser?.id) throw new errors.UnauthorizedError();

    const listingDocumentId = await resolveDocumentId('api::market-listing.market-listing', raw.listing as RelationLike | undefined);
    if (!listingDocumentId) {
      throw new errors.ValidationError('listing is required');
    }
    const recipientDocumentId = await resolveDocumentId('plugin::users-permissions.user', raw.recipient as RelationLike | undefined);
    if (!recipientDocumentId) {
      throw new errors.ValidationError('recipient is required');
    }

    const senderLink =
      typeof authUser.documentId === 'string' && authUser.documentId.length > 0
        ? authUser.documentId
        : authUser.id;

    const data = pickMessageFields(raw);
    const entity = await strapi.documents('api::market-message.market-message').create({
      ...sanitizedQuery,
      data: {
        ...data,
        sender: senderLink,
        listing: listingDocumentId,
        recipient: recipientDocumentId,
      } as never,
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

    const data = pickMessageFields(requireDataObject(ctx.request.body));
    const entity = await strapi.documents('api::market-message.market-message').update({
      ...sanitizedQuery,
      documentId,
      data: data as never,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
