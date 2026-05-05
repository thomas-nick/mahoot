/**
 * PM2 config for production on a single VPS.
 * Usage (from repo root): pm2 start deploy/ecosystem.config.cjs
 *
 * Adjust cwd if you deploy somewhere other than /opt/mahoot.
 */
const root = process.env.MAHOOT_ROOT || "/opt/mahoot";

module.exports = {
  apps: [
    {
      name: "strapi",
      cwd: `${root}/backend`,
      script: "node_modules/@strapi/strapi/bin/strapi.js",
      args: "start",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "3G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "next",
      cwd: `${root}/frontend`,
      script: "npm",
      args: "run start -- -p 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "3G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
