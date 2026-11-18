const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'iron_store.db');

let db;
let useBuiltin = false;

// Strategy 1: Use Node.js built-in node:sqlite (zero external C++ binaries, zero segfaults)
try {
  const sqlite = require('node:sqlite');
  if (sqlite && sqlite.DatabaseSync) {
    const raw = new sqlite.DatabaseSync(dbPath);
    try { raw.exec('PRAGMA foreign_keys = ON;'); } catch (e) {}

    db = {
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
              changes: Number(res.changes || 0),
              lastInsertRowid: Number(res.lastInsertRowid || 0)
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
    useBuiltin = true;
    console.log('✓ Using Node native SQLite engine (node:sqlite) - zero C++ binary segfault risk');
  }
} catch (e) {
  console.log('node:sqlite note:', e.message);
}

// Strategy 2: Fallback to better-sqlite3 if node:sqlite is not available
if (!useBuiltin) {
  console.log('Falling back to better-sqlite3...');
  const Database = require('better-sqlite3');
  try {
    db = new Database(dbPath);
  } catch (err) {
    console.error('Failed to open database file, re-creating fresh database:', err.message);
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
    } catch (uErr) {}
    db = new Database(dbPath);
  }

  try {
    db.pragma('journal_mode = DELETE');
    db.pragma('foreign_keys = ON');
  } catch (pErr) {
    console.warn('SQLite pragma warning:', pErr.message);
  }
}

module.exports = db;
