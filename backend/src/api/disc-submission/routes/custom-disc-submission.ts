export default {
  routes: [
    {
      method: 'POST',
      path: '/disc-submissions/sync-approved',
      handler: 'disc-submission.syncApproved',
      config: {
        auth: false,
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
