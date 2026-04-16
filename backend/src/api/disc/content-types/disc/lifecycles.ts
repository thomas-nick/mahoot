import { getTypesenseSync } from '../../../../lib/typesense-sync';

const sync = getTypesenseSync();

const isPublished = (entry: Record<string, unknown>) => Boolean(entry?.publishedAt);

export default {
  async afterCreate(event: any) {
    const disc = event.result;
    await sync.ensureCollections();

    if (isPublished(disc)) {
      await sync.upsertDisc(disc);
      return;
    }

    await sync.deleteDisc(disc);
  },

  async afterUpdate(event: any) {
    const disc = event.result;
    await sync.ensureCollections();

    if (isPublished(disc)) {
      await sync.upsertDisc(disc);
      return;
    }

    await sync.deleteDisc(disc);
  },

  async afterDelete(event: any) {
    const disc = event.result ?? event.params?.where ?? {};
    await sync.ensureCollections();
    await sync.deleteDisc(disc);
  },
};
