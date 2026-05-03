import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

type RelationLike =
  | string
  | number
  | { id?: number | string; documentId?: string; connect?: Array<{ id?: number | string; documentId?: string } | number | string> };

const OFFER_FIELDS = ['priceUsd', 'note', 'status', 'counterPriceUsd', 'sellerNote'] as const;

const pickOfferFields = (raw: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of OFFER_FIELDS) {
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

const resolveListingDocumentId = async (raw: RelationLike | undefined): Promise<string | null> => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') {
    const found = await strapi.db.query('api::market-listing.market-listing').findOne({
      where: { id: raw },
      select: ['documentId'],
    });
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
        const found = await strapi.db.query('api::market-listing.market-listing').findOne({
          where: { id: numericId },
          select: ['documentId'],
        });
        return (found?.documentId as string | undefined) ?? null;
      }
    }
    if (typeof raw.id === 'number') {
      const found = await strapi.db.query('api::market-listing.market-listing').findOne({
        where: { id: raw.id },
        select: ['documentId'],
      });
      return (found?.documentId as string | undefined) ?? null;
    }
  }
  return null;
};

/**
 * `buyer` and `listing` are relations; the Authenticated role can't `find` users,
 * so any `buyer` key in the body fails validation. We attach `buyer` from session
 * and resolve `listing` to a documentId server-side.
 */
export default factories.createCoreController('api::market-offer.market-offer', ({ strapi }) => ({
  async create(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const raw = requireDataObject(ctx.request.body);
    const authUser = ctx.state.user as { id: number; documentId?: string } | undefined;
    if (!authUser?.id) throw new errors.UnauthorizedError();

    const listingDocumentId = await resolveListingDocumentId(raw.listing as RelationLike | undefined);
    if (!listingDocumentId) {
      throw new errors.ValidationError('listing is required');
    }

    const buyerLink =
      typeof authUser.documentId === 'string' && authUser.documentId.length > 0
        ? authUser.documentId
        : authUser.id;

    const data = pickOfferFields(raw);
    const entity = await strapi.documents('api::market-offer.market-offer').create({
      ...sanitizedQuery,
      data: { ...data, buyer: buyerLink, listing: listingDocumentId } as never,
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

    const data = pickOfferFields(requireDataObject(ctx.request.body));
    const entity = await strapi.documents('api::market-offer.market-offer').update({
      ...sanitizedQuery,
      documentId,
      data: data as never,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
