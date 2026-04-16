import Typesense from 'typesense';

type AnyRecord = Record<string, unknown>;

const DISC_COLLECTION = 'discs';
const COURSE_COLLECTION = 'courses';
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringOrEmpty = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createClient = () => {
  const host = process.env.TYPESENSE_HOST;
  const port = Number(process.env.TYPESENSE_PORT ?? '8108');
  const protocol = process.env.TYPESENSE_PROTOCOL ?? 'http';
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!host || !apiKey) {
    return null;
  }

  return new Typesense.Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 10,
  });
};

const retry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const statusCode = error?.httpStatus ?? error?.status;

      if (!RETRYABLE_STATUS_CODES.has(statusCode) || attempt === retries - 1) {
        throw error;
      }

      await sleep((attempt + 1) * 250);
    }
  }

  throw lastError;
};

const collectionSchemas = [
  {
    name: DISC_COLLECTION,
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
      { name: 'stability', type: 'string', facet: true, optional: true }
    ],
  },
  {
    name: COURSE_COLLECTION,
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
      { name: 'longitude', type: 'float', optional: true }
    ],
  },
];

export const mapDiscToDocument = (disc: AnyRecord) => ({
  ...(() => {
    const mold = (disc.mold ?? {}) as AnyRecord;
    const plastic = (disc.plastic ?? {}) as AnyRecord;
    const legacyName = toStringOrEmpty(disc.name);
    const variantDisplayName = toStringOrEmpty(disc.displayName);
    const moldName = toStringOrEmpty(mold.name);
    const plasticName = toStringOrEmpty(plastic.name);
    const computedName = variantDisplayName || legacyName || [moldName, plasticName].filter(Boolean).join(' ');
    return {
      id: toStringOrEmpty(disc.documentId ?? disc.id ?? disc.externalId),
      externalId: toStringOrEmpty(disc.externalId),
      name: computedName,
      brand: toStringOrEmpty(disc.brand ?? mold.brand),
      category: toStringOrEmpty(disc.category ?? mold.category),
      plastic: plasticName,
      speed: toNumber(disc.speed) ?? undefined,
      glide: toNumber(disc.glide) ?? undefined,
      turn: toNumber(disc.turn) ?? undefined,
      fade: toNumber(disc.fade) ?? undefined,
      stability: toStringOrEmpty(disc.stability),
    };
  })(),
});

export const mapCourseToDocument = (course: AnyRecord) => ({
  ...(() => {
    const latitude = toNumber(course.latitude);
    const longitude = toNumber(course.longitude);
    return {
      id: toStringOrEmpty(course.documentId ?? course.id ?? course.externalId),
      externalId: toStringOrEmpty(course.externalId),
      name: toStringOrEmpty(course.name),
      city: toStringOrEmpty(course.city),
      state: toStringOrEmpty(course.state),
      country: toStringOrEmpty(course.country),
      difficulty: toStringOrEmpty(course.difficulty),
      type: toStringOrEmpty(course.type),
      pros: toStringOrEmpty(course.pros),
      cons: toStringOrEmpty(course.cons),
      description: toStringOrEmpty(course.description),
      ratingAverageOverall: toNumber(course.ratingAverageOverall) ?? undefined,
      ratingCount: toNumber(course.ratingCount) ?? undefined,
      location: latitude !== null && longitude !== null ? [latitude, longitude] : undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    };
  })(),
});

export const getTypesenseSync = () => {
  const client = createClient();
  let hasLoggedMissingConfig = false;
  let hasEnsuredCollections = false;

  const ensureCollections = async () => {
    if (!client) {
      if (!hasLoggedMissingConfig) {
        console.warn('Typesense sync skipped: missing TYPESENSE_HOST or TYPESENSE_API_KEY.');
        hasLoggedMissingConfig = true;
      }
      return;
    }

    if (hasEnsuredCollections) {
      return;
    }

    for (const schema of collectionSchemas) {
      try {
        await client.collections(schema.name).retrieve();
      } catch (error: any) {
        if (error?.httpStatus === 404) {
          await retry(() => client.collections().create(schema as any));
        } else {
          throw error;
        }
      }
    }

    hasEnsuredCollections = true;
  };

  const upsertDisc = async (disc: AnyRecord) => {
    if (!client) {
      return;
    }

    await retry(() =>
      client.collections(DISC_COLLECTION).documents().upsert(mapDiscToDocument(disc) as never)
    );
  };

  const upsertCourse = async (course: AnyRecord) => {
    if (!client) {
      return;
    }

    await retry(() =>
      client.collections(COURSE_COLLECTION).documents().upsert(mapCourseToDocument(course) as never)
    );
  };

  const deleteDisc = async (disc: AnyRecord) => {
    if (!client) {
      return;
    }

    const id = toStringOrEmpty(disc.documentId ?? disc.id ?? disc.externalId);
    if (!id) {
      return;
    }

    try {
      await retry(() => client.collections(DISC_COLLECTION).documents(id).delete());
    } catch (error: any) {
      if (error?.httpStatus !== 404) {
        throw error;
      }
    }
  };

  const deleteCourse = async (course: AnyRecord) => {
    if (!client) {
      return;
    }

    const id = toStringOrEmpty(course.documentId ?? course.id ?? course.externalId);
    if (!id) {
      return;
    }

    try {
      await retry(() => client.collections(COURSE_COLLECTION).documents(id).delete());
    } catch (error: any) {
      if (error?.httpStatus !== 404) {
        throw error;
      }
    }
  };

  const importBatch = async (collectionName: string, documents: object[]) => {
    if (!client || documents.length === 0) {
      return;
    }

    await retry(() =>
      client.collections(collectionName).documents().import(documents as never, { action: 'upsert' })
    );
  };

  return {
    ensureCollections,
    upsertDisc,
    upsertCourse,
    deleteDisc,
    deleteCourse,
    importBatch,
    collections: {
      discs: DISC_COLLECTION,
      courses: COURSE_COLLECTION,
    },
  };
};
