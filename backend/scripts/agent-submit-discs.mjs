#!/usr/bin/env node
/**
 * Batch disc submissions for a bot/agent user (same flow as the website: pending → moderator approve).
 *
 * Prerequisites:
 *   - Dedicated Strapi user (confirmed email) with password
 *   - STRAPI_API_TOKEN / STRAPI_SUBMISSIONS_TOKEN on the Next server (already required for submissions)
 *   - Jobs file: JSON array of objects with at least `discName` (see Next /api/disc-submissions)
 *
 * Usage:
 *   MAHOOT_APP_URL=https://app.example.com \
 *   STRAPI_URL=https://api.example.com \
 *   AGENT_IDENTIFIER=agent@example.com \
 *   AGENT_PASSWORD='secret' \
 *   node scripts/agent-submit-discs.mjs ./jobs.json
 */

import fs from "node:fs";

const appUrl = (process.env.MAHOOT_APP_URL ?? "").replace(/\/$/, "");
const strapiUrl = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "").replace(/\/$/, "");
const identifier = process.env.AGENT_IDENTIFIER ?? "";
const password = process.env.AGENT_PASSWORD ?? "";
const jobsPath = process.argv[2];

if (!appUrl || !strapiUrl || !identifier || !password || !jobsPath) {
  console.error(
    "Usage: MAHOOT_APP_URL=… STRAPI_URL=… AGENT_IDENTIFIER=… AGENT_PASSWORD=… node scripts/agent-submit-discs.mjs <jobs.json>",
  );
  process.exit(1);
}

const readJobs = () => {
  const raw = fs.readFileSync(jobsPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("jobs file must be a JSON array");
  return data;
};

const login = async () => {
  const res = await fetch(`${strapiUrl}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strapi login failed ${res.status}: ${t.slice(0, 200)}`);
  }
  const body = await res.json();
  if (!body.jwt) throw new Error("Strapi login: no jwt in response");
  return body.jwt;
};

const submitOne = async (jwt, job) => {
  const res = await fetch(`${appUrl}/api/disc-submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(job),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
};

const main = async () => {
  const jobs = readJobs();
  const jwt = await login();
  console.error(`Logged in as ${identifier}; submitting ${jobs.length} job(s)…`);
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    try {
      const out = await submitOne(jwt, job);
      console.log(JSON.stringify({ ok: true, index: i, discName: job.discName, id: out.submission?.documentId }));
    } catch (e) {
      console.log(
        JSON.stringify({
          ok: false,
          index: i,
          discName: job?.discName,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }
};

await main();
