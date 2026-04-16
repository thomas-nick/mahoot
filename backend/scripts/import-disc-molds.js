const { readCsvRecords } = require('./lib/csv');
const { normalizeDiscMoldRecord } = require('./lib/normalizers');
const { loadStrapi, upsertByExternalId } = require('./lib/strapi-app');

const DISC_MOLD_UID = 'api::disc-mold.disc-mold';
const DISC_MOLDS_CSV_PATH = 'disc_molds.csv';

const run = async () => {
  const strapi = await loadStrapi();
  let created = 0;
  let updated = 0;

  try {
    const rows = await readCsvRecords(DISC_MOLDS_CSV_PATH);
    for (const row of rows) {
      const normalized = normalizeDiscMoldRecord(row);
      if (!normalized.externalId || !normalized.name) {
        continue;
      }
      const result = await upsertByExternalId(strapi, DISC_MOLD_UID, normalized);
      if (result === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }
  } finally {
    await strapi.destroy();
  }

  console.log(`Disc mold import complete. Created: ${created}, Updated: ${updated}`);
};

run().catch((error) => {
  console.error('Disc mold import failed:', error);
  process.exit(1);
});
