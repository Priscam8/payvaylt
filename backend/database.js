require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { newDb } = require('pg-mem');

const migrationsDir = path.join(__dirname, 'migrations');
const connectionString = process.env.PAYVAYLT_DATABASE_URL || process.env.DATABASE_URL || '';

let pool;
let databaseInfo;
let initialized = false;

function describeTarget(value) {
  if (!value) {
    return 'in-memory postgres';
  }

  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return 'configured postgres';
  }
}

function createPool() {
  if (connectionString) {
    databaseInfo = {
      mode: 'postgres',
      target: describeTarget(connectionString),
    };

    return new Pool({
      connectionString,
      max: Number(process.env.PAYVAYLT_DATABASE_POOL_MAX || 10),
      ssl: process.env.PAYVAYLT_DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
    });
  }

  const db = newDb({
    autoCreateForeignKeyIndices: true,
    // pg-mem supports our migration DDL, but its AST coverage checker flags some
    // standard Postgres constructs like default NOW() and constraint metadata.
    noAstCoverageCheck: true,
  });
  const adapter = db.adapters.createPg();

  databaseInfo = {
    mode: 'pg-mem',
    target: 'in-memory postgres',
  };

  return new adapter.Pool();
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

async function query(text, params = [], client) {
  if (client) {
    return client.query(text, params);
  }

  return getPool().query(text, params);
}

async function withClient(work) {
  const client = await getPool().connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

async function withTransaction(work) {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS backend_migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runMigrations() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  await withTransaction(async (client) => {
    await ensureMigrationsTable(client);

    const { rows } = await client.query('SELECT name FROM backend_migrations');
    const applied = new Set(rows.map((row) => row.name));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO backend_migrations (name) VALUES ($1)', [file]);
    }
  });
}

async function initializeDatabase() {
  if (initialized) {
    return databaseInfo;
  }

  await runMigrations();
  initialized = true;
  return databaseInfo;
}

function getDatabaseInfo() {
  if (!databaseInfo) {
    getPool();
  }

  return databaseInfo;
}

module.exports = {
  getDatabaseInfo,
  initializeDatabase,
  query,
  withClient,
  withTransaction,
};
