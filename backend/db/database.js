const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('node:async_hooks');

const dbDir = path.join(__dirname, '../../data');
const tenantsDir = path.join(dbDir, 'tenants');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(tenantsDir)) {
  fs.mkdirSync(tenantsDir, { recursive: true });
}

// AsyncLocalStorage tracks the active tenant database per asynchronous execution context (per HTTP request)
const tenantStorage = new AsyncLocalStorage();

// Cache of open SQLite database connections keyed by tenant ID or file path
const tenantDbCache = new Map();

/**
 * Creates a standardized SQLite database wrapper interface around node:sqlite (native) or better-sqlite3.
 * Supports .exec(), .prepare() (with .run(), .get(), .all()), .pragma(), and .transaction().
 */
function createDbWrapper(filePath) {
  // Strategy 1: Node.js built-in node:sqlite (zero external C++ binaries, zero segfaults)
  try {
    const sqlite = require('node:sqlite');
    if (sqlite && sqlite.DatabaseSync) {
      const raw = new sqlite.DatabaseSync(filePath);
      try { raw.exec('PRAGMA foreign_keys = ON;'); } catch (e) {}
      try { raw.exec('PRAGMA journal_mode = WAL;'); } catch (e) {}

      return {
        raw,
        filePath,
        exec: (sql) => raw.exec(sql),
        pragma: (sql) => {
          try { return raw.exec(`PRAGMA ${sql};`); } catch (e) { return null; }
        },
        prepare: (sql) => {
          const stmt = raw.prepare(sql);
          return {
            run: (...params) => {
              const res = stmt.run(...params);
              return {
                changes: Number(res?.changes || 0),
                lastInsertRowid: Number(res?.lastInsertRowid || 0)
              };
            },
            get: (...params) => stmt.get(...params),
            all: (...params) => stmt.all(...params)
          };
        },
        transaction: (fn) => {
          return (...args) => {
            raw.exec('BEGIN IMMEDIATE');
            try {
              const result = fn(...args);
              raw.exec('COMMIT');
              return result;
            } catch (err) {
              try { raw.exec('ROLLBACK'); } catch (rErr) {}
              throw err;
            }
          };
        },
        close: () => raw.close()
      };
    }
  } catch (e) {
    console.log('node:sqlite note:', e.message);
  }

  // Strategy 2: Fallback to better-sqlite3 if node:sqlite is not available
  const Database = require('better-sqlite3');
  let rawDb;
  try {
    rawDb = new Database(filePath);
  } catch (err) {
    console.error(`Failed to open SQLite database at ${filePath}, re-creating:`, err.message);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(filePath + '-wal')) fs.unlinkSync(filePath + '-wal');
      if (fs.existsSync(filePath + '-shm')) fs.unlinkSync(filePath + '-shm');
    } catch (uErr) {}
    rawDb = new Database(filePath);
  }

  try {
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');
  } catch (pErr) {}

  return rawDb;
}

// Initialize primary default database (data/iron_store.db)
const defaultDbPath = path.join(dbDir, 'iron_store.db');
const defaultDb = createDbWrapper(defaultDbPath);
tenantDbCache.set('default', defaultDb);
tenantDbCache.set('tenant-jagdamba-iron', defaultDb);

/**
 * Returns the isolated SQLite database connection for a specific tenant.
 * If the tenant database file doesn't exist yet, provisions the database file,
 * initializes the schema, and seeds default store records.
 */
function getTenantDb(tenantId) {
  if (!tenantId || tenantId === 'default' || tenantId === 'tenant-jagdamba-iron') {
    return defaultDb;
  }

  // Sanitize tenantId to prevent directory traversal
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanId) return defaultDb;

  if (tenantDbCache.has(cleanId)) {
    return tenantDbCache.get(cleanId);
  }

  const tenantDbPath = path.join(tenantsDir, `${cleanId}.db`);
  const isNew = !fs.existsSync(tenantDbPath);
  const tenantDb = createDbWrapper(tenantDbPath);
  tenantDbCache.set(cleanId, tenantDb);

  if (isNew) {
    console.log(`✨ Provisioning new isolated SQLite database for tenant [${cleanId}] at: ${tenantDbPath}`);
    try {
      const { initSchema } = require('./schema');
      initSchema(tenantDb);
    } catch (err) {
      console.error(`Failed to initialize schema for tenant [${cleanId}]:`, err);
    }
  }

  return tenantDb;
}

/**
 * Dynamic Proxy that delegates all database queries to the active tenant's database
 * in AsyncLocalStorage (or falls back to the default database when outside a request context).
 * This ensures 100% data isolation across tenants without rewriting SQL in route handlers.
 */
const dynamicDb = {
  exec: (...args) => {
    const active = tenantStorage.getStore()?.db || defaultDb;
    return active.exec(...args);
  },
  pragma: (...args) => {
    const active = tenantStorage.getStore()?.db || defaultDb;
    return active.pragma(...args);
  },
  prepare: (...args) => {
    const active = tenantStorage.getStore()?.db || defaultDb;
    return active.prepare(...args);
  },
  transaction: (fn) => {
    return (...args) => {
      const active = tenantStorage.getStore()?.db || defaultDb;
      return active.transaction(fn)(...args);
    };
  },
  close: (...args) => {
    const active = tenantStorage.getStore()?.db || defaultDb;
    return active.close(...args);
  },
  getTenantDb,
  createDbWrapper,
  tenantStorage,
  defaultDb,
  tenantDbCache,
  tenantsDir
};

module.exports = dynamicDb;
