const fs = require('fs');
const path = require('path');

const { createSeedDatabase, resolveDataFile } = require('./domain');
const { normalizePosDatabaseState } = require('./pos-domain');

const dataFile = resolveDataFile(process.env.PAYVAYLT_DATA_FILE);

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeDatabase(database) {
  ensureDirectory(dataFile);
  fs.writeFileSync(dataFile, JSON.stringify(database, null, 2));
}

function readDatabase() {
  try {
    if (fs.existsSync(dataFile)) {
      const contents = fs.readFileSync(dataFile, 'utf8');
      const database = JSON.parse(contents);
      const normalized = {
        ...database,
        pos: normalizePosDatabaseState(database.pos),
      };

      if (!database.pos) {
        writeDatabase(normalized);
      }

      return normalized;
    }
  } catch (error) {
    console.warn('[payvaylt-backend] Could not read persisted database, reseeding demo data.', error);
  }

  const seeded = {
    ...createSeedDatabase(),
    pos: normalizePosDatabaseState(),
  };
  writeDatabase(seeded);
  return seeded;
}

const database = readDatabase();

function getDatabase() {
  return database;
}

function persistDatabase() {
  database.generatedAt = new Date().toISOString();
  writeDatabase(database);
}

function mutateDatabase(mutator) {
  const result = mutator(database);
  persistDatabase();
  return result;
}

module.exports = {
  dataFile,
  getDatabase,
  mutateDatabase,
  persistDatabase,
};
