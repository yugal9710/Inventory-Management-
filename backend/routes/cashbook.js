const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// GET current active cash register session
router.get('/current-session', (req, res) => {
  try {
    const session = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM cash_register_sessions s
      JOIN users u ON s.cashier_id = u.id
      WHERE s.status = 'OPEN'
      ORDER BY s.id DESC LIMIT 1
    `).get();

    if (!session) {
      return res.json({ success: true, data: null, message: 'No active cash register session' });
    }

    // Calculate current expected cash in drawer dynamically
    const expected = session.opening_cash + session.cash_sales + session.cash_receipts - session.cash_expenses - session.cash_supplier_payments;

    res.json({
      success: true,
      data: {
        ...session,
        current_expected_cash: Number(expected.toFixed(2))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST open a new cash drawer session
router.post('/open-session', (req, res) => {
  try {
    const { openingCash = 0, cashierId = 1, notes } = req.body;
    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    // Check if open session already exists
    const existing = db.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN'").get();
    if (existing) {
      return res.status(400).json({ success: false, error: 'A cash session is already open. Please close it first.' });
    }

    const insert = db.prepare(`
      INSERT INTO cash_register_sessions (
        cashier_id, date_ad, date_bs, opening_cash, cash_sales,
        cash_receipts, cash_expenses, cash_supplier_payments, status, notes
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 'OPEN', ?)
    `);

    const result = insert.run(cashierId, adDateStr, todayBs, Number(openingCash || 0), notes || 'Morning drawer opening');
    res.json({ success: true, sessionId: result.lastInsertRowid, message: 'Cash register opened successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST close cash drawer session with physical cash count
router.post('/close-session', (req, res) => {
  try {
    const { sessionId, actualClosingCash, notes } = req.body;
    const session = db.prepare('SELECT * FROM cash_register_sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const expected = session.opening_cash + session.cash_sales + session.cash_receipts - session.cash_expenses - session.cash_supplier_payments;
    const actual = Number(actualClosingCash);
    const diff = Number((actual - expected).toFixed(2));

    db.prepare(`
      UPDATE cash_register_sessions SET
        status = 'CLOSED',
        closing_time = CURRENT_TIMESTAMP,
        expected_closing_cash = ?,
        actual_closing_cash = ?,
        cash_difference = ?,
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(expected, actual, diff, notes || null, sessionId);

    res.json({
      success: true,
      data: {
        expected,
        actual,
        difference: diff,
        isBalanced: diff === 0
      },
      message: 'Cash register closed and reconciled successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET cash transactions / daily expenses
router.get('/transactions', (req, res) => {
  try {
    const { fromDateBs, toDateBs, category } = req.query;
    let sql = `
      SELECT t.*, u.full_name as created_by_name
      FROM cash_transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (fromDateBs) {
      sql += ' AND t.date_bs >= ?';
      params.push(fromDateBs);
    }
    if (toDateBs) {
      sql += ' AND t.date_bs <= ?';
      params.push(toDateBs);
    }
    if (category) {
      sql += ' AND t.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY t.id DESC';

    const transactions = db.prepare(sql).all(...params);
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add petty cash expense or deposit
router.post('/transactions', (req, res) => {
  try {
    const { type = 'EXPENSE', category, amount, description, payee, userId = 1 } = req.body;
    if (!amount || !category) {
      return res.status(400).json({ success: false, error: 'Amount and category are required' });
    }

    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);
    const numAmt = Number(amount);

    db.transaction(() => {
      // Find open cash session
      const activeSession = db.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
      const sessionId = activeSession ? activeSession.id : null;

      db.prepare(`
        INSERT INTO cash_transactions (
          session_id, type, category, amount, description, payee,
          date_ad, date_bs, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sessionId, type, category, numAmt, description || null, payee || null, adDateStr, todayBs, userId);

      // If active session exists, update its cash_expenses or cash_receipts
      if (sessionId) {
        if (type === 'EXPENSE' || type === 'PETTY_CASH') {
          db.prepare('UPDATE cash_register_sessions SET cash_expenses = cash_expenses + ? WHERE id = ?')
            .run(numAmt, sessionId);
        } else if (type === 'DEPOSIT') {
          db.prepare('UPDATE cash_register_sessions SET cash_receipts = cash_receipts + ? WHERE id = ?')
            .run(numAmt, sessionId);
        }
      }
    })();

    res.json({ success: true, message: 'Cash transaction recorded' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
