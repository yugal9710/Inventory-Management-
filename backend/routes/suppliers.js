const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// GET all suppliers with balance payable
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT 
        s.*,
        COALESCE((SELECT SUM(total_amount) FROM purchases WHERE supplier_id = s.id AND status = 'RECEIVED'), 0) as total_purchased,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'SUPPLIER' AND party_id = s.id), 0) as total_paid
      FROM suppliers s
      WHERE s.active = 1
    `;
    const params = [];

    if (search) {
      sql += ' AND (s.name LIKE ? OR s.company_name LIKE ? OR s.phone LIKE ? OR s.pan_vat LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY s.name ASC';

    const suppliers = db.prepare(sql).all(...params).map(s => {
      const balance = s.opening_balance + s.total_purchased - s.total_paid;
      return {
        ...s,
        current_balance: Number(balance.toFixed(2))
      };
    });

    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single supplier detail with purchase ledger
router.get('/:id', (req, res) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    const purchases = db.prepare(`
      SELECT id, purchase_order_no, supplier_invoice_no, date_bs, date_ad, total_amount, amount_paid, balance_due, payment_status
      FROM purchases
      WHERE supplier_id = ?
      ORDER BY id DESC
    `).all(supplier.id);

    const payments = db.prepare(`
      SELECT p.*, u.full_name as paid_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.party_type = 'SUPPLIER' AND p.party_id = ?
      ORDER BY p.id DESC
    `).all(supplier.id);

    const totalPurchased = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = supplier.opening_balance + totalPurchased - totalPaid;

    res.json({
      success: true,
      data: {
        ...supplier,
        current_balance: Number(currentBalance.toFixed(2)),
        total_purchased: Number(totalPurchased.toFixed(2)),
        total_paid: Number(totalPaid.toFixed(2)),
        purchases,
        payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create supplier
router.post('/', (req, res) => {
  try {
    const { name, company_name, phone, address, pan_vat, opening_balance = 0, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Supplier name is required' });

    const insert = db.prepare(`
      INSERT INTO suppliers (name, company_name, phone, address, pan_vat, opening_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name,
      company_name || null,
      phone || null,
      address || null,
      pan_vat || null,
      Number(opening_balance || 0),
      notes || null
    );

    res.json({ success: true, supplierId: result.lastInsertRowid, message: 'Supplier created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update supplier
router.put('/:id', (req, res) => {
  try {
    const { name, company_name, phone, address, pan_vat, notes, active } = req.body;
    const update = db.prepare(`
      UPDATE suppliers SET
        name = @name,
        company_name = @company_name,
        phone = @phone,
        address = @address,
        pan_vat = @pan_vat,
        notes = @notes,
        active = @active
      WHERE id = @id
    `);

    update.run({
      id: req.params.id,
      name,
      company_name: company_name || null,
      phone: phone || null,
      address: address || null,
      pan_vat: pan_vat || null,
      notes: notes || null,
      active: active !== undefined ? (active ? 1 : 0) : 1
    });

    res.json({ success: true, message: 'Supplier updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
