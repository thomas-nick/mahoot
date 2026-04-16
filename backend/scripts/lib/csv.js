const fs = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('csv-parse/sync');

const readCsvRecords = async (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), '..', relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');

  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};

module.exports = { readCsvRecords };
