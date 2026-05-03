import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const RATING_UID = 'api::course-rating.course-rating';
const VOTE_UID = 'api::course-rating-vote.course-rating-vote';

type RelationLike =
  | string
  | number
  | {
      id?: number | string;
      documentId?: string;
      connect?: Array<{ id?: number | string; documentId?: string } | number | string>;
    };

const requireDataObject = (body: unknown): Record<string, unknown> => {
  const dataPayload = (body as { data?: unknown } | null | undefined)?.data;
  if (!dataPayload || typeof dataPayload !== 'object' || Array.isArray(dataPayload)) {
    throw new errors.ValidationError('Missing "data" payload in the request body');
  }
  return dataPayload as Record<string, unknown>;
};

const resolveRatingDocumentId = async (raw: RelationLike | undefined): Promise<string | null> => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') {
    const found = await strapi.db.query(RATING_UID).findOne({
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
    }
  }
  return null;
};

const normalizeVoteValue = (raw: unknown): 1 | -1 => {
  const parsed = Number(raw);
  if (parsed === -1) return -1;
  return 1;
};

export default factories.createCoreController(VOTE_UID as any, ({ strapi }) => ({
  async create(ctx: any) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const raw = requireDataObject(ctx.request.body);
    const authUser = ctx.state.user as { id: number; documentId?: string } | undefined;
    if (!authUser?.id) throw new errors.UnauthorizedError();

    const ratingDocumentId = await resolveRatingDocumentId(raw.rating as RelationLike | undefined);
    if (!ratingDocumentId) throw new errors.ValidationError('rating is required');

    const value = normalizeVoteValue(raw.value);

    const userLink =
      typeof authUser.documentId === 'string' && authUser.documentId.length > 0
        ? authUser.documentId
        : authUser.id;

    const existing = await strapi.db.query(VOTE_UID).findOne({
      where: {
        rating: { documentId: ratingDocumentId },
        voter: { id: authUser.id },
      },
      select: ['id', 'documentId', 'value'],
    });

    let entity: any;
    if (existing) {
      entity = await strapi.documents(VOTE_UID).update({
        documentId: existing.documentId,
        data: { value } as never,
      });
    } else {
      entity = await strapi.documents(VOTE_UID).create({
        ...sanitizedQuery,
        data: { rating: ratingDocumentId, voter: userLink, value } as never,
      });
    }

    await refreshRatingCounts(strapi, ratingDocumentId);

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    ctx.status = existing ? 200 : 201;
    return this.transformResponse(sanitizedEntity);
  },

  async deleteByRating(ctx: any) {
    const authUser = ctx.state.user as { id: number } | undefined;
    if (!authUser?.id) throw new errors.UnauthorizedError();
    const ratingDocumentId = String(ctx.params?.ratingDocumentId ?? '').trim();
    if (!ratingDocumentId) throw new errors.ValidationError('ratingDocumentId is required');

    const existing = await strapi.db.query(VOTE_UID).findOne({
      where: {
        rating: { documentId: ratingDocumentId },
        voter: { id: authUser.id },
      },
      select: ['documentId'],
    });

    if (existing?.documentId) {
      await strapi.documents(VOTE_UID).delete({ documentId: existing.documentId });
      await refreshRatingCounts(strapi, ratingDocumentId);
    }

    ctx.status = 200;
    return this.transformResponse({ ok: true });
  },
}));

const refreshRatingCounts = async (strapi: any, ratingDocumentId: string) => {
  const votes = await strapi.documents(VOTE_UID).findMany({
    fields: ['value'],
    filters: { rating: { documentId: { $eq: ratingDocumentId } } },
    pagination: { page: 1, pageSize: 10000 },
  });
  let helpfulCount = 0;
  let notHelpfulCount = 0;
  for (const vote of votes) {
    if (vote.value === 1) helpfulCount += 1;
    else if (vote.value === -1) notHelpfulCount += 1;
  }
  await strapi.documents(RATING_UID).update({
    documentId: ratingDocumentId,
    data: { helpfulCount, notHelpfulCount },
  });
};
