const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'iron_store.db');

let db;
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

// Use standard DELETE journal mode to avoid POSIX shared memory (shm) crashes on cloud containers
try {
  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = ON');
} catch (pErr) {
  console.warn('SQLite pragma warning:', pErr.message);
}

module.exports = db;
