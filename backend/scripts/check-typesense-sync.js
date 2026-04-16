const { loadStrapi } = require('./lib/strapi-app');
const { createClient, DISCS_COLLECTION } = require('./lib/typesense');

const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const DISC_UID = 'api::disc.disc';

const getArgValue = (name) => {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  const withEquals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (withEquals) {
    return withEquals.slice(name.length + 1);
  }
  return null;
};

const normalize = (value) => String(value ?? '').trim();

const fetchAllPublishedVariants = async (strapi) => {
  const service = strapi.documents(DISC_VARIANT_UID);
  const pageSize = 500;
  const all = [];
  let page = 1;

  while (true) {
    const rows = await service.findMany({
      status: 'published',
      fields: ['documentId', 'externalId', 'displayName'],
      pagination: { page, pageSize },
    });
    if (!Array.isArray(rows) || rows.length === 0) {
      break;
    }
    all.push(...rows);
    if (rows.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all;
};

const fetchPublishedLegacyDiscsPage = async (strapi, pageSize = 1) => {
  const service = strapi.documents(DISC_UID);
  return service.findMany({
    status: 'published',
    fields: ['documentId', 'externalId', 'name'],
    pagination: { page: 1, pageSize },
  });
};

const queryPublishedLegacyDiscs = async (strapi, q, pageSize = 50) => {
  const service = strapi.documents(DISC_UID);
  return service.findMany({
    status: 'published',
    fields: ['documentId', 'externalId', 'name'],
    filters: {
      $or: [
        { name: { $containsi: q } },
        { externalId: { $containsi: q } },
      ],
    },
    pagination: { page: 1, pageSize },
  });
};

const getTypesenseCount = async (client) => {
  const result = await client.collections(DISCS_COLLECTION).documents().search({
    q: '*',
    query_by: 'name',
    per_page: 1,
  });
  return Number(result?.found ?? result?.out_of ?? 0);
};

const searchTypesense = async (client, query) => {
  return client.collections(DISCS_COLLECTION).documents().search({
    q: query,
    query_by: 'name,brand,category,plastic,stability,externalId',
    per_page: 10,
  });
};

const run = async () => {
  const strapi = await loadStrapi();
  const client = createClient();
  const q = normalize(getArgValue('--q') ?? '');

  try {
    const [publishedVariants, legacyCountProbe] = await Promise.all([
      fetchAllPublishedVariants(strapi),
      fetchPublishedLegacyDiscsPage(strapi, 1),
    ]);
    const uniqueExternalIds = new Set(
      publishedVariants.map((item) => normalize(item.externalId)).filter(Boolean),
    );
    const typesenseCount = await getTypesenseCount(client);

    console.log(`Published disc-variants in Strapi: ${publishedVariants.length}`);
    const legacyCount = Array.isArray(legacyCountProbe) ? legacyCountProbe.length : 0;
    console.log(`Published legacy discs in Strapi (probe count): ${legacyCount > 0 ? '>=1' : '0'}`);
    console.log(`Unique variant externalIds: ${uniqueExternalIds.size}`);
    console.log(`Documents in Typesense discs collection: ${typesenseCount}`);
    console.log(`Count delta (Strapi - Typesense): ${publishedVariants.length - typesenseCount}`);

    if (q) {
      const strapiMatches = publishedVariants.filter((item) => {
        const name = normalize(item.displayName).toLowerCase();
        const externalId = normalize(item.externalId).toLowerCase();
        const query = q.toLowerCase();
        return name.includes(query) || externalId.includes(query);
      });
      const legacyMatches = await queryPublishedLegacyDiscs(strapi, q);
      const typesenseMatches = await searchTypesense(client, q);
      const tsHits = Array.isArray(typesenseMatches?.hits) ? typesenseMatches.hits : [];

      console.log('');
      console.log(`Query check: "${q}"`);
      console.log(`Strapi matches: ${strapiMatches.length}`);
      strapiMatches.slice(0, 10).forEach((item) => {
        console.log(`  - ${normalize(item.displayName) || '(no displayName)'} [${normalize(item.externalId)}]`);
      });
      console.log(`Strapi legacy disc matches: ${legacyMatches.length}`);
      legacyMatches.slice(0, 10).forEach((item) => {
        console.log(`  - ${normalize(item.name) || '(no name)'} [${normalize(item.externalId)}]`);
      });

      console.log(`Typesense matches: ${Number(typesenseMatches?.found ?? tsHits.length)}`);
      tsHits.slice(0, 10).forEach((hit) => {
        const doc = hit.document ?? {};
        console.log(`  - ${normalize(doc.name)} [${normalize(doc.externalId)}]`);
      });
    }
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error('Typesense sync check failed:', error);
  process.exit(1);
});
