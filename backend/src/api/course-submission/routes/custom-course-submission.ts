export default {
  routes: [
    {
      method: 'POST',
      path: '/course-submissions/sync-approved',
      handler: 'course-submission.syncApproved',
      config: {
        auth: false,
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
