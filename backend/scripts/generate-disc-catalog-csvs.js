const fs = require('fs/promises');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_CATALOG_PATH = path.join(ROOT_DIR, 'master_disc_catalog.csv');
const ALL_PLASTICS_PATH = path.join(ROOT_DIR, 'all_plastic_variants.csv');
const LEGACY_DISC_CATALOG_PATH = path.join(ROOT_DIR, 'merged_disc_golf_catalog - merged_disc_golf_catalog.csv.csv');
const LEGACY_ENRICHED_DIMENSIONS_PATH = path.join(ROOT_DIR, 'merged_disc_with_pdga_enrichment_preview.csv');

const DISC_MOLDS_OUTPUT_PATH = path.join(ROOT_DIR, 'disc_molds.csv');
const PLASTIC_TYPES_OUTPUT_PATH = path.join(ROOT_DIR, 'plastic_types.csv');
const DISC_VARIANTS_OUTPUT_PATH = path.join(ROOT_DIR, 'disc_variants.csv');

const slugify = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseCsvFile = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const writeCsv = async (filePath, headers, rows) => {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
};

const moldExternalIdFromRow = (row) => {
  const variantExternalId = row.externalId;
  const plasticSlug = slugify(row.slug);
  if (variantExternalId && plasticSlug) {
    const suffix = `-${plasticSlug}`;
    if (variantExternalId.endsWith(suffix)) {
      return variantExternalId.slice(0, variantExternalId.length - suffix.length);
    }
  }
  return slugify(`${row.brand}-${row.mold}`);
};

const normalizeText = (value) => String(value ?? '').trim();
const toNumberOrEmpty = (value) => {
  const text = normalizeText(value);
  if (!text) return '';
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : '';
};
const canonicalMoldName = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');

const BRAND_ALIASES = {
  'mvp-disc-sports': ['MVP Disc Sports', 'MVP'],
  'prodigy-disc': ['Prodigy Disc', 'Prodigy'],
  'dynamic-discs': ['Dynamic Discs'],
  innova: ['Innova'],
  discmania: ['Discmania'],
  'latitude-64': ['Latitude 64'],
  discraft: ['Discraft'],
  'infinite-discs': ['Infinite Discs'],
};

const MOLD_ALIASES = {
  aviar: ['Aviar P&A', 'Aviar'],
  'emac truth': ['Truth, EMAC', 'EMac Truth', 'Truth'],
  'cloud breaker': ['Cloudbreaker', 'Cloud Breaker'],
  'pa-3': ['PA3', 'PA-3'],
};
const BRAND_FAMILY_FALLBACKS = {
  'mvp-disc-sports': ['MVP Disc Sports', 'MVP', 'Axiom Discs'],
  'prodigy-disc': ['Prodigy Disc', 'Prodigy'],
};

