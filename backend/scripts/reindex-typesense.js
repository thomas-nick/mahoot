const { loadStrapi } = require('./lib/strapi-app');
const {
  DISCS_COLLECTION,
  COURSES_COLLECTION,
  COLLECTOR_RELEASES_COLLECTION,
  createClient,
  ensureCollections,
  mapDisc,
  mapCourse,
  mapCollectorRelease,
  importBatches,
} = require('./lib/typesense');

const DISC_UID = 'api::disc.disc';
const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const COLLECTOR_RELEASE_UID = 'api::collector-release.collector-release';
const COURSE_UID = 'api::course.course';

const run = async () => {
  const strapi = await loadStrapi();
  const client = createClient();

  try {
    await ensureCollections(client);
    const discService = strapi.documents(DISC_UID);
    const discVariantService = strapi.documents(DISC_VARIANT_UID);
    const collectorService = strapi.documents(COLLECTOR_RELEASE_UID);
    const courseService = strapi.documents(COURSE_UID);
    const variantDiscs = await discVariantService.findMany({
      status: 'published',
      fields: [
        'id',
        'documentId',
        'externalId',
        'displayName',
        'speed',
        'glide',
        'turn',
        'fade',
        'stability',
      ],
      populate: {
        mold: {
          fields: ['name', 'brand', 'category', 'speed', 'glide', 'turn', 'fade', 'stability'],
        },
        plastic: {
          fields: ['name'],
        },
      },
      pagination: { page: 1, pageSize: 50000 },
    });
    const legacyDiscs = await discService.findMany({
      status: 'published',
      fields: [
        'id',
        'documentId',
        'externalId',
        'name',
        'brand',
        'category',
        'speed',
        'glide',
        'turn',
        'fade',
        'stability',
      ],
      pagination: { page: 1, pageSize: 50000 },
    });

    const docsById = new Map();
    for (const disc of [...variantDiscs, ...legacyDiscs]) {
      const mapped = mapDisc(disc);
      if (!mapped.id) {
        continue;
      }
      docsById.set(mapped.id, mapped);
    }
    const discs = Array.from(docsById.values());

    const collectorReleases = await collectorService.findMany({
      status: 'published',
      fields: [
        'id',
        'documentId',
        'externalId',
        'discDocumentId',
        'runName',
        'year',
        'oopStatus',
        'collectorValue',
        'rarity',
        'soughtAfter',
        'priceLowUsd',
        'priceHighUsd',
        'notes',
        'imageUrl',
      ],
      pagination: { page: 1, pageSize: 50000 },
    });

    const collectorDocs = collectorReleases.map((release) => mapCollectorRelease(release));

    const courses = await courseService.findMany({
      status: 'published',
      fields: [
        'id',
        'documentId',
        'externalId',
        'name',
        'city',
        'state',
        'country',
        'difficulty',
        'type',
        'pros',
        'cons',
        'description',
        'ratingAverageOverall',
        'ratingCount',
        'latitude',
        'longitude',
      ],
      pagination: { page: 1, pageSize: 50000 },
    });

    await importBatches(client, DISCS_COLLECTION, discs);
    await importBatches(client, COURSES_COLLECTION, courses.map(mapCourse));
    await importBatches(client, COLLECTOR_RELEASES_COLLECTION, collectorDocs);

    console.log(
      `Typesense reindex complete. Indexed ${discs.length} discs, ${courses.length} courses, and ${collectorDocs.length} collector releases.`
    );
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error('Typesense reindex failed:', error);
  process.exit(1);
});
