const { readCsvRecords } = require('./lib/csv');
const { normalizePlasticTypeRecord } = require('./lib/normalizers');
const { loadStrapi, upsertByExternalId } = require('./lib/strapi-app');

const PLASTIC_TYPE_UID = 'api::plastic-type.plastic-type';
const PLASTIC_TYPES_CSV_PATH = 'plastic_types.csv';

const run = async () => {
  const strapi = await loadStrapi();
  let created = 0;
  let updated = 0;

  try {
    const rows = await readCsvRecords(PLASTIC_TYPES_CSV_PATH);
    for (const row of rows) {
      const normalized = normalizePlasticTypeRecord(row);
      if (!normalized.externalId || !normalized.name) {
        continue;
      }
      const result = await upsertByExternalId(strapi, PLASTIC_TYPE_UID, normalized);
      if (result === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }
  } finally {
    await strapi.destroy();
  }

  console.log(`Plastic type import complete. Created: ${created}, Updated: ${updated}`);
};

run().catch((error) => {
  console.error('Plastic type import failed:', error);
  process.exit(1);
});
