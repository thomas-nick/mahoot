import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiCourseRatingVoteCourseRatingVote
  extends Struct.CollectionTypeSchema {
  collectionName: 'course_rating_votes';
  info: {
    description: "A user's helpful / not-helpful vote on a course review.";
    displayName: 'Course Rating Vote';
    pluralName: 'course-rating-votes';
    singularName: 'course-rating-vote';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::course-rating-vote.course-rating-vote'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Relation<
      'manyToOne',
      'api::course-rating.course-rating'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: -1;
        },
        number
      >;
    voter: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface ApiCourseRatingCourseRating
  extends Struct.CollectionTypeSchema {
  collectionName: 'course_ratings';
  info: {
    displayName: 'Course Rating';
    pluralName: 'course-ratings';
    singularName: 'course-rating';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    comment: Schema.Attribute.Text;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    helpfulCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    layout: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::course-rating.course-rating'
    > &
      Schema.Attribute.Private;
    maintenance: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    notHelpfulCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    overall: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    scenery: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    signage: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    submittedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCourseSubmissionCourseSubmission
  extends Struct.CollectionTypeSchema {
  collectionName: 'course_submissions';
  info: {
    displayName: 'Course Submission';
    pluralName: 'course-submissions';
    singularName: 'course-submission';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    city: Schema.Attribute.String;
    cons: Schema.Attribute.Text;
    country: Schema.Attribute.String;
    courseName: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.RichText;
    difficulty: Schema.Attribute.Enumeration<
      ['championship', 'advanced', 'intermediate', 'easy']
    >;
    latitude: Schema.Attribute.Decimal;
    layouts: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional layout/hole JSON submitted by users.';
        };
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::course-submission.course-submission'
    > &
      Schema.Attribute.Private;
    longitude: Schema.Attribute.Decimal;
    moderation: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'rejected', 'default pending']
    >;
    photos: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    pros: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    state: Schema.Attribute.String;
    submittedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    type: Schema.Attribute.Enumeration<
      ['championship', 'wooded', 'park style', 'pitch and putt']
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    videoLInks: Schema.Attribute.JSON;
    videos: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
  };
}

export interface ApiCourseCourse extends Struct.CollectionTypeSchema {
  collectionName: 'courses';
  info: {
    displayName: 'Course';
    pluralName: 'courses';
    singularName: 'course';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    city: Schema.Attribute.String;
    cons: Schema.Attribute.Text;
    country: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.RichText;
    difficulty: Schema.Attribute.Enumeration<
      ['championship', 'advanced', 'intermediate', 'easy']
    >;
    externalId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    holeCount: Schema.Attribute.Integer;
    latitude: Schema.Attribute.Decimal;
    layouts: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional hole/layout data for this course.';
        };
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::course.course'
    > &
      Schema.Attribute.Private;
    longitude: Schema.Attribute.Decimal;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    photos: Schema.Attribute.Media<'images', true>;
    pros: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Decimal;
    ratingAverageLayout: Schema.Attribute.Decimal;
    ratingAverageMaintenance: Schema.Attribute.Decimal;
    ratingAverageOverall: Schema.Attribute.Decimal;
    ratingAverageScenery: Schema.Attribute.Decimal;
    ratingAverageSignage: Schema.Attribute.Decimal;
    ratingBayesScore: Schema.Attribute.Decimal;
    ratingCount: Schema.Attribute.Integer;
    state: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['championship', 'wooded', 'park style', 'pitch and putt']
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    videoLinks: Schema.Attribute.JSON;
    videos: Schema.Attribute.Media<'videos', true>;
    zip: Schema.Attribute.String;
  };
}

