const db = require('../db/database');
const { getTodayBs } = require('../utils/nepaliCalendar');

/**
 * Iron Store Stock Management Service
 * Ensures the Stock Ledger is the absolute Single Source of Truth.
 */

class StockService {
  /**
   * Calculates the exact stock on hand for a product across all locations or a specific location.
   * Derived dynamically from stock_ledger!
   */
  static getStockBalance(productId, locationId = null) {
    let sql = `
      SELECT 
        p.id as product_id,
        p.code,
        p.name_en,
        p.name_np,
        p.base_unit,
        p.reorder_level,
        p.cost_price,
        p.selling_price,
        COALESCE(SUM(sl.base_quantity), 0) as current_stock_base,
        COALESCE(SUM(CASE WHEN sl.base_quantity > 0 THEN sl.base_quantity * sl.unit_cost ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN sl.base_quantity > 0 THEN sl.base_quantity ELSE 0 END), 0), p.cost_price) as weighted_avg_cost
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
    `;
    const params = [];
    const conditions = [];

    if (productId) {
      conditions.push('p.id = ?');
      params.push(productId);
    }
    if (locationId) {
      conditions.push('(sl.location_id = ? OR sl.location_id IS NULL)');
      params.push(locationId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY p.id';

    if (productId) {
      return db.prepare(sql).get(...params);
    }
    return db.prepare(sql).all(...params);
  }

  /**
   * Gets stock breakdown by warehouse/yard location for an item
   */
  static getStockByLocation(productId) {
    const sql = `
      SELECT 
        loc.id as location_id,
        loc.name as location_name,
        loc.name_np as location_name_np,
        COALESCE(SUM(sl.base_quantity), 0) as stock_qty
      FROM stock_locations loc
      LEFT JOIN stock_ledger sl ON loc.id = sl.location_id AND sl.product_id = ?
      GROUP BY loc.id
    `;
    return db.prepare(sql).all(productId);
  }

  /**
   * Convert between units using product configuration
   * Returns: { baseQuantity, conversionFactor, note }
   */
  static convertToBaseQuantity(product, quantity, inputUnit) {
    const qty = Number(quantity);
    const unit = (inputUnit || '').toLowerCase().trim();
    const baseUnit = (product.base_unit || 'kg').toLowerCase().trim();

    if (unit === baseUnit) {
      return { baseQuantity: qty, factor: 1 };
    }

    let conversions = {};
    try {
      conversions = typeof product.unit_conversions === 'string'
        ? JSON.parse(product.unit_conversions)
        : (product.unit_conversions || {});
    } catch (e) {
      conversions = {};
    }

    // Standard conversions
    // 1. Tonne to Kg (1 Tonne = 1000 Kg)
    if (unit === 'tonne' || unit === 'ton') {
      if (baseUnit === 'kg') return { baseQuantity: qty * 1000, factor: 1000 };
    }
    // 2. Quintal to Kg (1 Quintal = 100 Kg)
    if (unit === 'quintal') {
      if (baseUnit === 'kg') return { baseQuantity: qty * 100, factor: 100 };
    }
    // 3. Bundle conversions
    if (unit === 'bundle') {
      const pcsPerBundle = conversions.pieces_per_bundle || 1;
      if (baseUnit === 'piece') {
        return { baseQuantity: qty * pcsPerBundle, factor: pcsPerBundle };
      }
      if (baseUnit === 'kg') {
        const kgPerPiece = conversions.kg_per_piece || 1;
        const totalKg = qty * pcsPerBundle * kgPerPiece;
        return { baseQuantity: totalKg, factor: pcsPerBundle * kgPerPiece };
      }
    }
    // 4. Piece to Kg or vice versa
    if (unit === 'piece' || unit === 'pc') {
      if (baseUnit === 'kg' && conversions.kg_per_piece) {
        return { baseQuantity: qty * conversions.kg_per_piece, factor: conversions.kg_per_piece };
      }
    }
    if (unit === 'kg') {
      if (baseUnit === 'piece' && conversions.kg_per_piece) {
        return { baseQuantity: qty / conversions.kg_per_piece, factor: 1 / conversions.kg_per_piece };
      }
    }
    // 5. Metre / Length conversions
    if (unit === 'meter' || unit === 'metre' || unit === 'm') {
      if (baseUnit === 'kg' && conversions.kg_per_meter) {
        return { baseQuantity: qty * conversions.kg_per_meter, factor: conversions.kg_per_meter };
      }
      if (baseUnit === 'piece' && conversions.meter_per_piece) {
        return { baseQuantity: qty / conversions.meter_per_piece, factor: 1 / conversions.meter_per_piece };
      }
    }
    // 6. Feet to Meter (1 foot = 0.3048 meter)
    if (unit === 'foot' || unit === 'feet' || unit === 'ft') {
      const meters = qty * 0.3048;
      if (baseUnit === 'meter') return { baseQuantity: meters, factor: 0.3048 };
      if (baseUnit === 'kg' && conversions.kg_per_meter) {
        return { baseQuantity: meters * conversions.kg_per_meter, factor: 0.3048 * conversions.kg_per_meter };
      }
    }
    // 7. Sheet conversions
    if (unit === 'sheet') {
      if (baseUnit === 'kg' && conversions.kg_per_sheet) {
        return { baseQuantity: qty * conversions.kg_per_sheet, factor: conversions.kg_per_sheet };
      }
      if (baseUnit === 'piece') {
        return { baseQuantity: qty, factor: 1 };
      }
    }

    // Default fallback: direct 1:1 if unknown
    return { baseQuantity: qty, factor: 1 };
  }

  /**
   * Appends an immutable record into the Stock Movement Ledger.
   */
  static recordMovement(movement, tx = null) {
    const runner = tx || db;
    const stmt = runner.prepare(`
      INSERT INTO stock_ledger (
        product_id, location_id, movement_type, quantity, unit,
        base_quantity, unit_cost, reference_type, reference_id,
        notes, user_id, date_ad, date_bs
      ) VALUES (
        @product_id, @location_id, @movement_type, @quantity, @unit,
        @base_quantity, @unit_cost, @reference_type, @reference_id,
        @notes, @user_id, @date_ad, @date_bs
      )
    `);

    const date_ad = movement.date_ad || new Date().toISOString().split('T')[0];
    const date_bs = movement.date_bs || getTodayBs();

    return stmt.run({
      product_id: movement.product_id,
      location_id: movement.location_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      unit: movement.unit,
      base_quantity: movement.base_quantity,
      unit_cost: movement.unit_cost || 0,
      reference_type: movement.reference_type || null,
      reference_id: movement.reference_id || null,
      notes: movement.notes || null,
      user_id: movement.user_id || 1,
      date_ad,
      date_bs
    });
  }

  /**
   * Process a cut-length sale:
   * E.g. Customer buys 4.5m of a 12m rebar or pipe.
   * 1. Sells 4.5m (converted to base kg or piece).
   * 2. Remaining 7.5m is added to remnants table (either usable or scrap).
   * 3. An entire 1 piece is deducted from primary stock, and 1 remnant piece is credited.
   */
  static recordCutLengthSale({
    productId,
    locationId,
    cutLengthMeters,
    saleId,
    userId,
    remnantCondition = 'usable' // 'usable' or 'scrap'
  }, tx = null) {
    const runner = tx || db;
    const product = runner.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) throw new Error('Product not found for cut-length operation');

    const standardLength = product.standard_length || 12; // default 12m for Nepali rebar/pipe
    const remnantLength = standardLength - cutLengthMeters;

    if (remnantLength < 0) {
      throw new Error(`Cut length (${cutLengthMeters}m) cannot exceed standard product length (${standardLength}m)`);
    }

    // Insert remnant entry
    let remnantId = null;
    if (remnantLength > 0) {
      const remnantStmt = runner.prepare(`
        INSERT INTO remnants (product_id, location_id, length_meters, quantity, condition, notes, status)
        VALUES (?, ?, ?, 1, ?, ?, 'available')
      `);
      const notes = `Remnant from Cut Sale #${saleId} (Cut: ${cutLengthMeters}m, Remnant: ${remnantLength}m)`;
      const res = remnantStmt.run(productId, locationId, remnantLength, remnantCondition, notes);
      remnantId = res.lastInsertRowid;
    }

    return { remnantId, remnantLength };
  }

  /**
   * Fetches low stock items based on reorder_level
   */
  static getLowStockAlerts() {
    const sql = `
      SELECT 
        p.id,
        p.code,
        p.name_en,
        p.name_np,
        p.category,
        p.brand,
        p.size,
        p.base_unit,
        p.reorder_level,
        p.cost_price,
        p.selling_price,
        COALESCE(SUM(sl.base_quantity), 0) as current_stock
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
      WHERE p.active = 1
      GROUP BY p.id
      HAVING current_stock <= p.reorder_level
      ORDER BY (current_stock - p.reorder_level) ASC
    `;
    return db.prepare(sql).all();
  }

  /**
   * Fetches movement history with filters
   */
  static getMovementHistory({ productId, locationId, movementType, fromDateBs, toDateBs, limit = 100 }) {
    let sql = `
      SELECT 
        sl.*,
        p.code as product_code,
        p.name_en as product_name,
        p.name_np as product_name_np,
        p.base_unit,
        loc.name as location_name,
        u.full_name as user_name
      FROM stock_ledger sl
      JOIN products p ON sl.product_id = p.id
      JOIN stock_locations loc ON sl.location_id = loc.id
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      sql += ' AND sl.product_id = ?';
      params.push(productId);
    }
    if (locationId) {
      sql += ' AND sl.location_id = ?';
      params.push(locationId);
    }
    if (movementType) {
      sql += ' AND sl.movement_type = ?';
      params.push(movementType);
    }
    if (fromDateBs) {
      sql += ' AND sl.date_bs >= ?';
      params.push(fromDateBs);
    }
    if (toDateBs) {
      sql += ' AND sl.date_bs <= ?';
      params.push(toDateBs);
    }

    sql += ' ORDER BY sl.id DESC LIMIT ?';
    params.push(limit);

    return db.prepare(sql).all(...params);
  }
}

module.exports = StockService;
