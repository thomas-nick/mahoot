const SUBMISSION_UID = 'api::course-submission.course-submission';
const COURSE_UID = 'api::course.course';

const buildExternalId = (submissionDocumentId: string) => `submission-${submissionDocumentId}`;

const normalizeMediaIds = (media: unknown): number[] => {
  if (!media || !Array.isArray(media)) {
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

const isApproved = (moderation: unknown) => moderation === 'approved';

async function findCourseByExternalId(strapi: any, externalId: string) {
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
}

async function unpublishDerivedCourse(strapi: any, submissionDocumentId: string) {
  const externalId = buildExternalId(submissionDocumentId);
  const courseService = strapi.documents(COURSE_UID);

  const published = await courseService.findFirst({
    fields: ['documentId'],
    filters: { externalId },
    status: 'published',
  });

  if (!published?.documentId) {
    return;
  }

  try {
    await courseService.unpublish({ documentId: published.documentId });
  } catch (error: unknown) {
    strapi.log.warn(`course-submission lifecycle: unpublish failed: ${String(error)}`);
  }
}

async function upsertCourseFromSubmission(strapi: any, submission: Record<string, unknown>) {
  const submissionDocumentId = submission.documentId;
  if (typeof submissionDocumentId !== 'string' || submissionDocumentId.length === 0) {
    return;
  }

  const courseService = strapi.documents(COURSE_UID);

  let full: Record<string, unknown> = { ...submission };
  try {
    const loaded = await strapi.documents(SUBMISSION_UID).findOne({
      documentId: submissionDocumentId,
      populate: {
        photos: true,
        videos: true,
      },
    });
    if (loaded) {
      full = loaded as Record<string, unknown>;
    }
  } catch (error) {
    strapi.log.warn(`course-submission findOne (populate media): ${String(error)}`);
  }

  const courseName = full.courseName;
  if (typeof courseName !== 'string' || courseName.trim().length === 0) {
    strapi.log.warn(
      `course-submission lifecycle: submission ${submissionDocumentId} missing courseName; skipping course sync.`
    );
    return;
  }

  const externalId = buildExternalId(submissionDocumentId);
  const photoIds = normalizeMediaIds(full.photos);
  const videoIds = normalizeMediaIds(full.videos);

  const videoLinksRaw = full['videoLInks'] ?? full.videoLinks;
  const layoutsRaw = full.layouts;

  const data: Record<string, unknown> = {
    externalId,
    name: courseName,
    city: full.city ?? undefined,
    state: full.state ?? undefined,
    country: full.country ?? undefined,
    difficulty: full.difficulty ?? undefined,
    type: full.type ?? undefined,
    pros: full.pros ?? undefined,
    cons: full.cons ?? undefined,
    description: full.description ?? undefined,
  };

  data.photos = photoIds;
  data.videos = videoIds;
  if (Array.isArray(videoLinksRaw)) {
    data.videoLinks = videoLinksRaw.length > 0 ? videoLinksRaw : null;
  }
  if (Array.isArray(layoutsRaw)) {
    data.layouts = layoutsRaw;
  }

  const existingDocumentId = await findCourseByExternalId(strapi, externalId);

  if (existingDocumentId) {
    await courseService.update({
      documentId: existingDocumentId,
      data,
    });
    await courseService.publish({
      documentId: existingDocumentId,
    });
    return;
  }

  await courseService.create({
    data,
    status: 'published',
  });
}

async function handleSubmissionChange(strapi: any, submission: Record<string, unknown>) {
  const documentId = submission.documentId;
  if (typeof documentId !== 'string' || documentId.length === 0) {
    return;
  }

  const moderation = submission.moderation;

  if (isApproved(moderation)) {
    await upsertCourseFromSubmission(strapi, submission);
    return;
  }

  await unpublishDerivedCourse(strapi, documentId);
}

export default {
  async afterCreate(event: any) {
    try {
      await handleSubmissionChange(strapi, event.result ?? {});
    } catch (error) {
      strapi.log.error(`course-submission afterCreate lifecycle error: ${String(error)}`);
    }
  },

  async afterUpdate(event: any) {
    try {
      await handleSubmissionChange(strapi, event.result ?? {});
    } catch (error) {
      strapi.log.error(`course-submission afterUpdate lifecycle error: ${String(error)}`);
    }
  },
};
