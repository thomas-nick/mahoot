const { loadStrapi } = require('./lib/strapi-app');

const SUBMISSION_UID = 'api::disc-submission.disc-submission';

const run = async () => {
  const strapi = await loadStrapi();

  try {
    const service = strapi.service(SUBMISSION_UID);
    const result = await service.syncApprovedSubmissions();
    console.log(
      `Approved disc submission sync complete. Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`
    );
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error('Approved disc submission sync failed:', error);
  process.exit(1);
});
