const express = require('express');
const router = express.Router();
const db = require('../db/database');
const fs = require('fs');
const path = require('path');

// GET all key-value settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update settings
router.put('/', (req, res) => {
  try {
    const updates = req.body;

    if (updates.phone) {
      const cleanPhone = String(updates.phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'Store phone number must contain numbers only and be exactly 10 digits.' });
      }
      updates.phone = cleanPhone;
    }
    if (updates.pan_number) {
      const cleanPan = String(updates.pan_number).replace(/\D/g, '');
      if (cleanPan.length !== 9) {
        return res.status(400).json({ success: false, error: 'Nepal PAN number must contain numbers only and be exactly 9 digits.' });
      }
      updates.pan_number = cleanPan;
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        stmt.run(key, String(value));
      }
    })();

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET fiscal years
router.get('/fiscal-years', (req, res) => {
  try {
    const fys = db.prepare('SELECT * FROM fiscal_years ORDER BY id DESC').all();
    res.json({ success: true, data: fys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST activate a fiscal year
router.post('/fiscal-years/activate', (req, res) => {
  try {
    const { fiscalYearName } = req.body;
    db.transaction(() => {
      db.prepare('UPDATE fiscal_years SET is_active = 0').run();
      db.prepare('UPDATE fiscal_years SET is_active = 1 WHERE name = ?').run(fiscalYearName);
      db.prepare("UPDATE settings SET value = ? WHERE key = 'active_fiscal_year'").run(fiscalYearName);
    })();
    res.json({ success: true, message: `Active fiscal year changed to ${fiscalYearName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, full_name, role, phone, active, created_at FROM users ORDER BY id ASC').all();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create user
router.post('/users', (req, res) => {
  try {
    const { username, password, full_name, role, phone } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, error: 'Username, password and role are required' });
    }

    let cleanPhone = null;
    if (phone) {
      cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'User phone number must contain numbers only and be exactly 10 digits.' });
      }
    }

    const insert = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, phone, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const result = insert.run(username, password, full_name, role, cleanPhone);
    res.json({ success: true, userId: result.lastInsertRowid, message: 'User created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET complete database backup export (JSON format & file trigger)
router.get('/backup', (req, res) => {
  try {
    const tables = [
      'settings', 'fiscal_years', 'users', 'stock_locations', 'products',
      'remnants', 'stock_ledger', 'suppliers', 'customers', 'purchases',
      'purchase_lines', 'sales', 'sale_lines', 'payments', 'returns',
      'cash_register_sessions', 'cash_transactions'
    ];

    const backupData = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      database: {}
    };

    for (const table of tables) {
      backupData.database[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="iron_store_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
