const express = require('express');
const router = express.Router();
const db = require('../db/database');
const InvoiceService = require('../services/invoiceService');
const CbmsService = require('../services/cbmsService');

// GET all sales invoices
router.get('/', (req, res) => {
  try {
    const { customerId, fiscalYear, fromDateBs, toDateBs, search } = req.query;
    let sql = `
      SELECT 
        s.*,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM sale_lines WHERE sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      sql += ' AND s.customer_id = ?';
      params.push(customerId);
    }
    if (fiscalYear) {
      sql += ' AND s.fiscal_year = ?';
      params.push(fiscalYear);
    }
    if (fromDateBs) {
      sql += ' AND s.date_bs >= ?';
      params.push(fromDateBs);
    }
    if (toDateBs) {
      sql += ' AND s.date_bs <= ?';
      params.push(toDateBs);
    }
    if (search) {
      sql += ' AND (s.invoice_no LIKE ? OR s.customer_name LIKE ? OR s.customer_pan LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY s.id DESC';

    const sales = db.prepare(sql).all(...params);
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single sale invoice for preview / printing
router.get('/:id', (req, res) => {
  try {
    const sale = InvoiceService.getSaleById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, error: 'Sale invoice not found' });
    }
    res.json({ success: true, data: sale });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create sale invoice
router.post('/', async (req, res) => {
  try {
    const sale = InvoiceService.createSale(req.body);

    // If CBMS auto-sync is enabled, attempt sync in background or immediately
    const cbmsConfig = CbmsService.getConfig();
    if (cbmsConfig.enabled) {
      try {
        await CbmsService.syncInvoice(sale.id);
      } catch (cbmsErr) {
        console.warn('CBMS auto-sync notice:', cbmsErr.message);
      }
    }

    res.json({ success: true, data: sale, message: 'Invoice issued successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST process sales return and issue IRD Credit Note
router.post('/:id/return', (req, res) => {
  try {
    const { returnLines, reason, userId = 1 } = req.body;
    const result = InvoiceService.processSaleReturn({
      saleId: req.params.id,
      returnLines,
      reason,
      userId
    });

    res.json({ success: true, data: result, message: 'Credit Note issued and stock updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST manually trigger IRD CBMS sync for an invoice
router.post('/:id/sync-cbms', async (req, res) => {
  try {
    const result = await CbmsService.syncInvoice(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
