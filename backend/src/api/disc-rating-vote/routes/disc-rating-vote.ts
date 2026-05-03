export default {
  routes: [
    {
      method: 'GET',
      path: '/disc-rating-votes',
      handler: 'disc-rating-vote.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/disc-rating-votes/:id',
      handler: 'disc-rating-vote.findOne',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/disc-rating-votes',
      handler: 'disc-rating-vote.create',
    },
    {
      method: 'DELETE',
      path: '/disc-rating-votes/by-rating/:ratingDocumentId',
      handler: 'disc-rating-vote.deleteByRating',
    },
  ],
};
