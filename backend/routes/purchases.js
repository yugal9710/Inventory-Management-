const express = require('express');
const router = express.Router();
const db = require('../db/database');
const StockService = require('../services/stockService');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// GET all purchases / GRNs
router.get('/', (req, res) => {
  try {
    const { supplierId, fiscalYear, fromDateBs, toDateBs } = req.query;
    let sql = `
      SELECT 
        p.*,
        s.name as supplier_name,
        s.pan_vat as supplier_pan,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM purchase_lines WHERE purchase_id = p.id) as item_count
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (supplierId) {
      sql += ' AND p.supplier_id = ?';
      params.push(supplierId);
    }
    if (fiscalYear) {
      sql += ' AND p.fiscal_year = ?';
      params.push(fiscalYear);
    }
    if (fromDateBs) {
      sql += ' AND p.date_bs >= ?';
      params.push(fromDateBs);
    }
    if (toDateBs) {
      sql += ' AND p.date_bs <= ?';
      params.push(toDateBs);
    }

    sql += ' ORDER BY p.id DESC';

    const purchases = db.prepare(sql).all(...params);
    res.json({ success: true, data: purchases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET purchase detail by ID
router.get('/:id', (req, res) => {
  try {
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.company_name, s.phone, s.address, s.pan_vat as supplier_pan
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Purchase not found' });
    }

    const lines = db.prepare(`
      SELECT 
        pl.*,
        p.code as product_code,
        p.name_en as product_name,
        p.name_np as product_name_np,
        p.category,
        p.brand,
        p.size,
        loc.name as location_name
      FROM purchase_lines pl
      JOIN products p ON pl.product_id = p.id
      JOIN stock_locations loc ON pl.location_id = loc.id
      WHERE pl.purchase_id = ?
    `).all(req.params.id);

    const payments = db.prepare(`
      SELECT * FROM payments 
      WHERE reference_type = 'PURCHASE' AND reference_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...purchase,
        lines,
        payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create purchase / receive stock (GRN) with landed cost allocation
router.post('/', (req, res) => {
  try {
    const {
      supplierId,
      supplierInvoiceNo,
      purchaseOrderNo,
      dateBs,
      items = [], // [{ productId, locationId, orderedQty, receivedQty, shortageQty, damagedQty, unit, unitCost, taxCategory }]
      discount = 0,
      freightAmount = 0, // भाडा
      unloadingCharge = 0, // लोड/अनलोड मजदुरी
      amountPaid = 0,
      paymentMethod = 'BANK_TRANSFER',
      paymentReference = '',
      notes = '',
      userId = 1
    } = req.body;

    if (!supplierId || !items.length) {
      return res.status(400).json({ success: false, error: 'Supplier and at least one item are required' });
    }

    const todayBs = dateBs || getTodayBs();
    const { adDateStr } = bsToAd(todayBs);
    const fySetting = db.prepare("SELECT value FROM settings WHERE key = 'active_fiscal_year'").get();
    const fiscalYear = fySetting ? fySetting.value : '2081/82';

    const result = db.transaction(() => {
      // 1. Calculate item totals and allocate landed costs (freight + unloading)
      let subtotal = 0;
      let taxableAmount = 0;
      let taxAmount = 0;
      let totalReceivedBaseQty = 0;

      // First pass: Calculate total quantity for proportionate landed cost allocation
      const itemCalculations = items.map(item => {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        const receivedQty = Number(item.receivedQty || 0);
        const cost = Number(item.unitCost || product.cost_price);
        const lineGross = receivedQty * cost;

        const { baseQuantity } = StockService.convertToBaseQuantity(product, receivedQty, item.unit);
        totalReceivedBaseQty += baseQuantity;
        subtotal += lineGross;

        return {
          product,
          locationId: item.locationId || 1,
          orderedQty: Number(item.orderedQty || receivedQty),
          receivedQty,
          shortageQty: Number(item.shortageQty || 0),
          damagedQty: Number(item.damagedQty || 0),
          unit: item.unit || product.base_unit,
          baseQuantity,
          unitCost: cost,
          lineGross,
          taxCategory: item.taxCategory || product.tax_category || 'VAT_13'
        };
      });

      // Additional landed cost per unit base quantity
      const totalAdditionalCosts = Number(freightAmount || 0) + Number(unloadingCharge || 0);
      const landedCostPerBaseUnit = totalReceivedBaseQty > 0 ? (totalAdditionalCosts / totalReceivedBaseQty) : 0;

      // Second pass: Calculate tax and landed unit cost
      const processedLines = itemCalculations.map(line => {
        const allocatedLanded = (line.baseQuantity * landedCostPerBaseUnit) / (line.receivedQty || 1);
        const finalLandedUnitCost = line.unitCost + allocatedLanded;

        let lineTax = 0;
        if (line.taxCategory === 'VAT_13') {
          taxableAmount += line.lineGross;
          lineTax = Number((line.lineGross * 0.13).toFixed(2));
          taxAmount += lineTax;
        }

        return {
          ...line,
          landedUnitCost: Number(finalLandedUnitCost.toFixed(2)),
          lineTotal: line.lineGross,
          taxAmount: lineTax
        };
      });

      const totalAmount = Number((subtotal - Number(discount || 0) + totalAdditionalCosts + taxAmount).toFixed(2));
      const rawPaid = Number(amountPaid || 0);
      const paid = Math.min(rawPaid, totalAmount);
      const balanceDue = Math.max(0, Number((totalAmount - paid).toFixed(2)));

      let paymentStatus = 'PAID';
      if (balanceDue === 0 && (paid > 0 || totalAmount === 0)) paymentStatus = 'PAID';
      else if (balanceDue > 0 && paid > 0) paymentStatus = 'PARTIAL';
      else if (balanceDue > 0 && paid === 0) paymentStatus = 'UNPAID';

      // 2. Insert purchase header
      const insertPurchase = db.prepare(`
        INSERT INTO purchases (
          purchase_order_no, supplier_id, supplier_invoice_no, fiscal_year,
          date_ad, date_bs, status, subtotal, discount, freight_amount,
          unloading_charge, taxable_amount, tax_amount, total_amount,
          amount_paid, balance_due, payment_status, notes, created_by
        ) VALUES (
          @purchase_order_no, @supplier_id, @supplier_invoice_no, @fiscal_year,
          @date_ad, @date_bs, 'RECEIVED', @subtotal, @discount, @freight_amount,
          @unloading_charge, @taxable_amount, @tax_amount, @total_amount,
          @amount_paid, @balance_due, @payment_status, @notes, @created_by
        )
      `);

      const poRes = insertPurchase.run({
        purchase_order_no: purchaseOrderNo || `PO-${Date.now().toString().slice(-6)}`,
        supplier_id: supplierId,
        supplier_invoice_no: supplierInvoiceNo || `SINV-${Date.now().toString().slice(-6)}`,
        fiscal_year: fiscalYear,
        date_ad: adDateStr,
        date_bs: todayBs,
        subtotal,
        discount: Number(discount || 0),
        freight_amount: Number(freightAmount || 0),
        unloading_charge: Number(unloadingCharge || 0),
        taxable_amount: taxableAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        amount_paid: paid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        notes,
        created_by: userId
      });

      const purchaseId = poRes.lastInsertRowid;

      // 3. Insert purchase lines & increment Stock Movement Ledger
      const insertLine = db.prepare(`
        INSERT INTO purchase_lines (
          purchase_id, product_id, location_id, ordered_qty, received_qty,
          shortage_qty, damaged_qty, unit, base_quantity, unit_cost,
          landed_unit_cost, line_total, tax_category
        ) VALUES (
          @purchase_id, @product_id, @location_id, @ordered_qty, @received_qty,
          @shortage_qty, @damaged_qty, @unit, @base_quantity, @unit_cost,
          @landed_unit_cost, @line_total, @tax_category
        )
      `);

      for (const line of processedLines) {
        insertLine.run({
          purchase_id: purchaseId,
          product_id: line.product.id,
          location_id: line.locationId,
          ordered_qty: line.orderedQty,
          received_qty: line.receivedQty,
          shortage_qty: line.shortageQty,
          damaged_qty: line.damagedQty,
          unit: line.unit,
          base_quantity: line.baseQuantity,
          unit_cost: line.unitCost,
          landed_unit_cost: line.landedUnitCost,
          line_total: line.lineTotal,
          tax_category: line.taxCategory
        });

        // Update product cost price with latest landed cost
        db.prepare('UPDATE products SET cost_price = ? WHERE id = ?')
          .run(line.landedUnitCost, line.product.id);

        // Record stock entry into ledger
        StockService.recordMovement({
          product_id: line.product.id,
          location_id: line.locationId,
          movement_type: 'PURCHASE_RECEIPT',
          quantity: line.receivedQty,
          unit: line.unit,
          base_quantity: line.baseQuantity, // Positive for stock receipt
          unit_cost: line.landedUnitCost,
          reference_type: 'PURCHASE',
          reference_id: purchaseId,
          notes: `GRN from ${supplierInvoiceNo || 'Purchase #' + purchaseId}`,
          user_id: userId,
          date_ad: adDateStr,
          date_bs: todayBs
        }, db);
      }

      // 4. Record payment if paid > 0
      if (paid > 0) {
        db.prepare(`
          INSERT INTO payments (
            party_type, party_id, reference_type, reference_id, method,
            amount, date_ad, date_bs, reference_number, notes, received_by
          ) VALUES (
            'SUPPLIER', ?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).run(
          supplierId,
          purchaseId,
          paymentMethod,
          paid,
          adDateStr,
          todayBs,
          paymentReference,
          `Paid for Purchase #${purchaseId}`,
          userId
        );
      }

      return { purchaseId, totalAmount, balanceDue };
    })();

    res.json({ success: true, data: result, message: 'Stock received and inventory ledger updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record payment to supplier
router.post('/:id/payment', (req, res) => {
  try {
    const { amount, method = 'BANK_TRANSFER', referenceNumber = '', notes = '', userId = 1 } = req.body;
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, error: 'Purchase not found' });

    const payAmt = Math.min(Number(amount), Math.max(0, purchase.balance_due));
    if (payAmt <= 0) {
      return res.status(400).json({ success: false, error: 'Purchase invoice is already settled in full' });
    }
    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    db.transaction(() => {
      // Record payment
      db.prepare(`
        INSERT INTO payments (
          party_type, party_id, reference_type, reference_id, method,
          amount, date_ad, date_bs, reference_number, notes, received_by
        ) VALUES (
          'SUPPLIER', ?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(purchase.supplier_id, purchase.id, method, payAmt, adDateStr, todayBs, referenceNumber, notes, userId);

      const newPaid = Math.min(purchase.total_amount, purchase.amount_paid + payAmt);
      const newDue = Math.max(0, Number((purchase.total_amount - newPaid).toFixed(2)));
      const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

      db.prepare('UPDATE purchases SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
        .run(newPaid, newDue, newStatus, purchase.id);
    })();

    res.json({ success: true, message: 'Supplier payment recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE purchase by ID (rolls back stock, lines, and payments)
router.delete('/:id', (req, res) => {
  try {
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, error: 'Purchase not found' });

    db.transaction(() => {
      // 1. Delete associated payments
      db.prepare("DELETE FROM payments WHERE reference_type = 'PURCHASE' AND reference_id = ?").run(purchase.id);

      // 2. Delete stock ledger movements
      db.prepare("DELETE FROM stock_ledger WHERE movement_type = 'PURCHASE_RECEIPT' AND reference_id = ?").run(purchase.id);

      // 3. Delete purchase lines
      db.prepare("DELETE FROM purchase_lines WHERE purchase_id = ?").run(purchase.id);

      // 4. Delete purchase header
      db.prepare("DELETE FROM purchases WHERE id = ?").run(purchase.id);
    })();

    res.json({ success: true, message: 'Purchase record deleted and stock reversed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
