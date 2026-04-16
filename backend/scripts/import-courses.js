const { readCsvRecords } = require('./lib/csv');
const { normalizeCourseRecord } = require('./lib/normalizers');
const { loadStrapi, upsertByExternalId } = require('./lib/strapi-app');

const COURSE_UID = 'api::course.course';
const COURSE_CSV_PATH = 'courses.csv';

const run = async () => {
  const strapi = await loadStrapi();

  let created = 0;
  let updated = 0;

  try {
    const rows = await readCsvRecords(COURSE_CSV_PATH);

    for (const row of rows) {
      const normalized = normalizeCourseRecord(row);
      if (!normalized.externalId || !normalized.name) {
        continue;
      }

      const result = await upsertByExternalId(strapi, COURSE_UID, normalized);
      if (result === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }
  } finally {
    await strapi.destroy();
  }

  console.log(`Course import complete. Created: ${created}, Updated: ${updated}`);
};

run().catch((error) => {
  console.error('Course import failed:', error);
  process.exit(1);
});
