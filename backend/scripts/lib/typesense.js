const Typesense = require('typesense');

const DISCS_COLLECTION = 'discs';
const COURSES_COLLECTION = 'courses';
const COLLECTOR_RELEASES_COLLECTION = 'collector_releases';

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
        { name: 'collectorHas', type: 'bool', facet: true, optional: true },
        { name: 'collectorMaxValue', type: 'float', optional: true },
        { name: 'collectorMaxYear', type: 'int32', optional: true },
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
      name: COLLECTOR_RELEASES_COLLECTION,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'discId', type: 'string', optional: true },
        { name: 'discExternalId', type: 'string', optional: true },
        { name: 'discName', type: 'string', optional: true },
        { name: 'brand', type: 'string', facet: true, optional: true },
        { name: 'mold', type: 'string', facet: true, optional: true },
        { name: 'runName', type: 'string', optional: true },
        { name: 'year', type: 'int32', facet: true, optional: true },
        { name: 'oopStatus', type: 'string', facet: true, optional: true },
        { name: 'collectorValue', type: 'float', optional: true },
        { name: 'rarity', type: 'float', optional: true },
        { name: 'soughtAfter', type: 'float', optional: true },
        { name: 'priceLowUsd', type: 'float', optional: true },
        { name: 'priceHighUsd', type: 'float', optional: true },
        { name: 'imageUrl', type: 'string', optional: true },
        { name: 'notes', type: 'string', optional: true },
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

const mapCollectorRelease = (release) => {
  const disc = release.disc || {};
  return {
    id: asString(release.documentId ?? release.id ?? release.externalId),
    discId: asString(release.discDocumentId),
    discExternalId: asString(release.discExternalId),
    discName: asString(release.discName ?? disc.displayName ?? disc.name),
    brand: asString(release.brand ?? disc.brand),
    mold: asString(release.mold ?? (disc.mold && disc.mold.name)),
    runName: asString(release.runName),
    year: toFloat(release.year),
    oopStatus: asString(release.oopStatus),
    collectorValue: toFloat(release.collectorValue),
    rarity: toFloat(release.rarity),
    soughtAfter: toFloat(release.soughtAfter),
    priceLowUsd: toFloat(release.priceLowUsd),
    priceHighUsd: toFloat(release.priceHighUsd),
    imageUrl: asString(release.imageUrl),
    notes: asString(release.notes),
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
  COLLECTOR_RELEASES_COLLECTION,
  createClient,
  ensureCollections,
  mapDisc,
  mapCourse,
  mapCollectorRelease,
  importBatches,
};
