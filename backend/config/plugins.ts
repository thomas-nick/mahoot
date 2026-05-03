import type { Core } from '@strapi/strapi';

/**
 * Documented baseline for plugin configuration.
 *
 * Each block has comments showing which env vars to set. Anything not present
 * here uses Strapi's default (local file upload, sendmail, default JWT lifetime).
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  /**
   * users-permissions handles end-user auth (local + Google).
   *
   * - JWT_SECRET: required in production. Long random string. Rotating it
   *   invalidates every existing user JWT.
   * - JWT_EXPIRES_IN: e.g. "30d" (default) or "12h" for higher-security setups.
   * - register.allowedFields: extra fields the public can pass to
   *   /api/auth/local/register. Keep tight to avoid privilege escalation.
   *
   * Email confirmation + Google provider are still configured in the
   * Strapi admin UI (Settings → Users & Permissions → Providers / Email
   * templates). This file only sets the bits that need to be code-controlled.
   */
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: env('JWT_EXPIRES_IN', '30d'),
      },
      jwtSecret: env('JWT_SECRET'),
      register: {
        allowedFields: ['username', 'email'],
      },
    },
  },

  /**
   * upload defaults to writing files into backend/public/uploads on the local
   * disk. That works for development. In production, set UPLOAD_PROVIDER=aws-s3
   * (or cloudinary, etc.) along with the matching credentials, and install
   * `@strapi/provider-upload-aws-s3`.
   *
   * The size limit must match (or exceed) the limit enforced by the Next.js
   * /api/upload proxy (currently 8 MB).
   */
  upload: {
    config: {
      sizeLimit: env.int('UPLOAD_MAX_BYTES', 8 * 1024 * 1024), // 8 MB
      // To switch to S3 in production, uncomment + set the env vars:
      // provider: 'aws-s3',
      // providerOptions: {
      //   accessKeyId: env('AWS_ACCESS_KEY_ID'),
      //   secretAccessKey: env('AWS_ACCESS_SECRET'),
      //   region: env('AWS_REGION'),
      //   params: { Bucket: env('AWS_BUCKET') },
      // },
    },
  },

  /**
   * email is required so verification, password reset, and "resend
   * confirmation" actually leave Strapi. Default is sendmail (most macOS dev
   * boxes will silently fail).
   *
   * For local dev, easiest is the SMTP provider with a free service like
   * Mailtrap. For production, use Resend / Postmark / SES.
   *
   * Install: npm i @strapi/provider-email-nodemailer
   * Then uncomment below and set EMAIL_* env vars.
   */
  // email: {
  //   config: {
  //     provider: 'nodemailer',
  //     providerOptions: {
  //       host: env('EMAIL_HOST'),
  //       port: env.int('EMAIL_PORT', 587),
  //       auth: {
  //         user: env('EMAIL_USERNAME'),
  //         pass: env('EMAIL_PASSWORD'),
  //       },
  //     },
  //     settings: {
  //       defaultFrom: env('EMAIL_FROM', 'no-reply@example.com'),
  //       defaultReplyTo: env('EMAIL_REPLY_TO', 'support@example.com'),
  //     },
  //   },
  // },
});

export default config;
