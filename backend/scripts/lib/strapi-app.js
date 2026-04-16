const path = require('node:path');
const { createStrapi } = require('@strapi/strapi');

const loadStrapi = async () => {
  const appDir = process.cwd();
  const strapi = createStrapi({
    appDir,
    distDir: path.join(appDir, 'dist'),
  });

  await strapi.load();
  return strapi;
};

const upsertByExternalId = async (strapi, uid, payload) => {
  const service = strapi.documents(uid);
  let existing = await service.findFirst({
    fields: ['documentId'],
    filters: { externalId: payload.externalId },
    status: 'draft',
  });

  if (!existing?.documentId) {
    existing = await service.findFirst({
      fields: ['documentId'],
      filters: { externalId: payload.externalId },
      status: 'published',
    });
  }

  if (!existing?.documentId) {
    const legacy = await strapi.db.query(uid).findOne({
      where: { externalId: payload.externalId },
      select: ['documentId'],
    });

    if (legacy?.documentId) {
      existing = { documentId: legacy.documentId };
    }
  }

  if (existing) {
    await service.update({
      documentId: existing.documentId,
      data: payload,
    });
    await service.publish({
      documentId: existing.documentId,
    });
    return 'updated';
  }

  await service.create({
    data: payload,
    status: 'published',
  });
  return 'created';
};

module.exports = {
  loadStrapi,
  upsertByExternalId,
};
