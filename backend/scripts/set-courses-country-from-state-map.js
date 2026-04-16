const path = require('node:path');
const Database = require('better-sqlite3');

const DATABASE_CLIENT = (process.env.DATABASE_CLIENT || 'sqlite').toLowerCase();
const DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/data.db';
const FORCE = process.argv.includes('--force');

const STATE_TO_COUNTRY = {
  Alabama: 'USA',
  Alaska: 'USA',
  Arizona: 'USA',
  Arkansas: 'USA',
  California: 'USA',
  Colorado: 'USA',
  Connecticut: 'USA',
  Delaware: 'USA',
  Florida: 'USA',
  Georgia: 'USA',
  Hawaii: 'USA',
  Idaho: 'USA',
  Illinois: 'USA',
  Indiana: 'USA',
  Iowa: 'USA',
  Kansas: 'USA',
  Kentucky: 'USA',
  Louisiana: 'USA',
  Maine: 'USA',
  Maryland: 'USA',
  Massachusetts: 'USA',
  Michigan: 'USA',
  Minnesota: 'USA',
  Mississippi: 'USA',
  Missouri: 'USA',
  Montana: 'USA',
  Nebraska: 'USA',
  Nevada: 'USA',
  'New Hampshire': 'USA',
  'New Jersey': 'USA',
  'New Mexico': 'USA',
  'New York': 'USA',
  'North Carolina': 'USA',
  'North Dakota': 'USA',
  Ohio: 'USA',
  Oklahoma: 'USA',
  Oregon: 'USA',
  Pennsylvania: 'USA',
  'Rhode Island': 'USA',
  'South Carolina': 'USA',
  'South Dakota': 'USA',
  Tennessee: 'USA',
  Texas: 'USA',
  Utah: 'USA',
  Vermont: 'USA',
  Virginia: 'USA',
  Washington: 'USA',
  'West Virginia': 'USA',
  Wisconsin: 'USA',
  Wyoming: 'USA',
  'District of Columbia': 'USA',
};

const run = async () => {
  if (DATABASE_CLIENT !== 'sqlite') {
    throw new Error(
      `This script currently supports sqlite only. DATABASE_CLIENT is "${DATABASE_CLIENT}".`
    );
  }

  const dbPath = path.join(__dirname, '..', DATABASE_FILENAME);
  const db = new Database(dbPath);

  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='courses'")
    .get();
  if (!tableExists) {
    db.close();
    throw new Error(`Could not find "courses" table in ${dbPath}`);
  }

  const courses = db.prepare('SELECT id, state, country FROM courses').all();
  let mapped = 0;
  let skippedNoState = 0;
  let skippedNoMap = 0;
  let skippedCountrySet = 0;

  const updateStmt = db.prepare('UPDATE courses SET country = ? WHERE id = ?');
  const updateMany = db.transaction((rows) => {
    for (const row of rows) {
      updateStmt.run(row.country, row.id);
    }
  });

  const updates = [];
  for (const course of courses) {
    const state = typeof course.state === 'string' ? course.state.trim() : '';
    const currentCountry = typeof course.country === 'string' ? course.country.trim() : '';
    if (!state) {
      skippedNoState += 1;
      continue;
    }
    const mappedCountry = STATE_TO_COUNTRY[state];
    if (!mappedCountry) {
      skippedNoMap += 1;
      continue;
    }
    if (!FORCE && currentCountry) {
      skippedCountrySet += 1;
      continue;
    }
    if (currentCountry === mappedCountry) {
      skippedCountrySet += 1;
      continue;
    }
    updates.push({ id: course.id, country: mappedCountry });
  }

  updateMany(updates);
  mapped = updates.length;
  db.close();

  console.log(
    [
      `State-country mapping complete.`,
      `Scanned: ${courses.length}`,
      `Updated: ${mapped}`,
      `Skipped (no state): ${skippedNoState}`,
      `Skipped (no map): ${skippedNoMap}`,
      `Skipped (country already set): ${skippedCountrySet}`,
      FORCE ? 'Mode: force (country can be overwritten)' : 'Mode: safe (only empty/changed)',
    ].join(' ')
  );
};

run().catch((error) => {
  console.error('State-country mapping failed:', error);
  process.exit(1);
});
