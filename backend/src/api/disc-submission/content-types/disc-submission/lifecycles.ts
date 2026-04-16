const SUBMISSION_UID = 'api::disc-submission.disc-submission';
const DISC_UID = 'api::disc.disc';

const buildExternalId = (submissionDocumentId: string) => `submission-${submissionDocumentId}`;
const isApproved = (moderation: unknown) => moderation === 'approved';

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function findDiscByExternalId(strapi: any, externalId: string) {
  const discService = strapi.documents(DISC_UID);

  let existing = await discService.findFirst({
    fields: ['documentId'],
    filters: { externalId },
    status: 'draft',
  });

  if (!existing?.documentId) {
    existing = await discService.findFirst({
      fields: ['documentId'],
      filters: { externalId },
      status: 'published',
    });
  }

  if (!existing?.documentId) {
    const legacy = await strapi.db.query(DISC_UID).findOne({
      where: { externalId },
      select: ['documentId'],
    });
    if (legacy?.documentId) {
      existing = { documentId: legacy.documentId };
    }
  }

  return existing?.documentId ?? null;
}

async function unpublishDerivedDisc(strapi: any, submissionDocumentId: string) {
  const externalId = buildExternalId(submissionDocumentId);
  const discService = strapi.documents(DISC_UID);

  const published = await discService.findFirst({
    fields: ['documentId'],
    filters: { externalId },
    status: 'published',
  });

  if (!published?.documentId) {
    return;
  }

  try {
    await discService.unpublish({ documentId: published.documentId });
  } catch (error: unknown) {
    strapi.log.warn(`disc-submission lifecycle: unpublish failed: ${String(error)}`);
  }
}

async function upsertDiscFromSubmission(strapi: any, submission: Record<string, unknown>) {
  const submissionDocumentId = submission.documentId;
  if (typeof submissionDocumentId !== 'string' || submissionDocumentId.length === 0) {
    return;
  }

  const discService = strapi.documents(DISC_UID);
  const discName = submission.discName;

  if (typeof discName !== 'string' || discName.trim().length === 0) {
    strapi.log.warn(
      `disc-submission lifecycle: submission ${submissionDocumentId} missing discName; skipping disc sync.`
    );
    return;
  }

  const externalId = buildExternalId(submissionDocumentId);

  const data: Record<string, unknown> = {
    externalId,
    name: discName,
    brand: submission.brand ?? undefined,
    category: submission.category ?? undefined,
    speed: toNumber(submission.speed) ?? undefined,
    glide: toNumber(submission.glide) ?? undefined,
    turn: toNumber(submission.turn) ?? undefined,
    fade: toNumber(submission.fade) ?? undefined,
    stability: submission.stability ?? undefined,
    plastic: submission.plastic ?? undefined,
    diameterCm: toNumber(submission.diameterCm) ?? undefined,
    heightCm: toNumber(submission.heightCm) ?? undefined,
    rimDepthCm: toNumber(submission.rimDepthCm) ?? undefined,
    rimThicknessCm: toNumber(submission.rimThicknessCm) ?? undefined,
    maxWeightGr: toNumber(submission.maxWeightGr) ?? undefined,
    link: submission.link ?? undefined,
    imageUrl: submission.imageUrl ?? undefined,
    color: submission.color ?? undefined,
    backgroundColor: submission.backgroundColor ?? undefined,
  };

  const existingDocumentId = await findDiscByExternalId(strapi, externalId);

  if (existingDocumentId) {
    await discService.update({
      documentId: existingDocumentId,
      data,
    });
    await discService.publish({
      documentId: existingDocumentId,
    });
    return;
  }

  await discService.create({
    data,
    status: 'published',
  });
}

async function handleSubmissionChange(strapi: any, submission: Record<string, unknown>) {
  const documentId = submission.documentId;
  if (typeof documentId !== 'string' || documentId.length === 0) {
    return;
  }

  if (isApproved(submission.moderation)) {
    await upsertDiscFromSubmission(strapi, submission);
    return;
  }

  await unpublishDerivedDisc(strapi, documentId);
}

export default {
  async afterCreate(event: any) {
    try {
      await handleSubmissionChange(strapi, event.result ?? {});
    } catch (error) {
      strapi.log.error(`disc-submission afterCreate lifecycle error: ${String(error)}`);
    }
  },

  async afterUpdate(event: any) {
    try {
      await handleSubmissionChange(strapi, event.result ?? {});
    } catch (error) {
      strapi.log.error(`disc-submission afterUpdate lifecycle error: ${String(error)}`);
    }
  },
};
