import { getTypesenseSync } from '../../../../lib/typesense-sync';

const sync = getTypesenseSync();

const isPublished = (entry: Record<string, unknown>) => Boolean(entry?.publishedAt);

export default {
  async afterCreate(event: any) {
    const course = event.result;
    await sync.ensureCollections();

    if (isPublished(course)) {
      await sync.upsertCourse(course);
      return;
    }

    await sync.deleteCourse(course);
  },

  async afterUpdate(event: any) {
    const course = event.result;
    await sync.ensureCollections();

    if (isPublished(course)) {
      await sync.upsertCourse(course);
      return;
    }

    await sync.deleteCourse(course);
  },

  async afterDelete(event: any) {
    const course = event.result ?? event.params?.where ?? {};
    await sync.ensureCollections();
    await sync.deleteCourse(course);
  },
};
