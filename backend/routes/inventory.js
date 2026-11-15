const express = require('express');
const router = express.Router();
const db = require('../db/database');
const StockService = require('../services/stockService');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// GET stock locations (yards, cutting shed, store)
router.get('/locations', (req, res) => {
  try {
    const locations = db.prepare('SELECT * FROM stock_locations ORDER BY is_default DESC, id ASC').all();
    res.json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Stock Movement Ledger
router.get('/ledger', (req, res) => {
  try {
    const { productId, locationId, movementType, fromDateBs, toDateBs, limit } = req.query;
    const history = StockService.getMovementHistory({
      productId: productId ? Number(productId) : null,
      locationId: locationId ? Number(locationId) : null,
      movementType,
      fromDateBs,
      toDateBs,
      limit: limit ? Number(limit) : 200
    });
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET low stock items
router.get('/low-stock', (req, res) => {
  try {
    const items = StockService.getLowStockAlerts();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET cut-off remnants & offcuts
router.get('/remnants', (req, res) => {
  try {
    const { status = 'available', productId } = req.query;
    let sql = `
      SELECT 
        r.*,
        p.code as product_code,
        p.name_en as product_name,
        p.name_np as product_name_np,
        p.category,
        p.brand,
        p.size,
        loc.name as location_name
      FROM remnants r
      JOIN products p ON r.product_id = p.id
      JOIN stock_locations loc ON r.location_id = loc.id
      WHERE 1=1
    `;
    const params = [];
    if (status !== 'all') {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (productId) {
      sql += ' AND r.product_id = ?';
      params.push(productId);
    }
    sql += ' ORDER BY r.id DESC';

    const remnants = db.prepare(sql).all(...params);
    res.json({ success: true, data: remnants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add a remnant manually
router.post('/remnants', (req, res) => {
  try {
    const { productId, locationId = 1, lengthMeters, quantity = 1, condition = 'usable', notes } = req.body;
    if (!productId || !lengthMeters) {
      return res.status(400).json({ success: false, error: 'Product and length in meters are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO remnants (product_id, location_id, length_meters, quantity, condition, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, 'available')
    `);
    const result = stmt.run(productId, locationId, lengthMeters, quantity, condition, notes || 'Manual remnant entry');
    res.json({ success: true, remnantId: result.lastInsertRowid, message: 'Remnant recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update remnant status (e.g. marked as sold or discarded as scrap)
router.put('/remnants/:id/status', (req, res) => {
  try {
    const { status, condition } = req.body;
    const remnant = db.prepare('SELECT * FROM remnants WHERE id = ?').get(req.params.id);
    if (!remnant) return res.status(404).json({ success: false, error: 'Remnant not found' });

    db.prepare('UPDATE remnants SET status = ?, condition = COALESCE(?, condition) WHERE id = ?')
      .run(status, condition || null, req.params.id);

    res.json({ success: true, message: 'Remnant updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST stock adjustment / stock count variance
router.post('/adjustments', (req, res) => {
  try {
    const { locationId = 1, reason, lines = [], userId = 1 } = req.body;
    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    const adjustmentResult = db.transaction(() => {
      const adjNo = `ADJ-${Date.now().toString().slice(-6)}`;
      const insertAdj = db.prepare(`
        INSERT INTO stock_adjustments (adjustment_no, location_id, reason, status, date_ad, date_bs, created_by, approved_by, approved_at)
        VALUES (?, ?, ?, 'APPROVED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const adjRes = insertAdj.run(adjNo, locationId, reason || 'Physical inventory reconciliation', adDateStr, todayBs, userId, userId);
      const adjId = adjRes.lastInsertRowid;

      const insertLine = db.prepare(`
        INSERT INTO stock_adjustment_lines (adjustment_id, product_id, system_qty, counted_qty, difference_qty, unit, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(line.productId);
        const diffQty = Number(line.countedQty) - Number(line.systemQty);

        insertLine.run(adjId, line.productId, line.systemQty, line.countedQty, diffQty, product.base_unit, line.reason || '');

        if (diffQty !== 0) {
          // Record adjustment in Stock Movement Ledger
          StockService.recordMovement({
            product_id: line.productId,
            location_id: locationId,
            movement_type: 'ADJUSTMENT',
            quantity: Math.abs(diffQty),
            unit: product.base_unit,
            base_quantity: diffQty, // positive if excess, negative if deficit
            unit_cost: product.cost_price,
            reference_type: 'ADJUSTMENT',
            reference_id: adjId,
            notes: `Physical Stock Count Adj #${adjNo} (${reason || ''})`,
            user_id: userId,
            date_ad: adDateStr,
            date_bs: todayBs
          }, db);
        }
      }

      return { adjId, adjNo };
    })();

    res.json({ success: true, data: adjustmentResult, message: 'Stock adjustment applied successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
