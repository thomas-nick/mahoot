'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('csv-parse/sync');

const { normalizeName, slugify } = require('./match');

const HOLE_COLUMN_RE = /^Hole(\d{1,2})$/;
const PAR_ROW_PLAYER = 'par';

/**
 * Read a UDisc Scorecards CSV from any path.
 * Caller passes an absolute path or one relative to cwd.
 */
const readUdiscCsv = async (csvPath) => {
  const absolute = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  const raw = await fs.readFile(absolute, 'utf8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
};

const holeNumbersFromRow = (row) => {
  const nums = [];
  for (const key of Object.keys(row)) {
    const m = HOLE_COLUMN_RE.exec(key);
    if (m) nums.push(Number(m[1]));
  }
  return nums.sort((a, b) => a - b);
};

const intOrNull = (v) => {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/**
 * Group UDisc rows into (course, layout) buckets and pull the Par row's pars.
 * Returns: Map<key, {
 *   key, courseName, layoutName, normalizedCourse,
 *   externalSuffix,        // slugified layout name
 *   pars: { number, par }[],
 *   holeCount, parTotal,
 *   playerRows: row[]      // every non-Par row in this layout (rounds)
 * }>
 */
const groupLayouts = (rows) => {
  const groups = new Map();

  for (const row of rows) {
    const courseName = String(row.CourseName ?? '').trim();
    const layoutName = String(row.LayoutName ?? '').trim();
    if (!courseName || !layoutName) continue;

    const key = `${normalizeName(courseName)}__${normalizeName(layoutName)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        courseName,
        layoutName,
        normalizedCourse: normalizeName(courseName),
        externalSuffix: slugify(layoutName),
        pars: [],
        holeCount: 0,
        parTotal: 0,
        playerRows: [],
      };
      groups.set(key, group);
    }

    const playerName = String(row.PlayerName ?? '').trim().toLowerCase();
    if (playerName === PAR_ROW_PLAYER && group.pars.length === 0) {
      const holeNums = holeNumbersFromRow(row);
      for (const n of holeNums) {
        const par = intOrNull(row[`Hole${n}`]);
        if (par !== null) group.pars.push({ number: n, par });
      }
      group.pars.sort((a, b) => a.number - b.number);
      group.holeCount = group.pars.length;
      group.parTotal = group.pars.reduce((s, h) => s + h.par, 0);
    } else if (playerName !== PAR_ROW_PLAYER) {
      group.playerRows.push(row);
    }
  }

  return groups;
};

module.exports = { readUdiscCsv, groupLayouts };
