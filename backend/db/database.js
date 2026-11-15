const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'iron_store.db');
const db = new Database(dbPath, {
  // verbose: console.log
});

// Enable WAL mode for high performance concurrent reads and atomic writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
