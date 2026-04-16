const { readCsvRecords } = require('./lib/csv');
const { normalizeDiscRecord } = require('./lib/normalizers');
const { loadStrapi, upsertByExternalId } = require('./lib/strapi-app');

const DISC_UID = 'api::disc.disc';
const DISC_CSV_PATH = 'merged_disc_golf_catalog - merged_disc_golf_catalog.csv.csv';

const run = async () => {
  const strapi = await loadStrapi();

  let created = 0;
  let updated = 0;

  try {
    const rows = await readCsvRecords(DISC_CSV_PATH);

    for (const row of rows) {
      const normalized = normalizeDiscRecord(row);
      if (!normalized.externalId || !normalized.name) {
        continue;
      }

      const result = await upsertByExternalId(strapi, DISC_UID, normalized);
      if (result === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }
  } finally {
    await strapi.destroy();
  }

  console.log(`Disc import complete. Created: ${created}, Updated: ${updated}`);
};

run().catch((error) => {
  console.error('Disc import failed:', error);
  process.exit(1);
});
