/**
 * disc-submission service
 */

import { factories } from '@strapi/strapi';

const SUBMISSION_UID = 'api::disc-submission.disc-submission';
const DISC_UID = 'api::disc.disc';

const buildExternalId = (submissionDocumentId: string) => `submission-${submissionDocumentId}`;

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDiscData = (submission: Record<string, any>) => ({
  externalId: buildExternalId(String(submission.documentId)),
  name: submission.discName,
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
  description: submission.description ?? undefined,
  color: submission.color ?? undefined,
  backgroundColor: submission.backgroundColor ?? undefined,
});

export default factories.createCoreService(SUBMISSION_UID, ({ strapi }) => ({
  async syncApprovedSubmissions() {
    const submissionService = strapi.documents(SUBMISSION_UID);
    const discService = strapi.documents(DISC_UID);
    const pageSize = 100;
    let page = 1;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const findDiscByExternalId = async (externalId: string) => {
      let existing: any = await discService.findFirst({
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
    };

    while (true) {
      const submissions = await submissionService.findMany({
        status: 'draft',
        fields: [
          'documentId',
          'discName',
          'brand',
          'category',
          'speed',
          'glide',
          'turn',
          'fade',
          'stability',
          'plastic',
          'diameterCm',
          'heightCm',
          'rimDepthCm',
          'rimThicknessCm',
          'maxWeightGr',
          'link',
          'imageUrl',
          'description',
          'color',
          'backgroundColor',
          'moderation',
        ],
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
        const discName = submission.discName;

        if (typeof documentId !== 'string' || documentId.length === 0) {
          skipped += 1;
          continue;
        }
        if (typeof discName !== 'string' || discName.trim().length === 0) {
          skipped += 1;
          continue;
        }

        const data = toDiscData(submission);
        const existingDocumentId = await findDiscByExternalId(String(data.externalId));

        if (existingDocumentId) {
          await discService.update({
            documentId: existingDocumentId,
            data: data as any,
          });
          await discService.publish({
            documentId: existingDocumentId,
          });
          updated += 1;
        } else {
          await discService.create({
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
