const toNullableString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = Number(String(value).trim());
  return Number.isFinite(normalized) ? normalized : null;
};

const normalizeDiscRecord = (record) => ({
  externalId: toNullableString(record.id) ?? toNullableString(record.name_slug),
  name: toNullableString(record.name),
  brand: toNullableString(record.brand),
  category: toNullableString(record.category),
  categoryId: toNullableNumber(record['category id']),
  speed: toNullableNumber(record.speed),
  glide: toNullableNumber(record.glide),
  turn: toNullableNumber(record.turn),
  fade: toNullableNumber(record.fade),
  stability: toNullableString(record.stability),
  link: toNullableString(record.link),
  imageUrl: toNullableString(record.pic),
  nameSlug: toNullableString(record.name_slug),
  brandSlug: toNullableString(record.brand_slug),
  categorySlug: toNullableString(record.category_slug),
  stabilitySlug: toNullableString(record.stability_slug),
  color: toNullableString(record.color),
  backgroundColor: toNullableString(record.background_color),
});

const normalizeCourseRecord = (record) => ({
  externalId: toNullableString(record.id),
  name: toNullableString(record.name),
  city: toNullableString(record.city),
  state: toNullableString(record.state),
  zip: toNullableString(record.zip),
  holeCount: toNullableNumber(record.holeCount),
  rating: toNullableNumber(record.rating),
  latitude: toNullableNumber(record.latitude),
  longitude: toNullableNumber(record.longitude),
});

const normalizeDiscMoldRecord = (record) => ({
  externalId: toNullableString(record.externalId) ?? toNullableString(record.id),
  name: toNullableString(record.name),
  brand: toNullableString(record.brand),
  category: toNullableString(record.category),
  speed: toNullableNumber(record.speed),
  glide: toNullableNumber(record.glide),
  turn: toNullableNumber(record.turn),
  fade: toNullableNumber(record.fade),
  stability: toNullableString(record.stability),
  diameterCm: toNullableNumber(record.diameterCm ?? record.diameter_cm),
  heightCm: toNullableNumber(record.heightCm ?? record.height_cm),
  rimDepthCm: toNullableNumber(record.rimDepthCm ?? record.rim_depth_cm),
  rimThicknessCm: toNullableNumber(record.rimThicknessCm ?? record.rim_thickness_cm),
  maxWeightGr: toNullableNumber(record.maxWeightGr ?? record.max_weight_gr),
  nameSlug: toNullableString(record.nameSlug ?? record.name_slug),
  brandSlug: toNullableString(record.brandSlug ?? record.brand_slug),
  categorySlug: toNullableString(record.categorySlug ?? record.category_slug),
});

const normalizePlasticTypeRecord = (record) => ({
  externalId: toNullableString(record.externalId) ?? toNullableString(record.id),
  name: toNullableString(record.name),
  brand: toNullableString(record.brand),
  plasticFamily: toNullableString(record.plasticFamily ?? record.plastic_family),
  stiffness: toNullableString(record.stiffness),
  grip: toNullableString(record.grip),
  durability: toNullableString(record.durability),
  slug: toNullableString(record.slug),
});

const normalizeDiscVariantRecord = (record) => ({
  externalId: toNullableString(record.externalId) ?? toNullableString(record.id),
  moldExternalId: toNullableString(record.moldExternalId ?? record.mold_external_id),
  plasticExternalId: toNullableString(record.plasticExternalId ?? record.plastic_external_id),
  displayName: toNullableString(record.displayName ?? record.display_name),
  speed: toNullableNumber(record.speed),
  glide: toNullableNumber(record.glide),
  turn: toNullableNumber(record.turn),
  fade: toNullableNumber(record.fade),
  stability: toNullableString(record.stability),
  weightMin: toNullableNumber(record.weightMin ?? record.weight_min),
  weightMax: toNullableNumber(record.weightMax ?? record.weight_max),
  link: toNullableString(record.link),
  imageUrl: toNullableString(record.imageUrl ?? record.image_url),
  notes: toNullableString(record.notes),
  slug: toNullableString(record.slug),
});

module.exports = {
  normalizeDiscRecord,
  normalizeCourseRecord,
  normalizeDiscMoldRecord,
  normalizePlasticTypeRecord,
  normalizeDiscVariantRecord,
};
