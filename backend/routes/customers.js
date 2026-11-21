const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

// Helper to generate the next unique customer code (e.g. CUST-0019)
function generateNextCustomerCode(prefix = 'CUST-') {
  try {
    const customers = db.prepare("SELECT customer_code FROM customers WHERE customer_code IS NOT NULL AND customer_code != ''").all();
    let maxSeq = 0;
    const cleanPrefix = prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`^${cleanPrefix}(\\d+)$`, 'i');
    for (const c of customers) {
      if (c.customer_code) {
        const match = c.customer_code.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    }

    if (maxSeq === 0) {
      const maxIdRow = db.prepare('SELECT MAX(id) as max_id FROM customers').get();
      maxSeq = (maxIdRow && maxIdRow.max_id) ? maxIdRow.max_id : 0;
    }

    let nextNum = maxSeq + 1;
    let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
    while (db.prepare('SELECT id FROM customers WHERE customer_code = ?').get(candidate)) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
  } catch (e) {
    return `CUST-${Date.now().toString().slice(-4)}`;
  }
}

// GET next available unique customer code
router.get('/next-code', (req, res) => {
  try {
    const prefix = req.query.prefix || 'CUST-';
    const nextCode = generateNextCustomerCode(prefix);
    res.json({ success: true, nextCode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.pan_vat LIKE ? OR c.customer_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
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
    const {
      customer_code,
      name,
      phone,
      secondary_phone,
      email,
      contact_person,
      customer_type = 'Contractor',
      address,
      permanent_address,
      temporary_address,
      location_meta,
      pan_vat,
      credit_limit = 0,
      payment_terms_days = 30,
      opening_balance = 0,
      notes
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Customer name is required' });

    // Validate or auto-generate unique customer code
    let finalCode = (customer_code || '').trim().toUpperCase();
    if (!finalCode) {
      finalCode = generateNextCustomerCode('CUST-');
    } else {
      const existing = db.prepare('SELECT id, name FROM customers WHERE customer_code = ?').get(finalCode);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Customer Code "${finalCode}" is already assigned to "${existing.name}". Please use a unique code.`
        });
      }
    }

    // Primary address fallback
    const resolvedAddress = address || temporary_address || permanent_address || null;
    const metaStr = typeof location_meta === 'object' ? JSON.stringify(location_meta) : (location_meta || null);

    const insert = db.prepare(`
      INSERT INTO customers (
        customer_code, name, phone, secondary_phone, email, contact_person, customer_type,
        address, permanent_address, temporary_address, location_meta,
        pan_vat, credit_limit, payment_terms_days, opening_balance, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      finalCode,
      name,
      phone || null,
      secondary_phone || null,
      email || null,
      contact_person || null,
      customer_type || 'Contractor',
      resolvedAddress,
      permanent_address || null,
      temporary_address || null,
      metaStr,
      pan_vat || null,
      Number(credit_limit || 0),
      Number(payment_terms_days || 30),
      Number(opening_balance || 0),
      notes || null
    );

    res.json({
      success: true,
      customerId: result.lastInsertRowid,
      customer_code: finalCode,
      message: 'Customer created successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update customer
router.put('/:id', (req, res) => {
  try {
    const {
      customer_code,
      name,
      phone,
      secondary_phone,
      email,
      contact_person,
      customer_type = 'Contractor',
      address,
      permanent_address,
      temporary_address,
      location_meta,
      pan_vat,
      credit_limit,
      payment_terms_days,
      notes,
      active
    } = req.body;

    let finalCode = (customer_code || '').trim().toUpperCase();
    if (finalCode) {
      const existing = db.prepare('SELECT id, name FROM customers WHERE customer_code = ? AND id != ?').get(finalCode, req.params.id);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Customer Code "${finalCode}" is already in use by "${existing.name}".`
        });
      }
    } else {
      const current = db.prepare('SELECT customer_code FROM customers WHERE id = ?').get(req.params.id);
      finalCode = current?.customer_code || generateNextCustomerCode('CUST-');
    }

    const resolvedAddress = address || temporary_address || permanent_address || null;
    const metaStr = typeof location_meta === 'object' ? JSON.stringify(location_meta) : (location_meta || null);

    const update = db.prepare(`
      UPDATE customers SET
        customer_code = @customer_code,
        name = @name,
        phone = @phone,
        secondary_phone = @secondary_phone,
        email = @email,
        contact_person = @contact_person,
        customer_type = @customer_type,
        address = @address,
        permanent_address = @permanent_address,
        temporary_address = @temporary_address,
        location_meta = @location_meta,
        pan_vat = @pan_vat,
        credit_limit = @credit_limit,
        payment_terms_days = @payment_terms_days,
        notes = @notes,
        active = @active
      WHERE id = @id
    `);

    update.run({
      id: req.params.id,
      customer_code: finalCode,
      name,
      phone: phone || null,
      secondary_phone: secondary_phone || null,
      email: email || null,
      contact_person: contact_person || null,
      customer_type: customer_type || 'Contractor',
      address: resolvedAddress,
      permanent_address: permanent_address || null,
      temporary_address: temporary_address || null,
      location_meta: metaStr,
      pan_vat: pan_vat || null,
      credit_limit: Number(credit_limit || 0),
      payment_terms_days: Number(payment_terms_days || 30),
      notes: notes || null,
      active: active !== undefined ? (active ? 1 : 0) : 1
    });

    res.json({ success: true, customer_code: finalCode, message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record customer payment on account (जम्मा भौचर)
router.post('/:id/payment', (req, res) => {
  try {
    const {
      amount,
      date_bs,
      method = 'CASH',
      referenceNumber = '',
      invoice_id,
      notes = '',
      userId = 1
    } = req.body;

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

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
    let customerBalanceBefore = 0;
    let customerBalanceAfter = 0;

    // Calculate balances
    const invoicesBefore = db.prepare('SELECT total_amount FROM sales WHERE customer_id = ?').all(customer.id);
    const paymentsBefore = db.prepare("SELECT amount FROM payments WHERE party_type = 'CUSTOMER' AND party_id = ?").all(customer.id);
    const totalInvoicedBefore = invoicesBefore.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaidBefore = paymentsBefore.reduce((sum, p) => sum + p.amount, 0);
    customerBalanceBefore = customer.opening_balance + totalInvoicedBefore - totalPaidBefore;
    customerBalanceAfter = customerBalanceBefore - payAmt;

    db.transaction(() => {
      let allocatedInvoiceNo = null;
      let referenceType = 'ON_ACCOUNT';
      let referenceId = 0;

      // Case 1: Specific Invoice Allocation Requested
      if (invoice_id && Number(invoice_id) > 0) {
        const targetInv = db.prepare('SELECT id, invoice_no, balance_due, amount_paid FROM sales WHERE id = ? AND customer_id = ?')
          .get(Number(invoice_id), customer.id);

        if (targetInv) {
          referenceType = 'SALE';
          referenceId = targetInv.id;
          allocatedInvoiceNo = targetInv.invoice_no;

          // Allocate payment up to remaining balance
          const applyAmt = Math.min(targetInv.balance_due, payAmt);
          const newPaid = targetInv.amount_paid + applyAmt;
          const newDue = Math.max(0, targetInv.balance_due - applyAmt);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

          db.prepare('UPDATE sales SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, targetInv.id);
        }
      } else {
        // Case 2: General / Oldest First Allocation
        let remainingToApply = payAmt;
        const unpaidInvoices = db.prepare(`
          SELECT id, invoice_no, balance_due, amount_paid FROM sales 
          WHERE customer_id = ? AND balance_due > 0 
          ORDER BY id ASC
        `).all(customer.id);

        const allocatedNos = [];
        for (const inv of unpaidInvoices) {
          if (remainingToApply <= 0) break;
          const applyAmt = Math.min(inv.balance_due, remainingToApply);
          const newPaid = inv.amount_paid + applyAmt;
          const newDue = Math.max(0, inv.balance_due - applyAmt);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

          db.prepare('UPDATE sales SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, inv.id);

          allocatedNos.push(inv.invoice_no);
          remainingToApply -= applyAmt;
        }

        if (allocatedNos.length > 0) {
          allocatedInvoiceNo = allocatedNos.join(', ');
        }
      }

      // Insert payment record
      const insertInfo = db.prepare(`
        INSERT INTO payments (
          party_type, party_id, reference_type, reference_id, method,
          amount, date_ad, date_bs, reference_number, invoice_no, notes, received_by
        ) VALUES (
          'CUSTOMER', ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        customer.id,
        referenceType,
        referenceId,
        method,
        payAmt,
        adDateStr,
        payDateBs,
        referenceNumber || null,
        allocatedInvoiceNo || null,
        notes || `Khata payment received from ${customer.name}`,
        userId
      );

      newPaymentId = insertInfo.lastInsertRowid;

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
    })();

    const paymentRecord = db.prepare(`
      SELECT p.*, u.full_name as received_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.id = ?
    `).get(newPaymentId);

    res.json({
      success: true,
      message: 'Payment recorded and Khata updated',
      paymentId: newPaymentId,
      receipt_no: `VCH-${String(newPaymentId).padStart(5, '0')}`,
      payment: paymentRecord,
      previous_balance: Number(customerBalanceBefore.toFixed(2)),
      current_balance: Number(customerBalanceAfter.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET payment receipt for printing (भुक्तानी जम्मा रसिद)
router.get('/:id/payment/:paymentId/receipt', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const payment = db.prepare(`
      SELECT p.*, u.full_name as received_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.id = ? AND p.party_id = ? AND p.party_type = 'CUSTOMER'
    `).get(req.params.paymentId, customer.id);

    if (!payment) return res.status(404).json({ success: false, error: 'Payment voucher not found' });

    // Store settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const storeSettings = settingsRows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // Calculate customer current balance and totals
    const invoices = db.prepare('SELECT total_amount FROM sales WHERE customer_id = ?').all(customer.id);
    const payments = db.prepare("SELECT amount FROM payments WHERE party_type = 'CUSTOMER' AND party_id = ?").all(customer.id);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = customer.opening_balance + totalInvoiced - totalPaid;

    res.json({
      success: true,
      data: {
        receipt_no: `VCH-${String(payment.id).padStart(5, '0')}`,
        voucher_id: payment.id,
        date_bs: payment.date_bs,
        date_ad: payment.date_ad,
        method: payment.method,
        amount: payment.amount,
        reference_number: payment.reference_number,
        invoice_no: payment.invoice_no,
        notes: payment.notes,
        received_by_name: payment.received_by_name || 'Cashier',
        is_reversal: payment.is_reversal,
        customer: {
          id: customer.id,
          customer_code: customer.customer_code,
          name: customer.name,
          phone: customer.phone,
          address: customer.address || customer.temporary_address || customer.permanent_address,
          pan_vat: customer.pan_vat,
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

// POST reverse/adjust customer payment voucher (अडिट योग्य उल्टो/रद्द भौचर)
router.post('/:id/payment/:paymentId/reverse', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const origPayment = db.prepare("SELECT * FROM payments WHERE id = ? AND party_id = ? AND party_type = 'CUSTOMER'")
      .get(req.params.paymentId, customer.id);
    if (!origPayment) return res.status(404).json({ success: false, error: 'Payment voucher not found' });

    if (origPayment.is_reversal === 1) {
      return res.status(400).json({ success: false, error: 'Cannot reverse an already adjusted/reversal voucher' });
    }

    const alreadyReversed = db.prepare('SELECT id FROM payments WHERE reversed_payment_id = ?').get(origPayment.id);
    if (alreadyReversed) {
      return res.status(400).json({ success: false, error: 'This payment voucher has already been reversed' });
    }

    const { reason = '' } = req.body;
    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    db.transaction(() => {
      // 1. Insert compensatory reversal entry with negative amount
      db.prepare(`
        INSERT INTO payments (
          party_type, party_id, reference_type, reference_id, method,
          amount, date_ad, date_bs, reference_number, invoice_no, notes,
          is_reversal, reversed_payment_id, received_by
        ) VALUES (
          'CUSTOMER', ?, 'ON_ACCOUNT', ?, ?,
          ?, ?, ?, ?, ?, ?,
          1, ?, ?
        )
      `).run(
        customer.id,
        origPayment.id,
        origPayment.method,
        -origPayment.amount,
        adDateStr,
        todayBs,
        `REV-${origPayment.id}`,
        origPayment.invoice_no || null,
        `[REVERSAL/रद्द भौचर #${origPayment.id}]: ${reason || 'Reversed by authorized user'}`,
        origPayment.id,
        req.body.userId || 1
      );

      // 2. Mark original payment as reversed
      db.prepare('UPDATE payments SET is_reversal = 2 WHERE id = ?').run(origPayment.id);

      // 3. Restore invoice balances
      if (origPayment.reference_id && origPayment.reference_type === 'SALE') {
        const inv = db.prepare('SELECT * FROM sales WHERE id = ?').get(origPayment.reference_id);
        if (inv) {
          const restoredPaid = Math.max(0, inv.amount_paid - origPayment.amount);
          const restoredDue = inv.total_amount - restoredPaid;
          const restoredStatus = restoredDue <= 0 ? 'PAID' : (restoredPaid > 0 ? 'PARTIAL' : 'UNPAID');
          db.prepare('UPDATE sales SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(restoredPaid, restoredDue, restoredStatus, inv.id);
        }
      } else {
        let remainingToRestore = origPayment.amount;
        const paidInvoices = db.prepare(`
          SELECT id, total_amount, balance_due, amount_paid FROM sales 
          WHERE customer_id = ? AND amount_paid > 0 
          ORDER BY id DESC
        `).all(customer.id);

        for (const inv of paidInvoices) {
          if (remainingToRestore <= 0) break;
          const restoreAmt = Math.min(inv.amount_paid, remainingToRestore);
          const newPaid = inv.amount_paid - restoreAmt;
          const newDue = inv.balance_due + restoreAmt;
          const newStatus = newDue <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');
          db.prepare('UPDATE sales SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, inv.id);
          remainingToRestore -= restoreAmt;
        }
      }

      // 4. Adjust cash drawer if cash
      if (origPayment.method === 'CASH') {
        const activeSession = db.prepare("SELECT id, cash_receipts FROM cash_register_sessions WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
        if (activeSession) {
          db.prepare('UPDATE cash_register_sessions SET cash_receipts = MAX(0, cash_receipts - ?) WHERE id = ?')
            .run(origPayment.amount, activeSession.id);
        }
      }
    })();

    res.json({ success: true, message: 'Payment voucher reversed and audit adjustment entry recorded' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
