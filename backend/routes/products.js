const express = require('express');
const router = express.Router();
const db = require('../db/database');
const StockService = require('../services/stockService');

// GET all products with current stock balance derived from Stock Ledger
router.get('/', (req, res) => {
  try {
    const { category, search, activeOnly } = req.query;
    let sql = `
      SELECT 
        p.*,
        COALESCE(SUM(sl.base_quantity), 0) as current_stock
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly === 'true' || activeOnly === undefined) {
      sql += ' AND p.active = 1';
    }
    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (p.name_en LIKE ? OR p.name_np LIKE ? OR p.code LIKE ? OR p.barcode LIKE ? OR p.size LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' GROUP BY p.id ORDER BY p.category ASC, p.name_en ASC';

    const products = db.prepare(sql).all(...params);

    // Parse selling_units and unit_conversions safely
    const formatted = products.map(p => {
      try {
        p.selling_units = typeof p.selling_units === 'string' ? JSON.parse(p.selling_units) : p.selling_units;
      } catch (e) {
        p.selling_units = [p.base_unit];
      }
      try {
        p.unit_conversions = typeof p.unit_conversions === 'string' ? JSON.parse(p.unit_conversions) : p.unit_conversions;
      } catch (e) {
        p.unit_conversions = {};
      }
      return p;
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET product detail by ID with warehouse stock breakdown
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    try {
      product.selling_units = JSON.parse(product.selling_units);
    } catch (e) {
      product.selling_units = [product.base_unit];
    }
    try {
      product.unit_conversions = JSON.parse(product.unit_conversions);
    } catch (e) {
      product.unit_conversions = {};
    }

    const stockSummary = StockService.getStockBalance(product.id);
    const locationsBreakdown = StockService.getStockByLocation(product.id);

    // Also get available cut remnants for this item
    const remnants = db.prepare(`
      SELECT r.*, loc.name as location_name 
      FROM remnants r
      JOIN stock_locations loc ON r.location_id = loc.id
      WHERE r.product_id = ? AND r.status = 'available'
      ORDER BY r.length_meters ASC
    `).all(product.id);

    res.json({
      success: true,
      data: {
        ...product,
        current_stock: stockSummary ? stockSummary.current_stock_base : 0,
        weighted_cost: stockSummary ? stockSummary.weighted_avg_cost : product.cost_price,
        locations: locationsBreakdown,
        remnants
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create product
router.post('/', (req, res) => {
  try {
    const {
      code,
      barcode,
      name_en,
      name_np,
      category,
      grade,
      brand,
      size,
      base_unit,
      selling_units,
      unit_conversions,
      tax_category = 'VAT_13',
      cost_price = 0,
      selling_price = 0,
      reorder_level = 10,
      allows_cutting = 0,
      standard_length = 12,
      opening_stock = 0,
      opening_location_id = 1
    } = req.body;

    if (!code || !name_en || !base_unit) {
      return res.status(400).json({ success: false, error: 'Product code, English name, and base unit are required' });
    }

    const sellingUnitsJson = JSON.stringify(selling_units || [base_unit]);
    const unitConversionsJson = JSON.stringify(unit_conversions || {});

    const insert = db.prepare(`
      INSERT INTO products (
        code, barcode, name_en, name_np, category, grade, brand, size,
        base_unit, selling_units, unit_conversions, tax_category,
        cost_price, selling_price, reorder_level, allows_cutting, standard_length
      ) VALUES (
        @code, @barcode, @name_en, @name_np, @category, @grade, @brand, @size,
        @base_unit, @selling_units, @unit_conversions, @tax_category,
        @cost_price, @selling_price, @reorder_level, @allows_cutting, @standard_length
      )
    `);

    const result = insert.run({
      code,
      barcode: barcode || null,
      name_en,
      name_np: name_np || null,
      category: category || 'Hardware & Tools',
      grade: grade || null,
      brand: brand || null,
      size: size || null,
      base_unit,
      selling_units: sellingUnitsJson,
      unit_conversions: unitConversionsJson,
      tax_category,
      cost_price: Number(cost_price || 0),
      selling_price: Number(selling_price || 0),
      reorder_level: Number(reorder_level || 0),
      allows_cutting: allows_cutting ? 1 : 0,
      standard_length: Number(standard_length || 12)
    });

    const productId = result.lastInsertRowid;

    // If opening stock is specified, record it into stock movement ledger
    if (opening_stock && Number(opening_stock) > 0) {
      StockService.recordMovement({
        product_id: productId,
        location_id: opening_location_id || 1,
        movement_type: 'ADJUSTMENT',
        quantity: Number(opening_stock),
        unit: base_unit,
        base_quantity: Number(opening_stock),
        unit_cost: Number(cost_price || 0),
        reference_type: 'OPENING_STOCK',
        notes: 'Initial opening stock entry',
        user_id: 1
      });
    }

    res.json({ success: true, productId, message: 'Product created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update product
router.put('/:id', (req, res) => {
  try {
    const {
      code,
      barcode,
      name_en,
      name_np,
      category,
      grade,
      brand,
      size,
      base_unit,
      selling_units,
      unit_conversions,
      tax_category,
      cost_price,
      selling_price,
      reorder_level,
      allows_cutting,
      standard_length,
      active
    } = req.body;

    const sellingUnitsJson = JSON.stringify(selling_units || [base_unit]);
    const unitConversionsJson = JSON.stringify(unit_conversions || {});

    const update = db.prepare(`
      UPDATE products SET
        code = @code,
        barcode = @barcode,
        name_en = @name_en,
        name_np = @name_np,
        category = @category,
        grade = @grade,
        brand = @brand,
        size = @size,
        base_unit = @base_unit,
        selling_units = @selling_units,
        unit_conversions = @unit_conversions,
        tax_category = @tax_category,
        cost_price = @cost_price,
        selling_price = @selling_price,
        reorder_level = @reorder_level,
        allows_cutting = @allows_cutting,
        standard_length = @standard_length,
        active = @active
      WHERE id = @id
    `);

    update.run({
      id: req.params.id,
      code,
      barcode: barcode || null,
      name_en,
      name_np: name_np || null,
      category,
      grade: grade || null,
      brand: brand || null,
      size: size || null,
      base_unit,
      selling_units: sellingUnitsJson,
      unit_conversions: unitConversionsJson,
      tax_category: tax_category || 'VAT_13',
      cost_price: Number(cost_price || 0),
      selling_price: Number(selling_price || 0),
      reorder_level: Number(reorder_level || 0),
      allows_cutting: allows_cutting ? 1 : 0,
      standard_length: Number(standard_length || 12),
      active: active !== undefined ? (active ? 1 : 0) : 1
    });

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET categories
router.get('/meta/categories', (req, res) => {
  try {
    const categories = [
      { id: 'TMT Rebar', name_en: 'TMT Rebar (डण्डी)', name_np: 'टिएमटी डण्डी' },
      { id: 'Pipes & Hollow Sections', name_en: 'Pipes & Hollow Sections (पाइप)', name_np: 'पाइप तथा ट्युब' },
      { id: 'Corrugated & Plain Sheets', name_en: 'CGI & Plain Sheets (जस्तापाता)', name_np: 'जस्तापाता' },
      { id: 'Angles & Channels', name_en: 'Angles, Channels & Flats (एंगल/च्यानल)', name_np: 'एङ्गल च्यानल' },
      { id: 'Wire & Nails', name_en: 'Binding Wire & Nails (तार/किल्ला)', name_np: 'तार तथा किल्ला' },
      { id: 'Cement & Aggregates', name_en: 'Cement & Sand (सिमेन्ट/बालुवा)', name_np: 'सिमेन्ट तथा निर्माण सामग्री' },
      { id: 'Hardware & Tools', name_en: 'Hardware & Fasteners (हार्डवेयर)', name_np: 'हार्डवेयर सामान' },
    ];
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
