/**
 * disc-submission controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::disc-submission.disc-submission', ({ strapi }) => ({
  async syncApproved(ctx) {
    const service = strapi.service('api::disc-submission.disc-submission') as {
      syncApprovedSubmissions: () => Promise<{ created: number; updated: number; skipped: number }>;
    };
    const result = await service.syncApprovedSubmissions();
    ctx.send({ ok: true, ...result });
  },
}));