export interface ApiDiscMoldDiscMold extends Struct.CollectionTypeSchema {
  collectionName: 'disc_molds';
  info: {
    displayName: 'Disc Mold';
    pluralName: 'disc-molds';
    singularName: 'disc-mold';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    brand: Schema.Attribute.String;
    brandSlug: Schema.Attribute.String;
    category: Schema.Attribute.String;
    categorySlug: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    diameterCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Mold diameter (cm).';
        };
      }>;
    externalId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    fade: Schema.Attribute.Decimal;
    glide: Schema.Attribute.Decimal;
    heightCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Mold height (cm).';
        };
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::disc-mold.disc-mold'
    > &
      Schema.Attribute.Private;
    maxWeightGr: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Mold max weight (g).';
        };
      }>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    nameSlug: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    rimDepthCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Mold rim depth (cm).';
        };
      }>;
    rimThicknessCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Mold rim thickness (cm).';
        };
      }>;
    speed: Schema.Attribute.Decimal;
    stability: Schema.Attribute.String;
    turn: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDiscRatingVoteDiscRatingVote
  extends Struct.CollectionTypeSchema {
  collectionName: 'disc_rating_votes';
  info: {
    description: "A user's helpful / not-helpful vote on a disc review.";
    displayName: 'Disc Rating Vote';
    pluralName: 'disc-rating-votes';
    singularName: 'disc-rating-vote';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::disc-rating-vote.disc-rating-vote'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Relation<
      'manyToOne',
      'api::disc-rating.disc-rating'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: -1;
        },
        number
      >;
    voter: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface ApiDiscRatingDiscRating extends Struct.CollectionTypeSchema {
  collectionName: 'disc_ratings';
  info: {
    displayName: 'Disc Rating';
    pluralName: 'disc-ratings';
    singularName: 'disc-rating';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    armSpeedBand: Schema.Attribute.Enumeration<
      ['arm-under-300', 'arm-300-350', 'arm-350-400', 'arm-over-400']
    >;
    bestUseCases: Schema.Attribute.JSON;
    comment: Schema.Attribute.Text;
    conditions: Schema.Attribute.JSON;
    consistency: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    discDocumentId: Schema.Attribute.String & Schema.Attribute.Required;
    discExternalId: Schema.Attribute.String;
    discName: Schema.Attribute.String;
    distancePotential: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    feelGrip: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    forgiving: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    helpfulCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::disc-rating.disc-rating'
    > &
      Schema.Attribute.Private;
    notHelpfulCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    overall: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    seasonedState: Schema.Attribute.Enumeration<['new', 'seasoned', 'beat']>;
    shotShaping: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    stabilityDelta: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
          min: -4;
        },
        number
      >;
    submittedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    throwStyle: Schema.Attribute.Enumeration<['backhand', 'forehand', 'both']>;
    turnDelta: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
          min: -4;
        },
        number
      >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    windTrust: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    wouldRecommend: Schema.Attribute.Boolean;
  };
}

export interface ApiDiscSubmissionDiscSubmission
  extends Struct.CollectionTypeSchema {
  collectionName: 'disc_submissions';
  info: {
    displayName: 'Disc Submission';
    pluralName: 'disc-submissions';
    singularName: 'disc-submission';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    backgroundColor: Schema.Attribute.String;
    brand: Schema.Attribute.String;
    category: Schema.Attribute.String;
    color: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    diameterCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Diameter (cm, optional).';
        };
      }>;
    discName: Schema.Attribute.String & Schema.Attribute.Required;
    fade: Schema.Attribute.Decimal;
    glide: Schema.Attribute.Decimal;
    heightCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Height (cm, optional).';
        };
      }>;
    imageUrl: Schema.Attribute.String;
    link: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::disc-submission.disc-submission'
    > &
      Schema.Attribute.Private;
    maxWeightGr: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Max weight (g, optional).';
        };
      }>;
    moderation: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'rejected', 'default pending']
    >;
    notes: Schema.Attribute.Text;
    plastic: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Plastic type (optional).';
        };
      }>;
    publishedAt: Schema.Attribute.DateTime;
    rimDepthCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Rim depth (cm, optional).';
        };
      }>;
    rimThicknessCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Rim thickness (cm, optional).';
        };
      }>;
    speed: Schema.Attribute.Decimal;
    stability: Schema.Attribute.String;
    submittedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    turn: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDiscVariantDiscVariant extends Struct.CollectionTypeSchema {
  collectionName: 'disc_variants';
  info: {
    displayName: 'Disc Variant';
    pluralName: 'disc-variants';
    singularName: 'disc-variant';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    collectorValue: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    displayName: Schema.Attribute.String & Schema.Attribute.Required;
    externalId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    fade: Schema.Attribute.Decimal;
    glide: Schema.Attribute.Decimal;
    imageUrl: Schema.Attribute.String;
    link: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::disc-variant.disc-variant'
    > &
      Schema.Attribute.Private;
    mold: Schema.Attribute.Relation<'manyToOne', 'api::disc-mold.disc-mold'> &
      Schema.Attribute.Required;
    notes: Schema.Attribute.Text;
    plastic: Schema.Attribute.Relation<
      'manyToOne',
      'api::plastic-type.plastic-type'
    > &
      Schema.Attribute.Required;
    priceHighUsd: Schema.Attribute.Decimal;
    priceLowUsd: Schema.Attribute.Decimal;
    productionStatus: Schema.Attribute.Enumeration<['in-production', 'oop']> &
      Schema.Attribute.DefaultTo<'in-production'>;
    publishedAt: Schema.Attribute.DateTime;
    rarity: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    ratingAverageOverall: Schema.Attribute.Decimal;
    ratingBayesScore: Schema.Attribute.Decimal;
    ratingCount: Schema.Attribute.Integer;
    releaseType: Schema.Attribute.Enumeration<
      ['stock', 'limited-edition', 'tour-series', 'money-run', 'tournament-run']
    > &
      Schema.Attribute.DefaultTo<'stock'>;
    runName: Schema.Attribute.String;
    runNotes: Schema.Attribute.Text;
    runYear: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 2100;
          min: 1900;
        },
        number
      >;
    slug: Schema.Attribute.String;
    soughtAfter: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    speed: Schema.Attribute.Decimal;
    stability: Schema.Attribute.String;
    turn: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    weightMax: Schema.Attribute.Decimal;
    weightMin: Schema.Attribute.Decimal;
  };
}

