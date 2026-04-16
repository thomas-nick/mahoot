import type { StrapiApp } from '@strapi/strapi/admin';

import SyncApprovedSubmissionsPanel from './components/SyncApprovedSubmissionsPanel';

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {
    app.getPlugin('content-manager').apis.addEditViewSidePanel([SyncApprovedSubmissionsPanel]);
  },
};
