'use strict';

/**
 * Import CourseLayouts from a UDisc Scorecards CSV.
 *
 * Usage:
 *   npm run import:udisc-layouts -- --csv=/abs/path/to/UDisc\ Scorecards1.csv
 *   npm run import:udisc-layouts -- --csv=../UDisc\ Scorecards1.csv --dry-run
 *   npm run import:udisc-layouts -- --csv=... --non-interactive
 *
 * Flow per (CourseName, LayoutName) tuple in the CSV:
 *   1. Look up CourseAlias (source=udisc, normalizedName=...) — instant if seen before.
 *   2. Exact normalized name match against api::course.course — auto-accept (confidence 1.0).
 *   3. Top-5 fuzzy candidates → prompt user (interactive) or skip (non-interactive).
 *   4. Save the chosen mapping to CourseAlias, then upsert the CourseLayout
 *      keyed by externalId = `${course.externalId}__${slug(layoutName)}`.
 *
 * This script ONLY creates layouts — round/score import happens in a sibling script.
 */

const readline = require('node:readline');

const { loadStrapi, upsertByExternalId, upsertCourseAlias } = require('./lib/strapi-app');
const { readUdiscCsv, groupLayouts } = require('./lib/udisc');
const { normalizeName, suggestCourses } = require('./lib/match');

const COURSE_UID = 'api::course.course';
const LAYOUT_UID = 'api::course-layout.course-layout';
const ALIAS_UID = 'api::course-alias.course-alias';

const ARGS = parseArgs(process.argv.slice(2));

async function main() {
  if (!ARGS.csv) {
    console.error('Missing --csv=<path> argument. Pass an absolute path or one relative to backend/.');
    process.exit(2);
  }

  const interactive = !ARGS.nonInteractive && process.stdin.isTTY;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

  const strapi = await loadStrapi();
  const stats = { layouts: 0, created: 0, updated: 0, skippedNoMatch: 0, skippedNoPar: 0, aliasReuse: 0 };

  try {
    console.log(`Reading ${ARGS.csv}…`);
    const rows = await readUdiscCsv(ARGS.csv);
    const groups = groupLayouts(rows);
    stats.layouts = groups.size;
    console.log(`Found ${groups.size} unique (course, layout) tuples across ${rows.length} CSV rows.`);

    const allCourses = await loadCourseIndex(strapi);
    console.log(`Indexed ${allCourses.length} courses for matching.\n`);

    const aliasCache = new Map(); // normalizedCourse → { courseDocumentId, courseName }

    for (const group of groups.values()) {
      const label = `${group.courseName} · ${group.layoutName}`;

      if (group.pars.length === 0) {
        console.log(`SKIP  ${label}  (no Par row in CSV)`);
        stats.skippedNoPar += 1;
        continue;
      }

      const resolved = await resolveCourse({
        strapi,
        group,
        allCourses,
        aliasCache,
        rl,
        interactive,
        dryRun: ARGS.dryRun,
      });

      if (!resolved) {
        console.log(`SKIP  ${label}  (no match)`);
        stats.skippedNoMatch += 1;
        continue;
      }

      if (resolved.fromAliasCache) stats.aliasReuse += 1;

      const externalId = `${resolved.externalId}__${group.externalSuffix}`;
      const payload = {
        externalId,
        name: group.layoutName,
        course: resolved.documentId,
        holeCount: group.holeCount,
        parTotal: group.parTotal,
        holes: group.pars.map((h) => ({ number: h.number, par: h.par })),
        source: 'udisc',
      };

      if (ARGS.dryRun) {
        console.log(`DRY   ${label}  → ${externalId} (par ${group.parTotal} / ${group.holeCount} holes)`);
        continue;
      }

      const mode = await upsertByExternalId(strapi, LAYOUT_UID, payload);
      console.log(`${mode === 'created' ? 'NEW' : 'UPD'}   ${label}  → ${externalId} (par ${group.parTotal} / ${group.holeCount} holes)`);
      if (mode === 'created') stats.created += 1;
      else stats.updated += 1;
    }
  } finally {
    if (rl) rl.close();
    await strapi.destroy();
  }

  console.log('\nDone.');
  console.log(JSON.stringify(stats, null, 2));
}

/**
 * Pre-load every Course so fuzzy matching doesn't hit the DB per row.
 * Uses the lower-level db.query for raw rows — the Documents API hydrates too much
 * to hold 7k+ courses comfortably in memory.
 */
async function loadCourseIndex(strapi) {
  const limit = 1000;
  let offset = 0;
  const out = [];
  for (;;) {
    const batch = await strapi.db.query(COURSE_UID).findMany({
      select: ['documentId', 'externalId', 'name', 'city', 'state', 'publishedAt'],
      where: { publishedAt: { $notNull: true } },
      limit,
      offset,
      orderBy: { id: 'asc' },
    });
    if (!batch.length) break;
    for (const c of batch) {
      if (!c.externalId || !c.name) continue;
      out.push({
        documentId: c.documentId,
        externalId: c.externalId,
        name: c.name,
        city: c.city,
        state: c.state,
        normalizedName: normalizeName(c.name),
      });
    }
    if (batch.length < limit) break;
    offset += limit;
  }
  return out;
}