const run = async () => {
  const allowCrossBrandFallback = process.env.ALLOW_CROSS_BRAND_LEGACY_FALLBACK === '1';
  const [masterRows, allPlasticRows, legacyRows, enrichedRows] = await Promise.all([
    parseCsvFile(MASTER_CATALOG_PATH),
    parseCsvFile(ALL_PLASTICS_PATH),
    parseCsvFile(LEGACY_DISC_CATALOG_PATH),
    parseCsvFile(LEGACY_ENRICHED_DIMENSIONS_PATH).catch(() => []),
  ]);

  const legacyByBrandAndMoldSlug = new Map();
  const legacyByBrandAndCanonicalName = new Map();
  for (const row of legacyRows) {
    const brand = normalizeText(row.brand);
    const moldName = normalizeText(row.name);
    if (!brand || !moldName) {
      continue;
    }
    const key = `${slugify(brand)}::${slugify(moldName)}`;
    const flight = {
      speed: toNumberOrEmpty(row.speed),
      glide: toNumberOrEmpty(row.glide),
      turn: toNumberOrEmpty(row.turn),
      fade: toNumberOrEmpty(row.fade),
      stability: normalizeText(row.stability),
    };
    if (!legacyByBrandAndMoldSlug.has(key)) legacyByBrandAndMoldSlug.set(key, flight);

    const canonicalKey = `${slugify(brand)}::${canonicalMoldName(moldName)}`;
    if (!legacyByBrandAndCanonicalName.has(canonicalKey)) {
      legacyByBrandAndCanonicalName.set(canonicalKey, flight);
    }
  }

  const getLegacyFlightForMold = (brand, mold) => {
    const brandKey = slugify(brand);
    const baseBrandCandidates = BRAND_ALIASES[brandKey] ?? [brand];
    const familyFallbacks = allowCrossBrandFallback ? BRAND_FAMILY_FALLBACKS[brandKey] ?? [] : [];
    const brandCandidates = Array.from(new Set([...baseBrandCandidates, ...familyFallbacks]));
    const moldCandidates = [mold, ...(MOLD_ALIASES[mold.toLowerCase()] ?? [])];
    for (const brandCandidate of brandCandidates) {
      for (const moldCandidate of moldCandidates) {
        const exact = legacyByBrandAndMoldSlug.get(
          `${slugify(brandCandidate)}::${slugify(moldCandidate)}`,
        );
        if (exact) return exact;
      }
    }
    for (const brandCandidate of brandCandidates) {
      for (const moldCandidate of moldCandidates) {
        const canonical = legacyByBrandAndCanonicalName.get(
          `${slugify(brandCandidate)}::${canonicalMoldName(moldCandidate)}`,
        );
        if (canonical) return canonical;
      }
    }
    return null;
  };

  const legacyDimensionsByBrandAndCanonicalName = new Map();
  for (const row of enrichedRows) {
    const brand = normalizeText(row.brand);
    const moldName = normalizeText(row.name);
    if (!brand || !moldName) {
      continue;
    }
    const key = `${slugify(brand)}::${canonicalMoldName(moldName)}`;
    if (!legacyDimensionsByBrandAndCanonicalName.has(key)) {
      legacyDimensionsByBrandAndCanonicalName.set(key, {
        diameterCm: toNumberOrEmpty(row.pdga_diameter_cm ?? row.jr_diameter),
        heightCm: toNumberOrEmpty(row.pdga_height_cm ?? row.jr_height),
        rimDepthCm: toNumberOrEmpty(row.pdga_rim_depth_cm ?? row.jr_rimdepth),
        rimThicknessCm: toNumberOrEmpty(row.pdga_rim_thickness_cm ?? row['Rim Thickness (cm)']),
        maxWeightGr: toNumberOrEmpty(row.pdga_max_weight_gr ?? row.jr_maxweight),
      });
    }
  }

  const plasticByBrandSlug = new Map();
  for (const row of allPlasticRows) {
    const brand = normalizeText(row.brand);
    const rowSlug = slugify(row.slug);
    const key = `${brand.toLowerCase()}::${rowSlug}`;
    if (!plasticByBrandSlug.has(key)) {
      plasticByBrandSlug.set(key, row);
    }
  }

  const moldRowsById = new Map();
  const variantRows = [];
  const missingPlastics = [];

  for (const row of masterRows) {
    const brand = normalizeText(row.brand);
    const mold = normalizeText(row.mold);
    const category = normalizeText(row.category);
    const name = normalizeText(row.name);
    const variantExternalId = normalizeText(row.externalId);
    const plasticSlug = slugify(row.slug);

    if (!brand || !mold || !variantExternalId) {
      continue;
    }

    const moldExternalId = moldExternalIdFromRow(row);
    if (!moldRowsById.has(moldExternalId)) {
      const legacy = getLegacyFlightForMold(brand, mold);
      const dimensionCandidates = [brand, ...(allowCrossBrandFallback ? BRAND_FAMILY_FALLBACKS[slugify(brand)] ?? [] : [])];
      let legacyDimensions = null;
      for (const dimensionBrand of dimensionCandidates) {
        const maybe = legacyDimensionsByBrandAndCanonicalName.get(
          `${slugify(dimensionBrand)}::${canonicalMoldName(mold)}`,
        );
        if (maybe) {
          legacyDimensions = maybe;
          break;
        }
      }
      moldRowsById.set(moldExternalId, {
        externalId: moldExternalId,
        name: mold,
        brand,
        category,
        speed: legacy?.speed ?? '',
        glide: legacy?.glide ?? '',
        turn: legacy?.turn ?? '',
        fade: legacy?.fade ?? '',
        stability: legacy?.stability ?? '',
        diameterCm: legacyDimensions?.diameterCm ?? '',
        heightCm: legacyDimensions?.heightCm ?? '',
        rimDepthCm: legacyDimensions?.rimDepthCm ?? '',
        rimThicknessCm: legacyDimensions?.rimThicknessCm ?? '',
        maxWeightGr: legacyDimensions?.maxWeightGr ?? '',
        nameSlug: slugify(mold),
        brandSlug: slugify(brand),
        categorySlug: slugify(category),
      });
    }

    const plasticKey = `${brand.toLowerCase()}::${plasticSlug}`;
    const plastic = plasticByBrandSlug.get(plasticKey);
    if (!plastic) {
      missingPlastics.push({
        externalId: variantExternalId,
        brand,
        plasticSlug,
      });
      continue;
    }

    variantRows.push({
      externalId: variantExternalId,
      moldExternalId,
      plasticExternalId: normalizeText(plastic.externalId),
      displayName: `${name} ${mold}`.trim(),
      speed: '',
      glide: '',
      turn: '',
      fade: '',
      stability: '',
      weightMin: '',
      weightMax: '',
      link: '',
      imageUrl: '',
      notes: '',
      slug: slugify(`${mold}-${plasticSlug}`),
    });
  }

  const moldRows = Array.from(moldRowsById.values()).sort((a, b) =>
    a.externalId.localeCompare(b.externalId),
  );
  const plasticRows = allPlasticRows
    .map((row) => ({
      externalId: normalizeText(row.externalId),
      name: normalizeText(row.name),
      brand: normalizeText(row.brand),
      plasticFamily: normalizeText(row.plasticFamily),
      stiffness: normalizeText(row.stiffness),
      grip: normalizeText(row.grip),
      durability: normalizeText(row.durability),
      slug: slugify(row.slug),
    }))
    .sort((a, b) => a.externalId.localeCompare(b.externalId));

  variantRows.sort((a, b) => a.externalId.localeCompare(b.externalId));

  await Promise.all([
    writeCsv(
      DISC_MOLDS_OUTPUT_PATH,
      [
        'externalId',
        'name',
        'brand',
        'category',
        'speed',
        'glide',
        'turn',
        'fade',
        'stability',
        'diameterCm',
        'heightCm',
        'rimDepthCm',
        'rimThicknessCm',
        'maxWeightGr',
        'nameSlug',
        'brandSlug',
        'categorySlug',
      ],
      moldRows,
    ),
    writeCsv(
      PLASTIC_TYPES_OUTPUT_PATH,
      ['externalId', 'name', 'brand', 'plasticFamily', 'stiffness', 'grip', 'durability', 'slug'],
      plasticRows,
    ),
    writeCsv(
      DISC_VARIANTS_OUTPUT_PATH,
      [
        'externalId',
        'moldExternalId',
        'plasticExternalId',
        'displayName',
        'speed',
        'glide',
        'turn',
        'fade',
        'stability',
        'weightMin',
        'weightMax',
        'link',
        'imageUrl',
        'notes',
        'slug',
      ],
      variantRows,
    ),
  ]);

  console.log(`Generated ${moldRows.length} molds -> ${path.basename(DISC_MOLDS_OUTPUT_PATH)}`);
  console.log(`Generated ${plasticRows.length} plastics -> ${path.basename(PLASTIC_TYPES_OUTPUT_PATH)}`);
  console.log(`Generated ${variantRows.length} variants -> ${path.basename(DISC_VARIANTS_OUTPUT_PATH)}`);
  console.log(
    `Cross-brand legacy fallback: ${allowCrossBrandFallback ? 'enabled' : 'disabled'} (set ALLOW_CROSS_BRAND_LEGACY_FALLBACK=1)`,
  );

  if (missingPlastics.length > 0) {
    console.warn(`Skipped ${missingPlastics.length} variant rows missing plastic lookup by (brand, slug):`);
    for (const missing of missingPlastics.slice(0, 20)) {
      console.warn(`- ${missing.externalId} (${missing.brand} :: ${missing.plasticSlug})`);
    }
    if (missingPlastics.length > 20) {
      console.warn(`... and ${missingPlastics.length - 20} more`);
    }
  }
};

run().catch((error) => {
  console.error('Failed to generate catalog CSVs:', error);
  process.exit(1);
});
