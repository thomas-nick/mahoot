export default {
  routes: [
    {
      method: 'GET',
      /** Query `?username=` avoids clashing with core `GET /profiles/:documentId`. */
      path: '/profiles/resolve-public',
      handler: 'profile.lookupPublic',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