async function resolveCourse({ strapi, group, allCourses, aliasCache, rl, interactive, dryRun }) {
  const norm = group.normalizedCourse;

  // 1. process-local cache
  const cached = aliasCache.get(norm);
  if (cached) return { ...cached, fromAliasCache: true };

  // 2. persisted alias from a previous run
  const existingAlias = await strapi.documents(ALIAS_UID).findFirst({
    fields: ['documentId'],
    filters: { source: { $eq: 'udisc' }, normalizedName: { $eq: norm } },
    populate: { course: { fields: ['documentId', 'externalId', 'name'] } },
  });
  if (existingAlias?.course?.documentId) {
    const hit = {
      documentId: existingAlias.course.documentId,
      externalId: existingAlias.course.externalId,
      name: existingAlias.course.name,
    };
    aliasCache.set(norm, hit);
    return { ...hit, fromAliasCache: true };
  }

  // 3. exact normalized match
  const exact = allCourses.find((c) => c.normalizedName === norm);
  if (exact) {
    if (!dryRun) {
      await upsertCourseAlias(strapi, {
        source: 'udisc',
        externalName: group.courseName,
        normalizedName: norm,
        courseDocumentId: exact.documentId,
        confidence: 1,
      });
    }
    aliasCache.set(norm, exact);
    console.log(`AUTO  ${group.courseName}  → ${exact.name} (exact)`);
    return exact;
  }

  // 4. fuzzy suggest
  const top = suggestCourses(norm, allCourses, 5);
  if (!top.length || top[0].score < 0.4) {
    console.log(`MISS  ${group.courseName}  (best score ${top[0]?.score.toFixed(2) ?? 'n/a'})`);
    return null;
  }

  if (!interactive) {
    if (top[0].score >= 0.92) {
      const c = top[0].course;
      if (!dryRun) {
        await upsertCourseAlias(strapi, {
          source: 'udisc',
          externalName: group.courseName,
          normalizedName: norm,
          courseDocumentId: c.documentId,
          confidence: top[0].score,
        });
      }
      aliasCache.set(norm, c);
      console.log(`AUTO  ${group.courseName}  → ${c.name} (fuzzy ${top[0].score.toFixed(2)})`);
      return c;
    }
    console.log(`AMBIG ${group.courseName}  (top ${top[0].course.name} ${top[0].score.toFixed(2)}) — rerun interactive to resolve`);
    return null;
  }

  const pick = await promptPick(rl, group, top);
  if (!pick) return null;

  if (!dryRun) {
    await upsertCourseAlias(strapi, {
      source: 'udisc',
      externalName: group.courseName,
      normalizedName: norm,
      courseDocumentId: pick.documentId,
      confidence: pick.score ?? null,
    });
  }
  aliasCache.set(norm, pick);
  return pick;
}

function promptPick(rl, group, candidates) {
  return new Promise((resolve) => {
    console.log(`\n? ${group.courseName}  (UDisc layout: ${group.layoutName})`);
    candidates.forEach((c, i) => {
      const loc = [c.course.city, c.course.state].filter(Boolean).join(', ');
      console.log(`  ${i + 1}. ${c.course.name}  ${loc ? `· ${loc}  ` : ''}(${c.score.toFixed(2)})  [${c.course.externalId}]`);
    });
    console.log('  s. skip this layout       n. skip and never ask again (this run)');
    rl.question('> ', (answerRaw) => {
      const answer = String(answerRaw ?? '').trim().toLowerCase();
      if (answer === 's' || answer === '') return resolve(null);
      if (answer === 'n') return resolve(null);
      const idx = Number(answer);
      if (Number.isInteger(idx) && idx >= 1 && idx <= candidates.length) {
        const c = candidates[idx - 1];
        resolve({ ...c.course, score: c.score });
        return;
      }
      console.log('Invalid input; skipping.');
      resolve(null);
    });
  });
}

function parseArgs(argv) {
  const out = { csv: null, dryRun: false, nonInteractive: false };
  for (const a of argv) {
    if (a === '--dry-run' || a === '-n') out.dryRun = true;
    else if (a === '--non-interactive') out.nonInteractive = true;
    else if (a.startsWith('--csv=')) out.csv = a.slice('--csv='.length);
  }
  if (!out.csv && process.env.UDISC_CSV_PATH) out.csv = process.env.UDISC_CSV_PATH;
  return out;
}

main().catch((err) => {
  console.error('Layout import failed:', err);
  process.exit(1);
});
