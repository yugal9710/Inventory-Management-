const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// Helper: Auto-generate unique supplier code (e.g. SUPP-0001)
function generateNextSupplierCode(prefix = 'SUPP-') {
  try {
    const rows = db.prepare("SELECT supplier_code FROM suppliers WHERE supplier_code LIKE ?").all(`${prefix}%`);
    let maxNum = 0;
    for (const r of rows) {
      if (r.supplier_code) {
        const parts = r.supplier_code.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const nextSeq = maxNum + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  } catch {
    const count = db.prepare('SELECT COUNT(*) as c FROM suppliers').get()?.c || 0;
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}

// GET all suppliers with balance payable & codes
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
      sql += ' AND (s.name LIKE ? OR s.supplier_code LIKE ? OR s.company_name LIKE ? OR s.phone LIKE ? OR s.pan_vat LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
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
      SELECT id, purchase_order_no, supplier_invoice_no, date_bs, date_ad, total_amount, amount_paid, balance_due, payment_status, notes
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
    const { supplier_code, name, company_name, phone, address, pan_vat, opening_balance = 0, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Supplier / Mill name is required' });

    // Validate or auto-generate unique supplier code
    let finalCode = (supplier_code || '').trim().toUpperCase();
    if (!finalCode) {
      finalCode = generateNextSupplierCode('SUPP-');
    } else {
      const existing = db.prepare('SELECT id, name FROM suppliers WHERE supplier_code = ?').get(finalCode);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Supplier Code "${finalCode}" is already in use by "${existing.name}".`
        });
      }
    }

    // Phone validation: exactly 10 digits if provided
    let cleanPhone = (phone || '').trim();
    if (cleanPhone) {
      cleanPhone = cleanPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Supplier phone number must be exactly 10 digits (e.g. 98XXXXXXXX) / फोन नम्बर १० अंकको हुनुपर्दछ ।'
        });
      }
    }

    // PAN validation: exactly 9 digits if provided
    let cleanPan = (pan_vat || '').trim();
    if (cleanPan) {
      cleanPan = cleanPan.replace(/\D/g, '');
      if (cleanPan.length !== 9) {
        return res.status(400).json({
          success: false,
          error: 'Nepal PAN/VAT must be exactly 9 digits / स्थायी लेखा नं. ९ अंकको हुनुपर्दछ ।'
        });
      }
    }

    const insert = db.prepare(`
      INSERT INTO suppliers (supplier_code, name, company_name, phone, address, pan_vat, opening_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      finalCode,
      name,
      company_name || null,
      cleanPhone || null,
      address || null,
      cleanPan || null,
      Number(opening_balance || 0),
      notes || null
    );

    res.json({
      success: true,
      supplierId: result.lastInsertRowid,
      supplier_code: finalCode,
      message: 'Supplier created successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update supplier
router.put('/:id', (req, res) => {
  try {
    const { supplier_code, name, company_name, phone, address, pan_vat, notes, active } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Supplier name is required' });

    // Validate supplier_code if modified
    let finalCode = (supplier_code || '').trim().toUpperCase();
    if (finalCode) {
      const existing = db.prepare('SELECT id, name FROM suppliers WHERE supplier_code = ? AND id != ?').get(finalCode, req.params.id);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Supplier Code "${finalCode}" is already in use by "${existing.name}".`
        });
      }
    } else {
      const current = db.prepare('SELECT supplier_code FROM suppliers WHERE id = ?').get(req.params.id);
      finalCode = current?.supplier_code || generateNextSupplierCode('SUPP-');
    }

    // Phone validation
    let cleanPhone = (phone || '').trim();
    if (cleanPhone) {
      cleanPhone = cleanPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Supplier phone number must be exactly 10 digits / फोन नम्बर १० अंकको हुनुपर्दछ ।'
        });
      }
    }

    // PAN validation
    let cleanPan = (pan_vat || '').trim();
    if (cleanPan) {
      cleanPan = cleanPan.replace(/\D/g, '');
      if (cleanPan.length !== 9) {
        return res.status(400).json({
          success: false,
          error: 'Nepal PAN/VAT must be exactly 9 digits / स्थायी लेखा नं. ९ अंकको हुनुपर्दछ ।'
        });
      }
    }

    const update = db.prepare(`
      UPDATE suppliers SET
        supplier_code = @supplier_code,
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
      supplier_code: finalCode,
      name,
      company_name: company_name || null,
      phone: cleanPhone || null,
      address: address || null,
      pan_vat: cleanPan || null,
      notes: notes || null,
      active: active !== undefined ? (active ? 1 : 0) : 1
    });

    res.json({ success: true, supplier_code: finalCode, message: 'Supplier updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record payment to supplier on account (आपूर्तिकर्ता भुक्तानी भौचर)
router.post('/:id/payment', (req, res) => {
  try {
    const {
      amount,
      date_bs,
      method = 'BANK_TRANSFER',
      referenceNumber = '',
      purchase_id,
      notes = '',
      userId = 1
    } = req.body;

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    const payAmt = Number(amount);
    if (!payAmt || isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be a positive number greater than 0 / रकम ० भन्दा बढी हुनुपर्दछ ।'
      });
    }

    const payDateBs = (date_bs || '').trim() || getTodayBs();
    let adDateStr;
    try {
      const adResult = bsToAd(payDateBs);
      adDateStr = adResult.adDateStr;
    } catch {
      adDateStr = new Date().toISOString().split('T')[0];
    }

    let newPaymentId;
    let supplierBalanceBefore = 0;
    let supplierBalanceAfter = 0;

    // Calculate balances before
    const purchasesBefore = db.prepare("SELECT total_amount FROM purchases WHERE supplier_id = ? AND status = 'RECEIVED'").all(supplier.id);
    const paymentsBefore = db.prepare("SELECT amount FROM payments WHERE party_type = 'SUPPLIER' AND party_id = ?").all(supplier.id);
    const totalPurchasedBefore = purchasesBefore.reduce((sum, p) => sum + p.total_amount, 0);
    const totalPaidBefore = paymentsBefore.reduce((sum, p) => sum + p.amount, 0);
    supplierBalanceBefore = supplier.opening_balance + totalPurchasedBefore - totalPaidBefore;
    supplierBalanceAfter = supplierBalanceBefore - payAmt;

    db.transaction(() => {
      let allocatedPoNo = null;
      let referenceType = 'ON_ACCOUNT';
      let referenceId = 0;

      // Case 1: Specific Purchase Order Allocation Requested
      if (purchase_id && Number(purchase_id) > 0) {
        const targetPurchase = db.prepare('SELECT id, purchase_order_no, balance_due, amount_paid, total_amount FROM purchases WHERE id = ? AND supplier_id = ?')
          .get(Number(purchase_id), supplier.id);

        if (targetPurchase) {
          referenceType = 'PURCHASE';
          referenceId = targetPurchase.id;
          allocatedPoNo = targetPurchase.purchase_order_no;

          // Allocate payment up to remaining balance
          const applyAmt = Math.min(targetPurchase.balance_due, payAmt);
          const newPaid = targetPurchase.amount_paid + applyAmt;
          const newDue = Math.max(0, targetPurchase.balance_due - applyAmt);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

          db.prepare('UPDATE purchases SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, targetPurchase.id);
        }
      } else {
        // Case 2: General / Oldest First Allocation
        let remainingToApply = payAmt;
        const unpaidPurchases = db.prepare(`
          SELECT id, purchase_order_no, balance_due, amount_paid, total_amount FROM purchases 
          WHERE supplier_id = ? AND balance_due > 0 
          ORDER BY id ASC
        `).all(supplier.id);

        const allocatedNos = [];
        for (const po of unpaidPurchases) {
          if (remainingToApply <= 0) break;
          const applyAmt = Math.min(po.balance_due, remainingToApply);
          const newPaid = po.amount_paid + applyAmt;
          const newDue = Math.max(0, po.balance_due - applyAmt);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

          db.prepare('UPDATE purchases SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, po.id);

          allocatedNos.push(po.purchase_order_no);
          remainingToApply -= applyAmt;
        }

        if (allocatedNos.length > 0) {
          allocatedPoNo = allocatedNos.join(', ');
        }
      }

      // Insert payment record
      const insertInfo = db.prepare(`
        INSERT INTO payments (
          party_type, party_id, reference_type, reference_id, method,
          amount, date_ad, date_bs, reference_number, invoice_no, notes, received_by
        ) VALUES (
          'SUPPLIER', ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        supplier.id,
        referenceType,
        referenceId,
        method,
        payAmt,
        adDateStr,
        payDateBs,
        referenceNumber || null,
        allocatedPoNo || null,
        notes || `Payment made to ${supplier.name}`,
        userId
      );

      newPaymentId = insertInfo.lastInsertRowid;

      // If method is cash, update cash payouts in active drawer session
      if (method === 'CASH') {
        const activeSession = db.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
        if (activeSession) {
          db.prepare(`
            UPDATE cash_register_sessions 
            SET cash_payouts = cash_payouts + ?
            WHERE id = ?
          `).run(payAmt, activeSession.id);
        }
      }
    })();

    const paymentRecord = db.prepare(`
      SELECT p.*, u.full_name as paid_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.id = ?
    `).get(newPaymentId);

    res.json({
      success: true,
      message: 'Supplier payment recorded and ledger updated',
      paymentId: newPaymentId,
      voucher_no: `PV-${String(newPaymentId).padStart(5, '0')}`,
      payment: paymentRecord,
      previous_balance: Number(supplierBalanceBefore.toFixed(2)),
      current_balance: Number(supplierBalanceAfter.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST reverse/adjust supplier payment voucher (अडिट योग्य भुक्तानी उल्टो)
router.post('/:id/payment/:paymentId/reverse', (req, res) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    const origPayment = db.prepare("SELECT * FROM payments WHERE id = ? AND party_id = ? AND party_type = 'SUPPLIER'")
      .get(req.params.paymentId, supplier.id);
    if (!origPayment) return res.status(404).json({ success: false, error: 'Supplier payment voucher not found' });

    if (origPayment.is_reversal === 1) {
      return res.status(400).json({ success: false, error: 'Cannot reverse an already adjusted/reversal voucher' });
    }
    if (origPayment.is_reversal === 2) {
      return res.status(400).json({ success: false, error: 'This payment voucher has already been reversed' });
    }

    const { reason = 'Audit reversal by authorized user', userId = 1 } = req.body;
    const todayBs = getTodayBs();
    let adDateStr;
    try {
      adDateStr = bsToAd(todayBs).adDateStr;
    } catch {
      adDateStr = new Date().toISOString().split('T')[0];
    }

    db.transaction(() => {
      // If payment was tied to a purchase, reverse the purchase amount_paid and balance_due
      if (origPayment.reference_type === 'PURCHASE' && origPayment.reference_id) {
        const purchase = db.prepare('SELECT id, total_amount, amount_paid, balance_due FROM purchases WHERE id = ?')
          .get(origPayment.reference_id);

        if (purchase) {
          const restoredPaid = Math.max(0, purchase.amount_paid - origPayment.amount);
          const restoredDue = Math.min(purchase.total_amount, purchase.balance_due + origPayment.amount);
          const restoredStatus = restoredDue <= 0 ? 'PAID' : (restoredPaid > 0 ? 'PARTIAL' : 'UNPAID');

          db.prepare('UPDATE purchases SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(restoredPaid, restoredDue, restoredStatus, purchase.id);
        }
      }

      // Mark original voucher as reversed (2)
      db.prepare('UPDATE payments SET is_reversal = 2 WHERE id = ?').run(origPayment.id);

      // Create reversing entry (negative amount, is_reversal = 1)
      db.prepare(`
        INSERT INTO payments (
          party_type, party_id, reference_type, reference_id, method,
          amount, date_ad, date_bs, reference_number, invoice_no, is_reversal, reversed_payment_id, notes, received_by
        ) VALUES (
          'SUPPLIER', ?, ?, ?, ?,
          ?, ?, ?, ?, ?, 1, ?, ?, ?
        )
      `).run(
        supplier.id,
        origPayment.reference_type,
        origPayment.reference_id,
        origPayment.method,
        -Math.abs(origPayment.amount),
        adDateStr,
        todayBs,
        `REV-#${origPayment.id}`,
        origPayment.invoice_no,
        origPayment.id,
        `REVERSAL: ${reason}`,
        userId
      );
    })();

    res.json({ success: true, message: 'Supplier payment voucher reversed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET payment voucher for printing (आपूर्तिकर्ता भुक्तानी खर्च भौचर)
router.get('/:id/payment/:paymentId/voucher', (req, res) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    const payment = db.prepare(`
      SELECT p.*, u.full_name as paid_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.id = ? AND p.party_id = ? AND p.party_type = 'SUPPLIER'
    `).get(req.params.paymentId, supplier.id);

    if (!payment) return res.status(404).json({ success: false, error: 'Payment voucher not found' });

    // Store settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const storeSettings = settingsRows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // Calculate supplier current balance and totals
    const purchases = db.prepare("SELECT total_amount FROM purchases WHERE supplier_id = ? AND status = 'RECEIVED'").all(supplier.id);
    const payments = db.prepare("SELECT amount FROM payments WHERE party_type = 'SUPPLIER' AND party_id = ?").all(supplier.id);
    const totalPurchased = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = supplier.opening_balance + totalPurchased - totalPaid;

    res.json({
      success: true,
      data: {
        voucher_no: `PV-${String(payment.id).padStart(5, '0')}`,
        payment_id: payment.id,
        date_bs: payment.date_bs,
        date_ad: payment.date_ad,
        method: payment.method,
        amount: payment.amount,
        reference_number: payment.reference_number,
        invoice_no: payment.invoice_no,
        notes: payment.notes,
        paid_by_name: payment.paid_by_name || 'Cashier / Accountant',
        is_reversal: payment.is_reversal,
        supplier: {
          id: supplier.id,
          supplier_code: supplier.supplier_code,
          name: supplier.name,
          company_name: supplier.company_name,
          phone: supplier.phone,
          address: supplier.address,
          pan_vat: supplier.pan_vat,
          current_balance: Number(currentBalance.toFixed(2))
        },
        store: {
          shop_name_en: storeSettings.shop_name_en || 'Shree Krishna Iron & Construction Materials',
          shop_name_np: storeSettings.shop_name_np || 'श्री कृष्ण फलाम तथा निर्माण सामग्री भण्डार',
          pan_number: storeSettings.pan_number || '304892716',
          ird_reg_no: storeSettings.ird_reg_no || 'IRD-KTM-2081-4491',
          address_en: storeSettings.address_en || 'Imadol Ring Road, Lalitpur, Nepal',
          address_np: storeSettings.address_np || 'इमाडोल चक्रपथ, ललितपुर, नेपाल',
          phone: storeSettings.phone || '+977-1-5201982, 9851087654',
          email: storeSettings.email || 'contact@shreekrishnairon.com.np'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
