const path = require('node:path');

// Ensure Strapi bootstraps from the `backend/` app directory regardless of CWD.
process.chdir(path.resolve(__dirname, '..'));

const { readCsvRecords } = require('./lib/csv');
const { loadStrapi, upsertByExternalId } = require('./lib/strapi-app');

const DISC_VARIANT_UID = 'api::disc-variant.disc-variant';
const COLLECTOR_RELEASE_UID = 'api::collector-release.collector-release';

const ROOT_CSV_PATH = 'sexton_firebird_history.csv';

const slugify = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeForMatch = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const scoreFromYear = (year) => {
  const y = Number(year);
  if (!Number.isFinite(y)) return 1;
  // 2015 => 10, 2023 => 3 (linear)
  if (y <= 2023) {
    if (y <= 2015) return 10;
    if (y >= 2023) return 3;
    const raw = 10 - ((y - 2015) * 7) / 8;
    return Math.max(1, Math.min(10, Math.round(raw)));
  }
  // Post-2023: decay gently (2024 => 2, 2025 => 1, 2026 => 1)
  const raw = 3 - (y - 2023);
  return Math.max(1, Math.min(10, Math.round(raw)));
};

const runName = 'Nate Sexton Firebird';
const oopStatus = 'tour-series';

const run = async () => {
  const strapi = await loadStrapi();

  let created = 0;
  let updated = 0;
  let skippedNoVariant = 0;
  let skippedNoPlasticMatch = 0;

  try {
    const rows = await readCsvRecords(ROOT_CSV_PATH);

    const discVariants = await strapi.documents(DISC_VARIANT_UID).findMany({
      status: 'published',
      fields: ['documentId', 'externalId', 'displayName'],
      populate: {
        mold: {
          fields: ['name', 'brand'],
        },
        plastic: {
          fields: ['name'],
        },
      },
      pagination: { page: 1, pageSize: 50000 },
    });

    const innovaFirebirdVariants = discVariants.filter((v) => {
      const moldName = v?.mold?.name ?? '';
      const moldBrand = v?.mold?.brand ?? '';
      return moldBrand.toLowerCase() === 'innova' && moldName.toLowerCase() === 'firebird';
    });

    if (innovaFirebirdVariants.length === 0) {
      console.log('No Innova Firebird disc-variants found (mold brand/name mismatch).');
      return;
    }

    for (const row of rows) {
      const brand = (row.brand ?? '').trim();
      const mold = (row.mold ?? '').trim();
      if (brand.toLowerCase() !== 'innova' || mold.toLowerCase() !== 'firebird') {
        continue;
      }

      const year = Number(row.year);
      const plasticType = (row.plasticType ?? '').trim();
      const description = (row.description ?? '').trim();

      if (!Number.isFinite(year) || !plasticType) {
        continue;
      }

      const rowPlasticNorm = normalizeForMatch(plasticType);

      const matchingVariants = innovaFirebirdVariants.filter((variant) => {
        const variantPlasticName = variant?.plastic?.name ?? '';
        const vNorm = normalizeForMatch(variantPlasticName);
        if (!vNorm) return false;
        // match either direction to handle small formatting differences
        return vNorm.includes(rowPlasticNorm) || rowPlasticNorm.includes(vNorm);
      });

      if (matchingVariants.length === 0) {
        skippedNoPlasticMatch += 1;
        continue;
      }

      const score = scoreFromYear(year);
      const collectorValue = score;
      const rarity = score;
      const soughtAfter = score;

      for (const variant of matchingVariants) {
        const externalId = `firebird-${variant.externalId}-${year}-${slugify(plasticType)}`;

        const payload = {
          externalId,
          discDocumentId: variant.documentId,
          discExternalId: variant.externalId ?? null,
          discName: variant.displayName ?? null,
          runName,
          year,
          oopStatus,
          collectorValue,
          rarity,
          soughtAfter,
          // rough demo estimates so the UI shows something meaningful
          priceLowUsd: collectorValue * 10,
          priceHighUsd: collectorValue * 15,
          notes: `Plastic Type: ${plasticType}\n${description}`.trim() || null,
        };

        const result = await upsertByExternalId(strapi, COLLECTOR_RELEASE_UID, payload);
        if (result === 'created') created += 1;
        else updated += 1;
      }
    }
  } finally {
    await strapi.destroy();
  }

  console.log(
    `Collector release import complete. Created: ${created}, Updated: ${updated}, Skipped (no variant): ${skippedNoVariant}, Skipped (no plastic match): ${skippedNoPlasticMatch}`,
  );
};

run().catch((error) => {
  console.error('Collector release import failed:', error);
  process.exit(1);
});

