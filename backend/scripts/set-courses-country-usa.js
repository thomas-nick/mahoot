const path = require('node:path');
const Database = require('better-sqlite3');
const TARGET_COUNTRY = 'USA';
const DATABASE_CLIENT = (process.env.DATABASE_CLIENT || 'sqlite').toLowerCase();
const DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/data.db';

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

  const { total } = db.prepare('SELECT COUNT(*) as total FROM courses').get();
  const info = db
    .prepare('UPDATE courses SET country = ? WHERE country IS NULL OR TRIM(country) <> ?')
    .run(TARGET_COUNTRY, TARGET_COUNTRY);
  const updated = Number(info.changes || 0);
  const unchanged = Math.max(0, Number(total || 0) - updated);
  db.close();

  console.log(
    `Country backfill complete. Scanned: ${total}, Updated: ${updated}, Already USA: ${unchanged}`
  );
};

run().catch((error) => {
  console.error('Country backfill failed:', error);
  process.exit(1);
});
