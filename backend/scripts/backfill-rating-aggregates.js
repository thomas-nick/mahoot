/**
 * Recompute aggregate rating fields (average, count, Bayesian score) on every
 * disc-variant, legacy disc, and course. Safe to run repeatedly.
 *
 *   npm run backfill:ratings
 *
 * The lifecycle hooks keep these fields in sync going forward; this script
 * exists to populate them for ratings that were created before the lifecycle
 * was added (or after a schema reset).
 */
const { loadStrapi } = require('./lib/strapi-app');

const DISC_RATING_UID = 'api::disc-rating.disc-rating';
const COURSE_RATING_UID = 'api::course-rating.course-rating';
const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const LEGACY_DISC_UID = 'api::disc.disc';
const COURSE_UID = 'api::course.course';

const BAYES_C = 2;
const BAYES_M = 6.5;

const bayesScore = (avg, count) => {
  if (avg === null || !Number.isFinite(avg) || count <= 0) return null;
  return Number(((BAYES_C * BAYES_M + avg * count) / (BAYES_C + count)).toFixed(3));
};

const average = (values) => {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
};

const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const findTargetDisc = async (strapi, discDocumentId) => {
  const variant = await strapi
    .documents(DISC_VARIANT_UID)
    .findOne({ documentId: discDocumentId, fields: ['documentId'] });
  if (variant?.documentId) return { uid: DISC_VARIANT_UID, documentId: variant.documentId };
  const legacy = await strapi
    .documents(LEGACY_DISC_UID)
    .findOne({ documentId: discDocumentId, fields: ['documentId'] });
  if (legacy?.documentId) return { uid: LEGACY_DISC_UID, documentId: legacy.documentId };
  return null;
};

const backfillDiscRatings = async (strapi) => {
  const ratings = await strapi.documents(DISC_RATING_UID).findMany({
    fields: ['discDocumentId', 'overall'],
    pagination: { page: 1, pageSize: 100000 },
  });

  const grouped = new Map();
  for (const rating of ratings) {
    const id = rating.discDocumentId;
    if (!id) continue;
    const overall = asNumber(rating.overall);
    if (overall === null) continue;
    const current = grouped.get(id) ?? { values: [] };
    current.values.push(overall);
    grouped.set(id, current);
  }

  let updates = 0;
  let skipped = 0;
  for (const [discDocumentId, { values }] of grouped) {
    const target = await findTargetDisc(strapi, discDocumentId);
    if (!target) {
      skipped += 1;
      continue;
    }
    const ratingAverageOverall = average(values);
    const ratingCount = values.length;
    await strapi.documents(target.uid).update({
      documentId: target.documentId,
      data: {
        ratingAverageOverall,
        ratingCount,
        ratingBayesScore: bayesScore(ratingAverageOverall, ratingCount),
      },
    });
    updates += 1;
  }

  console.log(
    `[backfill-ratings] discs: aggregated ${grouped.size} disc(s), updated ${updates}, skipped ${skipped} (no matching disc/variant).`,
  );
};

const backfillCourseRatings = async (strapi) => {
  const ratings = await strapi.documents(COURSE_RATING_UID).findMany({
    fields: ['overall', 'layout', 'signage', 'maintenance', 'scenery'],
    populate: { course: { fields: ['documentId'] } },
    pagination: { page: 1, pageSize: 100000 },
  });

  const grouped = new Map();
  for (const rating of ratings) {
    const id = rating.course?.documentId;
    if (!id) continue;
    const current = grouped.get(id) ?? {
      overall: [],
      layout: [],
      signage: [],
      maintenance: [],
      scenery: [],
    };
    const o = asNumber(rating.overall);
    const l = asNumber(rating.layout);
    const s = asNumber(rating.signage);
    const m = asNumber(rating.maintenance);
    const sc = asNumber(rating.scenery);
    if (o !== null) current.overall.push(o);
    if (l !== null) current.layout.push(l);
    if (s !== null) current.signage.push(s);
    if (m !== null) current.maintenance.push(m);
    if (sc !== null) current.scenery.push(sc);
    grouped.set(id, current);
  }

  let updates = 0;
  for (const [courseDocumentId, scores] of grouped) {
    const ratingAverageOverall = average(scores.overall);
    const ratingCount = scores.overall.length;
    await strapi.documents(COURSE_UID).update({
      documentId: courseDocumentId,
      data: {
        ratingAverageOverall,
        ratingAverageLayout: average(scores.layout),
        ratingAverageSignage: average(scores.signage),
        ratingAverageMaintenance: average(scores.maintenance),
        ratingAverageScenery: average(scores.scenery),
        ratingCount,
        ratingBayesScore: bayesScore(ratingAverageOverall, ratingCount),
      },
    });
    updates += 1;
  }

  console.log(`[backfill-ratings] courses: aggregated ${grouped.size} course(s), updated ${updates}.`);
};

const run = async () => {
  const strapi = await loadStrapi();
  try {
    await backfillDiscRatings(strapi);
    await backfillCourseRatings(strapi);
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error('[backfill-ratings] failed:', error);
  process.exit(1);
});
