const { loadStrapi } = require('./lib/strapi-app');
const {
  DISCS_COLLECTION,
  COURSES_COLLECTION,
  LISTINGS_COLLECTION,
  createClient,
  ensureCollections,
  mapDisc,
  mapCourse,
  mapMarketListing,
  importBatches,
} = require('./lib/typesense');

const DISC_UID = 'api::disc.disc';
const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const MARKET_LISTING_UID = 'api::market-listing.market-listing';
const COURSE_UID = 'api::course.course';

const run = async () => {
  const strapi = await loadStrapi();
  const client = createClient();

  try {
    await ensureCollections(client);
    const discService = strapi.documents(DISC_UID);
    const discVariantService = strapi.documents(DISC_VARIANT_UID);
    const marketListingService = strapi.documents(MARKET_LISTING_UID);
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
        'imageUrl',
        'releaseType',
        'productionStatus',
        'runName',
        'runYear',
        'collectorValue',
        'rarity',
        'soughtAfter',
        'priceLowUsd',
        'priceHighUsd',
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

    const marketListings = await marketListingService.findMany({
      status: 'published',
      populate: {
        seller: {
          fields: ['id', 'documentId', 'username'],
        },
      },
      pagination: { page: 1, pageSize: 50000 },
    });
    const listingDocs = marketListings.map((listing) => mapMarketListing(listing));

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
    await importBatches(client, LISTINGS_COLLECTION, listingDocs);

    console.log(
      `Typesense reindex complete. Indexed ${discs.length} discs, ${courses.length} courses, and ${listingDocs.length} marketplace listings.`
    );
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error('Typesense reindex failed:', error);
  process.exit(1);
});