export interface ApiDiscDisc extends Struct.CollectionTypeSchema {
  collectionName: 'discs';
  info: {
    displayName: 'Disc';
    pluralName: 'discs';
    singularName: 'disc';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    backgroundColor: Schema.Attribute.String;
    brand: Schema.Attribute.String;
    brandSlug: Schema.Attribute.String;
    category: Schema.Attribute.String;
    categoryId: Schema.Attribute.Integer;
    categorySlug: Schema.Attribute.String;
    color: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    diameterCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Diameter (cm).';
        };
      }>;
    externalId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    fade: Schema.Attribute.Decimal;
    glide: Schema.Attribute.Decimal;
    heightCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Height (cm).';
        };
      }>;
    imageUrl: Schema.Attribute.String;
    link: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::disc.disc'> &
      Schema.Attribute.Private;
    maxWeightGr: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Max weight (g).';
        };
      }>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    nameSlug: Schema.Attribute.String;
    plastic: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Plastic type.';
        };
      }>;
    publishedAt: Schema.Attribute.DateTime;
    ratingAverageOverall: Schema.Attribute.Decimal;
    ratingBayesScore: Schema.Attribute.Decimal;
    ratingCount: Schema.Attribute.Integer;
    rimDepthCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Rim depth (cm).';
        };
      }>;
    rimThicknessCm: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Rim thickness (cm).';
        };
      }>;
    speed: Schema.Attribute.Decimal;
    stability: Schema.Attribute.String;
    stabilitySlug: Schema.Attribute.String;
    turn: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMarketFavoriteMarketFavorite
  extends Struct.CollectionTypeSchema {
  collectionName: 'market_favorites';
  info: {
    description: 'A user-saved marketplace listing (heart/wishlist).';
    displayName: 'Market Favorite';
    pluralName: 'market-favorites';
    singularName: 'market-favorite';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    listing: Schema.Attribute.Relation<
      'manyToOne',
      'api::market-listing.market-listing'
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::market-favorite.market-favorite'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface ApiMarketListingMarketListing
  extends Struct.CollectionTypeSchema {
  collectionName: 'market_listings';
  info: {
    displayName: 'Market Listing';
    pluralName: 'market-listings';
    singularName: 'market-listing';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    city: Schema.Attribute.String;
    colorStamp: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: "Color/stamp description, e.g., 'red w/ silver stamp'.";
        };
      }>;
    condition: Schema.Attribute.Enumeration<
      ['new', 'like-new', 'used', 'inked', 'unknown']
    > &
      Schema.Attribute.DefaultTo<'used'>;
    country: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'ISO 3166-1 alpha-2 country code.';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2;
      }> &
      Schema.Attribute.DefaultTo<'US'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }> &
      Schema.Attribute.DefaultTo<'USD'>;
    description: Schema.Attribute.Text;
    discDisplayName: Schema.Attribute.String;
    discDocumentId: Schema.Attribute.String & Schema.Attribute.Required;
    discExternalId: Schema.Attribute.String;
    imageUrl: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Primary listing photo (displayed first). Kept for backward compatibility.';
        };
      }>;
    imageUrls: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Array of additional listing photo URLs (max 6 total including imageUrl).';
        };
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::market-listing.market-listing'
    > &
      Schema.Attribute.Private;
    negotiable: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    plastic: Schema.Attribute.String;
    priceUsd: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    seller: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    shipping: Schema.Attribute.Enumeration<
      [
        'ships-us-only',
        'ships-international',
        'local-pickup',
        'ships-and-pickup',
      ]
    > &
      Schema.Attribute.DefaultTo<'ships-us-only'>;
    shippingPriceUsd: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    status: Schema.Attribute.Enumeration<['active', 'sold', 'cancelled']> &
      Schema.Attribute.DefaultTo<'active'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    weightGrams: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 250;
          min: 100;
        },
        number
      >;
  };
}

