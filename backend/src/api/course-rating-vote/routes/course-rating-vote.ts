export default {
  routes: [
    {
      method: 'GET',
      path: '/course-rating-votes',
      handler: 'course-rating-vote.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/course-rating-votes/:id',
      handler: 'course-rating-vote.findOne',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/course-rating-votes',
      handler: 'course-rating-vote.create',
    },
    {
      method: 'DELETE',
      path: '/course-rating-votes/by-rating/:ratingDocumentId',
      handler: 'course-rating-vote.deleteByRating',
    },
  ],
};
