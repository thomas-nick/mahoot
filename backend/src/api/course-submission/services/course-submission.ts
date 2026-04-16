/**
 * course-submission service
 */

import { factories } from '@strapi/strapi';

const SUBMISSION_UID = 'api::course-submission.course-submission';
const COURSE_UID = 'api::course.course';

const buildExternalId = (submissionDocumentId: string) => `submission-${submissionDocumentId}`;

const normalizeMediaIds = (media: unknown): number[] => {
  if (!Array.isArray(media)) {
    return [];
  }

  return media
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        return item;
      }
      if (item && typeof item === 'object' && 'id' in item) {
        const id = Number((item as { id: unknown }).id);
        return Number.isFinite(id) ? id : null;
      }
      return null;
    })
    .filter((id): id is number => id !== null);
};

const toCourseData = (submission: Record<string, any>) => {
  const externalId = buildExternalId(String(submission.documentId));
  const photoIds = normalizeMediaIds(submission.photos);
  const videoIds = normalizeMediaIds(submission.videos);
  const videoLinksRaw = submission.videoLInks ?? submission.videoLinks;
  const layoutsRaw = submission.layouts;

  const data: Record<string, unknown> = {
    externalId,
    name: submission.courseName,
    city: submission.city ?? undefined,
    state: submission.state ?? undefined,
    country: submission.country ?? undefined,
    latitude: submission.latitude ?? undefined,
    longitude: submission.longitude ?? undefined,
    difficulty: submission.difficulty ?? undefined,
    type: submission.type ?? undefined,
    pros: submission.pros ?? undefined,
    cons: submission.cons ?? undefined,
    description: submission.description ?? undefined,
    photos: photoIds,
    videos: videoIds,
  };

  if (Array.isArray(videoLinksRaw)) {
    data.videoLinks = videoLinksRaw.length > 0 ? videoLinksRaw : null;
  }
  if (Array.isArray(layoutsRaw)) {
    data.layouts = layoutsRaw;
  }

  return data;
};

export default factories.createCoreService(SUBMISSION_UID, ({ strapi }) => ({
  async syncApprovedSubmissions() {
    const submissionService = strapi.documents(SUBMISSION_UID);
    const courseService = strapi.documents(COURSE_UID);
    const pageSize = 100;
    let page = 1;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const findCourseByExternalId = async (externalId: string) => {
      let existing: any = await courseService.findFirst({
        fields: ['documentId'],
        filters: { externalId },
        status: 'draft',
      });

      if (!existing?.documentId) {
        existing = await courseService.findFirst({
          fields: ['documentId'],
          filters: { externalId },
          status: 'published',
        });
      }

      if (!existing?.documentId) {
        const legacy = await strapi.db.query(COURSE_UID).findOne({
          where: { externalId },
          select: ['documentId'],
        });
        if (legacy?.documentId) {
          existing = { documentId: legacy.documentId };
        }
      }

      return existing?.documentId ?? null;
    };

    while (true) {
      const submissions = await submissionService.findMany({
        status: 'draft',
        fields: [
          'documentId',
          'courseName',
          'city',
          'state',
          'country',
          'latitude',
          'longitude',
          'difficulty',
          'type',
          'pros',
          'cons',
          'description',
          'moderation',
          'videoLInks',
          'layouts',
        ],
        populate: {
          photos: true,
          videos: true,
        },
        filters: {
          moderation: {
            $eq: 'approved',
          },
        },
        pagination: {
          page,
          pageSize,
        },
      });

      if (!Array.isArray(submissions) || submissions.length === 0) {
        break;
      }

      for (const submission of submissions as Record<string, any>[]) {
        const documentId = submission.documentId;
        const courseName = submission.courseName;

        if (typeof documentId !== 'string' || documentId.length === 0) {
          skipped += 1;
          continue;
        }
        if (typeof courseName !== 'string' || courseName.trim().length === 0) {
          skipped += 1;
          continue;
        }

        const data = toCourseData(submission);
        const existingDocumentId = await findCourseByExternalId(String(data.externalId));

        if (existingDocumentId) {
          await courseService.update({
            documentId: existingDocumentId,
            data: data as any,
          });
          await courseService.publish({
            documentId: existingDocumentId,
          });
          updated += 1;
        } else {
          await courseService.create({
            data: data as any,
            status: 'published',
          });
          created += 1;
        }
      }

      if (submissions.length < pageSize) {
        break;
      }
      page += 1;
    }

    return { created, updated, skipped };
  },
}));
