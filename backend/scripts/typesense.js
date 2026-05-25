const Typesense = require('typesense');

const DISCS_COLLECTION = 'discs';
const COURSES_COLLECTION = 'courses';
const LISTINGS_COLLECTION = 'listings';

const LEGACY_COLLECTIONS_TO_DROP = ['collector_releases'];

const toFloat = (value) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asString = (value) => (value === null || value === undefined ? '' : String(value));

const createClient = () => {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  if (!host || !apiKey) {
    throw new Error('Missing TYPESENSE_HOST or TYPESENSE_API_KEY in environment.');
  }

  return new Typesense.Client({
    nodes: [
      {
        host,
        port: Number(process.env.TYPESENSE_PORT ?? '8108'),
        protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 10,
  });
};

const ensureCollections = async (client) => {
  const schemas = [
    {
      name: DISCS_COLLECTION,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'externalId', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'brand', type: 'string', facet: true, optional: true },
        { name: 'category', type: 'string', facet: true, optional: true },
        { name: 'plastic', type: 'string', facet: true, optional: true },
        { name: 'speed', type: 'float', optional: true },
        { name: 'glide', type: 'float', optional: true },
        { name: 'turn', type: 'float', optional: true },
        { name: 'fade', type: 'float', optional: true },
        { name: 'stability', type: 'string', facet: true, optional: true },
        { name: 'description', type: 'string', optional: true },
        { name: 'releaseType', type: 'string', facet: true, optional: true },
        { name: 'productionStatus', type: 'string', facet: true, optional: true },
        { name: 'runName', type: 'string', optional: true },
        { name: 'runYear', type: 'int32', facet: true, optional: true },
        { name: 'collectorValue', type: 'int32', optional: true },
        { name: 'rarity', type: 'int32', optional: true },
        { name: 'soughtAfter', type: 'int32', optional: true },
        { name: 'priceLowUsd', type: 'float', optional: true },
        { name: 'priceHighUsd', type: 'float', optional: true },
        { name: 'imageUrl', type: 'string', optional: true },
      ],
    },
    {
      name: COURSES_COLLECTION,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'externalId', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'city', type: 'string', facet: true, optional: true },
        { name: 'state', type: 'string', facet: true, optional: true },
        { name: 'country', type: 'string', facet: true, optional: true },
        { name: 'difficulty', type: 'string', facet: true, optional: true },
        { name: 'type', type: 'string', facet: true, optional: true },
        { name: 'pros', type: 'string', optional: true },
        { name: 'cons', type: 'string', optional: true },
        { name: 'description', type: 'string', optional: true },
        { name: 'ratingAverageOverall', type: 'float', optional: true },
        { name: 'ratingCount', type: 'int32', optional: true },
        { name: 'location', type: 'geopoint', optional: true },
        { name: 'latitude', type: 'float', optional: true },
        { name: 'longitude', type: 'float', optional: true },
      ],
    },
    {
      name: LISTINGS_COLLECTION,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'priceUsd', type: 'float', optional: true },
        { name: 'currency', type: 'string', facet: true, optional: true },
        { name: 'condition', type: 'string', facet: true, optional: true },
        { name: 'status', type: 'string', facet: true, optional: true },
        { name: 'discId', type: 'string', facet: true, optional: true },
        { name: 'discExternalId', type: 'string', optional: true },
        { name: 'discDisplayName', type: 'string', optional: true },
        { name: 'sellerId', type: 'string', facet: true, optional: true },
        { name: 'sellerUsername', type: 'string', optional: true },
        { name: 'imageUrl', type: 'string', optional: true },
        { name: 'listedAt', type: 'int64', optional: true },
      ],
    },
  ];

  const schemaFieldNames = (schema) => schema.fields.map((field) => field.name).sort();
  const shouldRecreateCollection = (existing, expectedSchema) => {
    const existingFields = Array.isArray(existing?.fields) ? existing.fields.map((f) => f.name).sort() : [];
    const expectedFields = schemaFieldNames(expectedSchema);
    if (existingFields.length !== expectedFields.length) {
      return true;
    }
    for (let index = 0; index < expectedFields.length; index += 1) {
      if (expectedFields[index] !== existingFields[index]) {
        return true;
      }
    }
    return false;
  };

  for (const schema of schemas) {
    try {
      const existing = await client.collections(schema.name).retrieve();
      if (shouldRecreateCollection(existing, schema)) {
        await client.collections(schema.name).delete();
        await client.collections().create(schema);
      }
    } catch (error) {
      if (error.httpStatus === 404) {
        await client.collections().create(schema);
      } else {
        throw error;
      }
    }
  }

  for (const legacyName of LEGACY_COLLECTIONS_TO_DROP) {
    try {
      await client.collections(legacyName).delete();
    } catch (error) {
      if (error.httpStatus !== 404) {
        throw error;
      }
    }
  }
};

