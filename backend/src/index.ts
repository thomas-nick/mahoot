// import type { Core } from '@strapi/strapi';

/**
 * The Strapi 5 content-API validator runs `throwRestrictedRelations`, which
 * checks that the requesting auth has `find` permission on the *target* of any
 * relation key referenced in the body, in `filters`, or in `populate`.
 *
 * Many of our content types (`profile.user`, `market-listing.seller`,
 * `market-favorite.user`, `market-offer.buyer`, `market-message.sender`,
 * `market-message.recipient`) point at `plugin::users-permissions.user`. By
 * default the Authenticated role does NOT have `find` on that content type, so
 * any request that touches one of those relations fails with
 * `400 ValidationError "Invalid key <relation>"`, and any populated relation is
 * silently stripped from responses.
 *
 * Granting `plugin::users-permissions.user.find` to the Authenticated role
 * unblocks all of those code paths (filters, populates, and write bodies).
 * The user record itself is still gated by sanitizers (we only ever populate
 * `username`/`email`/`id` from the listing pages), so this is safe.
 */
const ENSURED_AUTHENTICATED_PERMISSIONS = [
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  // Helpful-vote endpoints. `create` writes a vote; `deleteByRating` removes
  // the caller's vote. `find`/`findOne` lets the client check their own vote.
  'api::disc-rating-vote.disc-rating-vote.create',
  'api::disc-rating-vote.disc-rating-vote.find',
  'api::disc-rating-vote.disc-rating-vote.findOne',
  'api::disc-rating-vote.disc-rating-vote.deleteByRating',
  'api::course-rating-vote.course-rating-vote.create',
  'api::course-rating-vote.course-rating-vote.find',
  'api::course-rating-vote.course-rating-vote.findOne',
  'api::course-rating-vote.course-rating-vote.deleteByRating',
  // Marketplace: a logged-in user can list, browse, manage, and message.
  // Ownership/visibility is enforced inside each controller.
  'api::market-listing.market-listing.find',
  'api::market-listing.market-listing.findOne',
  'api::market-listing.market-listing.create',
  'api::market-listing.market-listing.update',
  'api::market-listing.market-listing.delete',
  'api::market-favorite.market-favorite.find',
  'api::market-favorite.market-favorite.findOne',
  'api::market-favorite.market-favorite.create',
  'api::market-favorite.market-favorite.delete',
  'api::market-offer.market-offer.find',
  'api::market-offer.market-offer.findOne',
  'api::market-offer.market-offer.create',
  'api::market-offer.market-offer.update',
  'api::market-offer.market-offer.delete',
  'api::market-message.market-message.find',
  'api::market-message.market-message.findOne',
  'api::market-message.market-message.create',
  // `update` is used to mark a message as read.
  'api::market-message.market-message.update',
  // Profile (own settings, payment handles): Authenticated users need read +
  // create + update of profile rows. Ownership is enforced inside the
  // controller by attaching ctx.state.user to writes.
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::profile.profile.create',
  'api::profile.profile.update',
];

const ENSURED_PUBLIC_PERMISSIONS = [
  // Public marketplace browse / listing detail must be able to render the seller
  // username, so we also grant the Public role `find`/`findOne` on user. The
  // sanitizer still enforces the field-level allowlist set by the populate
  // queries (we only ever populate `username` / `email` / `id`).
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  // Reading aggregated vote counts is public (already denormalized on the
  // rating), but `find`/`findOne` on the votes themselves stays open so
  // logged-out viewers can see thumbs-up totals if we ever surface them.
  'api::disc-rating-vote.disc-rating-vote.find',
  'api::disc-rating-vote.disc-rating-vote.findOne',
  'api::course-rating-vote.course-rating-vote.find',
  'api::course-rating-vote.course-rating-vote.findOne',
  // Public marketplace browse + listing detail. Sellers' personal contact
  // details are gated by the listing controller's sanitizer.
  'api::market-listing.market-listing.find',
  'api::market-listing.market-listing.findOne',
  // Public profile pages (/u/[username]) need to render counts of approved
  // submissions and active listings without requiring login.
  'api::profile.profile.find',
  'api::profile.profile.findOne',
  'api::disc-submission.disc-submission.find',
  'api::disc-submission.disc-submission.findOne',
  'api::course-submission.course-submission.find',
  'api::course-submission.course-submission.findOne',
];

const ensureRolePermissions = async (
  strapi: any,
  roleType: 'authenticated' | 'public',
  actions: string[],
) => {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });
  if (!role?.id) return;

  for (const action of actions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: role.id } });
    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: role.id } });
      strapi.log.info(`[bootstrap] Granted ${roleType} role: ${action}`);
    }
  }
};

const ensureAuthenticatedPermissions = async ({ strapi }: { strapi: any }) => {
  try {
    await ensureRolePermissions(strapi, 'authenticated', ENSURED_AUTHENTICATED_PERMISSIONS);
    await ensureRolePermissions(strapi, 'public', ENSURED_PUBLIC_PERMISSIONS);
  } catch (error) {
    strapi.log.warn(
      `[bootstrap] Could not ensure user-relation permissions: ${(error as Error).message}`
    );
  }
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    await ensureAuthenticatedPermissions({ strapi });
  },
};
