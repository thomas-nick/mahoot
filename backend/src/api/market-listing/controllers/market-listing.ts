import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const LISTING_FIELDS = [
  'title',
  'description',
  'priceUsd',
  'currency',
  'condition',
  'status',
  'negotiable',
  'discDocumentId',
  'discExternalId',
  'discDisplayName',
  'imageUrl',
  'imageUrls',
  'plastic',
  'weightGrams',
  'colorStamp',
  'shipping',
  'shippingPriceUsd',
  'city',
  'country',
] as const;

const pickListingFields = (raw: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of LISTING_FIELDS) {
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
 * `seller` references users-permissions, which the Authenticated role can't `find`,
 * so the default validator throws `Invalid key seller`. We whitelist the listing fields
 * ourselves and attach the seller from the session.
 */
export default factories.createCoreController(
  'api::market-listing.market-listing' as never,
  ({ strapi }) => ({
    async create(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const data = pickListingFields(requireDataObject(ctx.request.body));

      const authUser = ctx.state.user as { id: number; documentId?: string } | undefined;
      if (!authUser?.id) {
        throw new errors.UnauthorizedError();
      }

      const sellerLink =
        typeof authUser.documentId === 'string' && authUser.documentId.length > 0
          ? authUser.documentId
          : authUser.id;

      const entity = await strapi
        .documents('api::market-listing.market-listing')
        .create({
          ...sanitizedQuery,
          data: { ...data, seller: sellerLink } as never,
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

      const data = pickListingFields(requireDataObject(ctx.request.body));

      const entity = await strapi
        .documents('api::market-listing.market-listing')
        .update({
          ...sanitizedQuery,
          documentId,
          data: data as never,
        });

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitizedEntity);
    },
  })
);
