import { bayesScore } from '../../../../utils/bayes';

const DISC_RATING_UID = 'api::disc-rating.disc-rating';
const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const LEGACY_DISC_UID = 'api::disc.disc';

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const average = (values: number[]) => {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
};

const getDiscDocumentId = (entry: Record<string, any> | undefined): string | null => {
  if (!entry) return null;
  if (typeof entry.discDocumentId === 'string' && entry.discDocumentId.length > 0) {
    return entry.discDocumentId;
  }
  return null;
};

/**
 * `discDocumentId` may belong to either a `disc-variant` (current catalog)
 * or a legacy `disc`. Resolve once and update whichever exists.
 */
const findTargetDisc = async (
  strapi: any,
  discDocumentId: string,
): Promise<{ uid: string; documentId: string } | null> => {
  const variant = await strapi.documents(DISC_VARIANT_UID).findOne({
    documentId: discDocumentId,
    fields: ['documentId'],
  });
  if (variant?.documentId) {
    return { uid: DISC_VARIANT_UID, documentId: variant.documentId };
  }
  const legacy = await strapi.documents(LEGACY_DISC_UID).findOne({
    documentId: discDocumentId,
    fields: ['documentId'],
  });
  if (legacy?.documentId) {
    return { uid: LEGACY_DISC_UID, documentId: legacy.documentId };
  }
  return null;
};

const refreshDiscRatingAggregates = async (strapi: any, discDocumentId: string) => {
  const target = await findTargetDisc(strapi, discDocumentId);
  if (!target) return;

  const ratingService = strapi.documents(DISC_RATING_UID);
  const ratings = await ratingService.findMany({
    fields: ['overall'],
    filters: { discDocumentId: { $eq: discDocumentId } },
    pagination: { page: 1, pageSize: 10000 },
  });

  const overallScores: number[] = [];
  for (const rating of ratings) {
    const overall = asNumber(rating.overall);
    if (overall !== null) overallScores.push(overall);
  }

  const ratingAverageOverall = average(overallScores);
  const ratingCount = overallScores.length;
  const ratingBayesScore = bayesScore(ratingAverageOverall, ratingCount);

  await strapi.documents(target.uid).update({
    documentId: target.documentId,
    data: {
      ratingAverageOverall,
      ratingCount,
      ratingBayesScore,
    },
  });
};

export default {
  async afterCreate(event: any) {
    const id = getDiscDocumentId(event.result);
    if (id) await refreshDiscRatingAggregates(strapi, id);
  },

  async afterUpdate(event: any) {
    const previous = getDiscDocumentId(event.params?.data);
    const current = getDiscDocumentId(event.result);
    const ids = new Set([previous, current].filter(Boolean) as string[]);
    for (const id of ids) {
      await refreshDiscRatingAggregates(strapi, id);
    }
  },

  async afterDelete(event: any) {
    const id = getDiscDocumentId(event.result);
    if (id) await refreshDiscRatingAggregates(strapi, id);
  },
};
