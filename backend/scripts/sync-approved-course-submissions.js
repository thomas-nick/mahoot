const { loadStrapi } = require('./lib/strapi-app');

const SUBMISSION_UID = 'api::course-submission.course-submission';
const COURSE_UID = 'api::course.course';

const buildExternalId = (submissionDocumentId) => `submission-${submissionDocumentId}`;

const normalizeMediaIds = (media) => {
  if (!Array.isArray(media)) {
    return [];
  }

  return media
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        return item;
      }
      if (item && typeof item === 'object' && 'id' in item) {
        const id = Number(item.id);
        return Number.isFinite(id) ? id : null;
      }
      return null;
    })
    .filter((id) => id !== null);
};

const findCourseByExternalId = async (strapi, externalId) => {
  const courseService = strapi.documents(COURSE_UID);

  let existing = await courseService.findFirst({
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

const toCourseData = (submission) => {
  const submissionDocumentId = submission.documentId;
  const externalId = buildExternalId(submissionDocumentId);
  const photoIds = normalizeMediaIds(submission.photos);
  const videoIds = normalizeMediaIds(submission.videos);
  const videoLinksRaw = submission.videoLInks ?? submission.videoLinks;

  const data = {
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

  return data;
};

const upsertCourseFromSubmission = async (strapi, submission) => {
  if (typeof submission?.documentId !== 'string' || submission.documentId.length === 0) {
    return 'skipped-missing-document-id';
  }
  if (typeof submission?.courseName !== 'string' || submission.courseName.trim().length === 0) {
    return 'skipped-missing-name';
  }

  const courseService = strapi.documents(COURSE_UID);
  const data = toCourseData(submission);
  const existingDocumentId = await findCourseByExternalId(strapi, data.externalId);

  if (existingDocumentId) {
    await courseService.update({
      documentId: existingDocumentId,
      data,
    });
    await courseService.publish({
      documentId: existingDocumentId,
    });
    return 'updated';
  }

  await courseService.create({
    data,
    status: 'published',
  });
  return 'created';
};

const run = async () => {
  const strapi = await loadStrapi();
  const submissionService = strapi.documents(SUBMISSION_UID);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let page = 1;
  const pageSize = 100;

  try {
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

      for (const submission of submissions) {
        const result = await upsertCourseFromSubmission(strapi, submission);
        if (result === 'created') {
          created += 1;
        } else if (result === 'updated') {
          updated += 1;
        } else {
          skipped += 1;
        }
      }

      if (submissions.length < pageSize) {
        break;
      }
      page += 1;
    }
  } finally {
    await strapi.destroy();
  }

  console.log(
    `Approved submission sync complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`
  );
};

run().catch((error) => {
  console.error('Approved submission sync failed:', error);
  process.exit(1);
});
