import { bayesScore } from '../../../../utils/bayes';

const COURSE_RATING_UID = 'api::course-rating.course-rating';
const COURSE_UID = 'api::course.course';

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const average = (values: number[]) => {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
};

const getCourseDocumentId = (entry: Record<string, any> | undefined): string | null => {
  const relation = entry?.course;

  if (typeof relation === 'string') {
    return relation;
  }
  if (relation && typeof relation === 'object') {
    if (typeof relation.documentId === 'string') {
      return relation.documentId;
    }
    if (Array.isArray(relation.connect) && typeof relation.connect[0]?.documentId === 'string') {
      return relation.connect[0].documentId;
    }
    if (relation.connect && typeof relation.connect.documentId === 'string') {
      return relation.connect.documentId;
    }
  }

  return null;
};

const refreshCourseRatingAggregates = async (strapi: any, courseDocumentId: string) => {
  const ratingService = strapi.documents(COURSE_RATING_UID);
  const courseService = strapi.documents(COURSE_UID);

  const ratings = await ratingService.findMany({
    fields: ['overall', 'layout', 'signage', 'maintenance', 'scenery'],
    filters: {
      course: {
        documentId: {
          $eq: courseDocumentId,
        },
      },
    },
    pagination: {
      page: 1,
      pageSize: 10000,
    },
  });

  const overallScores: number[] = [];
  const layoutScores: number[] = [];
  const signageScores: number[] = [];
  const maintenanceScores: number[] = [];
  const sceneryScores: number[] = [];

  for (const rating of ratings) {
    const overall = asNumber(rating.overall);
    const layout = asNumber(rating.layout);
    const signage = asNumber(rating.signage);
    const maintenance = asNumber(rating.maintenance);
    const scenery = asNumber(rating.scenery);

    if (overall !== null) overallScores.push(overall);
    if (layout !== null) layoutScores.push(layout);
    if (signage !== null) signageScores.push(signage);
    if (maintenance !== null) maintenanceScores.push(maintenance);
    if (scenery !== null) sceneryScores.push(scenery);
  }

  const ratingAverageOverall = average(overallScores);
  const ratingCount = ratings.length;

  await courseService.update({
    documentId: courseDocumentId,
    data: {
      ratingAverageOverall,
      ratingAverageLayout: average(layoutScores),
      ratingAverageSignage: average(signageScores),
      ratingAverageMaintenance: average(maintenanceScores),
      ratingAverageScenery: average(sceneryScores),
      ratingCount,
      ratingBayesScore: bayesScore(ratingAverageOverall, ratingCount),
    },
  });
};

export default {
  async afterCreate(event: any) {
    const courseDocumentId = getCourseDocumentId(event.result);
    if (!courseDocumentId) {
      return;
    }
    await refreshCourseRatingAggregates(strapi, courseDocumentId);
  },

  async afterUpdate(event: any) {
    const previousCourseDocumentId = getCourseDocumentId(event.params?.data);
    const currentCourseDocumentId = getCourseDocumentId(event.result);
    const ids = new Set([previousCourseDocumentId, currentCourseDocumentId].filter(Boolean) as string[]);

    for (const courseDocumentId of ids) {
      await refreshCourseRatingAggregates(strapi, courseDocumentId);
    }
  },

  async afterDelete(event: any) {
    const courseDocumentId = getCourseDocumentId(event.result);
    if (!courseDocumentId) {
      return;
    }
    await refreshCourseRatingAggregates(strapi, courseDocumentId);
  },
};
