const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// GET all customers with running balance
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT 
        c.*,
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE customer_id = c.id AND status = 'ISSUED'), 0) as total_invoiced,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'CUSTOMER' AND party_id = c.id), 0) as total_paid
      FROM customers c
      WHERE c.active = 1
    `;
    const params = [];

    if (search) {
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.pan_vat LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY c.name ASC';

    const customers = db.prepare(sql).all(...params).map(c => {
      const balance = c.opening_balance + c.total_invoiced - c.total_paid;
      return {
        ...c,
        current_balance: Number(balance.toFixed(2)),
        is_overdue: c.credit_limit > 0 && balance > c.credit_limit,
        available_credit: Math.max(0, c.credit_limit - balance)
      };
    });

    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single customer detail with Khata statement
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    // Invoices
    const invoices = db.prepare(`
      SELECT id, invoice_no, invoice_type, date_bs, date_ad, total_amount, amount_paid, balance_due, payment_status
      FROM sales
      WHERE customer_id = ?
      ORDER BY id DESC
    `).all(customer.id);

    // Payments
    const payments = db.prepare(`
      SELECT p.*, u.full_name as received_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.party_type = 'CUSTOMER' AND p.party_id = ?
      ORDER BY p.id DESC
    `).all(customer.id);

    // Calculate running balance
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = customer.opening_balance + totalInvoiced - totalPaid;

    res.json({
      success: true,
      data: {
        ...customer,
        current_balance: Number(currentBalance.toFixed(2)),
        total_invoiced: Number(totalInvoiced.toFixed(2)),
        total_paid: Number(totalPaid.toFixed(2)),
        invoices,
        payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create customer
router.post('/', (req, res) => {
  try {
    const { name, phone, address, pan_vat, credit_limit = 0, payment_terms_days = 30, opening_balance = 0, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Customer name is required' });

    const insert = db.prepare(`
      INSERT INTO customers (name, phone, address, pan_vat, credit_limit, payment_terms_days, opening_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name,
      phone || null,
      address || null,
      pan_vat || null,
      Number(credit_limit || 0),
      Number(payment_terms_days || 30),
      Number(opening_balance || 0),
      notes || null
    );

    res.json({ success: true, customerId: result.lastInsertRowid, message: 'Customer created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update customer
router.put('/:id', (req, res) => {
  try {
    const { name, phone, address, pan_vat, credit_limit, payment_terms_days, notes, active } = req.body;
    const update = db.prepare(`
      UPDATE customers SET
        name = @name,
        phone = @phone,
        address = @address,
        pan_vat = @pan_vat,
        credit_limit = @credit_limit,
        payment_terms_days = @payment_terms_days,
        notes = @notes,
        active = @active
      WHERE id = @id
    `);

    update.run({
      id: req.params.id,
      name,
      phone: phone || null,
      address: address || null,
      pan_vat: pan_vat || null,
      credit_limit: Number(credit_limit || 0),
      payment_terms_days: Number(payment_terms_days || 30),
      notes: notes || null,
      active: active !== undefined ? (active ? 1 : 0) : 1
    });

    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record customer payment on account (जम्मा भौचर)
router.post('/:id/payment', (req, res) => {
  try {
    const { amount, method = 'CASH', referenceNumber = '', notes = '', userId = 1 } = req.body;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const payAmt = Number(amount);
    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    db.transaction(() => {
      // Insert payment record
      db.prepare(`
        INSERT INTO payments (
          party_type, party_id, reference_type, reference_id, method,
          amount, date_ad, date_bs, reference_number, notes, received_by
        ) VALUES (
          'CUSTOMER', ?, 'ON_ACCOUNT', 0, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(customer.id, method, payAmt, adDateStr, todayBs, referenceNumber, notes || `Khata payment received from ${customer.name}`, userId);

      // If method is cash, update active drawer session
      if (method === 'CASH') {
        const activeSession = db.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
        if (activeSession) {
          db.prepare(`
            UPDATE cash_register_sessions 
            SET cash_receipts = cash_receipts + ?
            WHERE id = ?
          `).run(payAmt, activeSession.id);
        }
      }

      // Automatically allocate against oldest unpaid invoices
      let remainingToApply = payAmt;
      const unpaidInvoices = db.prepare(`
        SELECT id, balance_due, amount_paid FROM sales 
        WHERE customer_id = ? AND balance_due > 0 
        ORDER BY id ASC
      `).all(customer.id);

      for (const inv of unpaidInvoices) {
        if (remainingToApply <= 0) break;
        const applyAmt = Math.min(inv.balance_due, remainingToApply);
        const newPaid = inv.amount_paid + applyAmt;
        const newDue = inv.balance_due - applyAmt;
        const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

        db.prepare('UPDATE sales SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
          .run(newPaid, newDue, newStatus, inv.id);

        remainingToApply -= applyAmt;
      }
    })();

    res.json({ success: true, message: 'Payment recorded and Khata updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