const toInt = (value) => {
  const parsed = toFloat(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
};

const mapDisc = (disc) => {
  const mold = disc.mold ?? {};
  const plastic = disc.plastic ?? {};
  const legacyName = asString(disc.name);
  const variantDisplayName = asString(disc.displayName);
  const moldName = asString(mold.name);
  const plasticName = asString(plastic.name || disc.plastic);
  const computedName = variantDisplayName || legacyName || [moldName, plasticName].filter(Boolean).join(' ');

  return {
    id: asString(disc.documentId ?? disc.id ?? disc.externalId),
    externalId: asString(disc.externalId),
    name: computedName,
    brand: asString(disc.brand ?? mold.brand),
    category: asString(disc.category ?? mold.category),
    plastic: plasticName,
    speed: toFloat(disc.speed ?? mold.speed),
    glide: toFloat(disc.glide ?? mold.glide),
    turn: toFloat(disc.turn ?? mold.turn),
    fade: toFloat(disc.fade ?? mold.fade),
    stability: asString(disc.stability ?? mold.stability),
    description: asString(disc.description),
    releaseType: asString(disc.releaseType || 'stock'),
    productionStatus: asString(disc.productionStatus || 'in-production'),
    runName: asString(disc.runName),
    runYear: toInt(disc.runYear),
    collectorValue: toInt(disc.collectorValue),
    rarity: toInt(disc.rarity),
    soughtAfter: toInt(disc.soughtAfter),
    priceLowUsd: toFloat(disc.priceLowUsd),
    priceHighUsd: toFloat(disc.priceHighUsd),
    imageUrl: asString(disc.imageUrl),
  };
};

const mapCourse = (course) => ({
  ...(() => {
    const latitude = toFloat(course.latitude);
    const longitude = toFloat(course.longitude);
    return {
      id: asString(course.documentId ?? course.id ?? course.externalId),
      externalId: asString(course.externalId),
      name: asString(course.name),
      city: asString(course.city),
      state: asString(course.state),
      country: asString(course.country),
      difficulty: asString(course.difficulty),
      type: asString(course.type),
      pros: asString(course.pros),
      cons: asString(course.cons),
      description: asString(course.description),
      ratingAverageOverall: toFloat(course.ratingAverageOverall),
      ratingCount: toFloat(course.ratingCount),
      location:
        typeof latitude === 'number' && typeof longitude === 'number' ? [latitude, longitude] : undefined,
      latitude,
      longitude,
    };
  })(),
});

const mapMarketListing = (listing) => {
  const seller = listing.seller || {};
  const listedSource = listing.createdAt ?? listing.updatedAt ?? listing.publishedAt;
  const listedAtMs = listedSource ? Date.parse(String(listedSource)) : NaN;
  const listedAt = Number.isFinite(listedAtMs) ? Math.floor(listedAtMs / 1000) : undefined;

  return {
    id: asString(listing.documentId ?? listing.id),
    title: asString(listing.title),
    description: asString(listing.description),
    priceUsd: toFloat(listing.priceUsd),
    currency: asString(listing.currency || 'USD'),
    condition: asString(listing.condition),
    status: asString(listing.status),
    discId: asString(listing.discDocumentId),
    discExternalId: asString(listing.discExternalId),
    discDisplayName: asString(listing.discDisplayName),
    sellerId: asString(seller.id ?? seller.documentId),
    sellerUsername: asString(seller.username),
    imageUrl: asString(listing.imageUrl),
    listedAt,
  };
};

const importBatches = async (client, collectionName, docs, batchSize = 200) => {
  for (let index = 0; index < docs.length; index += batchSize) {
    const batch = docs.slice(index, index + batchSize);
    await client.collections(collectionName).documents().import(batch, {
      action: 'upsert',
      batch_size: batch.length,
    });
  }
};

module.exports = {
  DISCS_COLLECTION,
  COURSES_COLLECTION,
  LISTINGS_COLLECTION,
  createClient,
  ensureCollections,
  mapDisc,
  mapCourse,
  mapMarketListing,
  importBatches,
};
