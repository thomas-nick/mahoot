/**
 * course-submission controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::course-submission.course-submission', ({ strapi }) => ({
  async syncApproved(ctx) {
    const service = strapi.service('api::course-submission.course-submission') as {
      syncApprovedSubmissions: () => Promise<{ created: number; updated: number; skipped: number }>;
    };
    const result = await service.syncApprovedSubmissions();
    ctx.send({ ok: true, ...result });
  },
}));