export interface ApiMarketMessageMarketMessage
  extends Struct.CollectionTypeSchema {
  collectionName: 'market_messages';
  info: {
    description: 'A message on a marketplace listing thread between buyer and seller.';
    displayName: 'Market Message';
    pluralName: 'market-messages';
    singularName: 'market-message';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    listing: Schema.Attribute.Relation<
      'manyToOne',
      'api::market-listing.market-listing'
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::market-message.market-message'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    readAt: Schema.Attribute.DateTime;
    recipient: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    sender: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMarketOfferMarketOffer extends Struct.CollectionTypeSchema {
  collectionName: 'market_offers';
  info: {
    description: "A buyer's offer on a marketplace listing.";
    displayName: 'Market Offer';
    pluralName: 'market-offers';
    singularName: 'market-offer';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    buyer: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    counterPriceUsd: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    listing: Schema.Attribute.Relation<
      'manyToOne',
      'api::market-listing.market-listing'
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::market-offer.market-offer'
    > &
      Schema.Attribute.Private;
    note: Schema.Attribute.Text;
    priceUsd: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    sellerNote: Schema.Attribute.Text;
    status: Schema.Attribute.Enumeration<
      ['pending', 'accepted', 'declined', 'countered', 'withdrawn']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlasticTypePlasticType extends Struct.CollectionTypeSchema {
  collectionName: 'plastic_types';
  info: {
    displayName: 'Plastic Type';
    pluralName: 'plastic-types';
    singularName: 'plastic-type';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    brand: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    durability: Schema.Attribute.String;
    externalId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    grip: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::plastic-type.plastic-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    plasticFamily: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.String;
    stiffness: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiProfileProfile extends Struct.CollectionTypeSchema {
  collectionName: 'profiles';
  info: {
    displayName: 'Profile';
    pluralName: 'profiles';
    singularName: 'profile';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acceptsCashOnPickup: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: "If true, listing detail pages show 'Cash accepted on local pickup'.";
        };
      }> &
      Schema.Attribute.DefaultTo<false>;
    avatarUrl: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Public avatar image URL (uploaded via /api/upload or pasted).';
        };
      }>;
    bio: Schema.Attribute.Text;
    btcAddress: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional Bitcoin address (Legacy, SegWit, or Taproot).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    city: Schema.Attribute.String;
    country: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    cryptoNotes: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: "Free-form note shown next to crypto addresses (e.g. 'USDC on Polygon only', 'ETH mainnet').";
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 280;
      }>;
    displayName: Schema.Attribute.String;
    dotAddress: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional Polkadot (DOT) wallet address (SS58).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    ethAddress: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional EVM (ERC-20) wallet address (0x\u2026). Buyers send the right token themselves; double-check network.';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    ksmAddress: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional Kusama (KSM) wallet address (SS58).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::profile.profile'
    > &
      Schema.Attribute.Private;
    paypalHandle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Public PayPal email or paypal.me/{handle}. Used to render Pay-with-PayPal links on listings.';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    pdgaNumber: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional PDGA player number \u2014 links to pdga.com for extra credibility (self-reported).';
        };
      }> &
      Schema.Attribute.SetMinMax<
        {
          max: 9999999;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    socialFacebook: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Facebook profile URL (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    socialInstagram: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Instagram URL or @handle (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 220;
      }>;
    socialLine: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'LINE profile or add-friend URL (line.me/\u2026), or paste the ID segment after ~/ (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    socialTiktok: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'TikTok URL or handle (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 220;
      }>;
    socialTwitter: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'X/Twitter URL or @handle (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 220;
      }>;
    socialUdisc: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'UDisc or other disc-golf profile URL (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    socialYoutube: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'YouTube channel URL or @handle (shown on public profile).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    solAddress: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional Solana wallet address (base58).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    state: Schema.Attribute.String;
    stripePaymentLinkUrl: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Optional Stripe Payment Link URL (created by the seller in their own Stripe dashboard).';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    venmoHandle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        'content-manager': {
          description: 'Public Venmo username (without leading @). Used to render Pay-with-Venmo links on listings.';
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::course-rating-vote.course-rating-vote': ApiCourseRatingVoteCourseRatingVote;
      'api::course-rating.course-rating': ApiCourseRatingCourseRating;
      'api::course-submission.course-submission': ApiCourseSubmissionCourseSubmission;
      'api::course.course': ApiCourseCourse;
      'api::disc-mold.disc-mold': ApiDiscMoldDiscMold;
      'api::disc-rating-vote.disc-rating-vote': ApiDiscRatingVoteDiscRatingVote;
      'api::disc-rating.disc-rating': ApiDiscRatingDiscRating;
      'api::disc-submission.disc-submission': ApiDiscSubmissionDiscSubmission;
      'api::disc-variant.disc-variant': ApiDiscVariantDiscVariant;
      'api::disc.disc': ApiDiscDisc;
      'api::market-favorite.market-favorite': ApiMarketFavoriteMarketFavorite;
      'api::market-listing.market-listing': ApiMarketListingMarketListing;
      'api::market-message.market-message': ApiMarketMessageMarketMessage;
      'api::market-offer.market-offer': ApiMarketOfferMarketOffer;
      'api::plastic-type.plastic-type': ApiPlasticTypePlasticType;
      'api::profile.profile': ApiProfileProfile;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
