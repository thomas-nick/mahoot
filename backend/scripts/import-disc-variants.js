const { readCsvRecords } = require('./lib/csv');
const { normalizeDiscVariantRecord } = require('./lib/normalizers');
const { loadStrapi, upsertByExternalId } = require('./lib/strapi-app');

const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const DISC_MOLD_UID = 'api::disc-mold.disc-mold';
const PLASTIC_TYPE_UID = 'api::plastic-type.plastic-type';
const DISC_VARIANTS_CSV_PATH = 'disc_variants.csv';

const findDocumentIdByExternalId = async (strapi, uid, externalId) => {
  if (!externalId) {
    return null;
  }
  const service = strapi.documents(uid);
  let existing = await service.findFirst({
    fields: ['documentId'],
    filters: { externalId },
    status: 'draft',
  });

  if (!existing?.documentId) {
    existing = await service.findFirst({
      fields: ['documentId'],
      filters: { externalId },
      status: 'published',
    });
  }

  if (!existing?.documentId) {
    const legacy = await strapi.db.query(uid).findOne({
      where: { externalId },
      select: ['documentId'],
    });
    if (legacy?.documentId) {
      existing = { documentId: legacy.documentId };
    }
  }

  return existing?.documentId ?? null;
};

const run = async () => {
  const strapi = await loadStrapi();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const rows = await readCsvRecords(DISC_VARIANTS_CSV_PATH);
    for (const row of rows) {
      const normalized = normalizeDiscVariantRecord(row);
      if (!normalized.externalId || !normalized.displayName) {
        skipped += 1;
        continue;
      }

      const moldDocumentId = await findDocumentIdByExternalId(
        strapi,
        DISC_MOLD_UID,
        normalized.moldExternalId
      );
      const plasticDocumentId = await findDocumentIdByExternalId(
        strapi,
        PLASTIC_TYPE_UID,
        normalized.plasticExternalId
      );

      if (!moldDocumentId || !plasticDocumentId) {
        skipped += 1;
        continue;
      }

      const payload = {
        externalId: normalized.externalId,
        displayName: normalized.displayName,
        mold: moldDocumentId,
        plastic: plasticDocumentId,
        speed: normalized.speed,
        glide: normalized.glide,
        turn: normalized.turn,
        fade: normalized.fade,
        stability: normalized.stability,
        weightMin: normalized.weightMin,
        weightMax: normalized.weightMax,
        link: normalized.link,
        imageUrl: normalized.imageUrl,
        notes: normalized.notes,
        slug: normalized.slug,
      };

      const result = await upsertByExternalId(strapi, DISC_VARIANT_UID, payload);
      if (result === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }
  } finally {
    await strapi.destroy();
  }

  console.log(`Disc variant import complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
};

run().catch((error) => {
  console.error('Disc variant import failed:', error);
  process.exit(1);
});
