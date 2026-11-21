const db = require('../db/database');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');
const { numberToWordsEn, numberToWordsNp, formatNpr } = require('../utils/nepaliNumberToWords');
const StockService = require('./stockService');

class InvoiceService {
  /**
   * Generates next sequential invoice number for the active fiscal year
   */
  static getNextInvoiceNumber(tx = null) {
    const runner = tx || db;
    const fySetting = runner.prepare("SELECT value FROM settings WHERE key = 'active_fiscal_year'").get();
    const prefixSetting = runner.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
    const seqSetting = runner.prepare("SELECT value FROM settings WHERE key = 'invoice_seq'").get();

    const fiscalYear = fySetting ? fySetting.value : '2081/82';
    const prefix = prefixSetting ? prefixSetting.value : 'TI';
    let seq = parseInt(seqSetting ? seqSetting.value : '1', 10);

    // Format: TI-8182-0001 (using FY digits)
    const fyClean = fiscalYear.replace('/', '');
    const paddedSeq = String(seq).padStart(4, '0');
    const invoiceNo = `${prefix}-${fyClean}-${paddedSeq}`;

    // Increment sequence in settings
    runner.prepare("UPDATE settings SET value = ? WHERE key = 'invoice_seq'").run(String(seq + 1));

    return { invoiceNo, fiscalYear };
  }

  /**
   * Generates next Credit Note number for returns
   */
  static getNextCreditNoteNumber(tx = null) {
    const runner = tx || db;
    const fySetting = runner.prepare("SELECT value FROM settings WHERE key = 'active_fiscal_year'").get();
    const seqSetting = runner.prepare("SELECT value FROM settings WHERE key = 'credit_note_seq'").get();

    const fiscalYear = fySetting ? fySetting.value : '2081/82';
    let seq = parseInt(seqSetting ? seqSetting.value : '1', 10);
    const fyClean = fiscalYear.replace('/', '');
    const paddedSeq = String(seq).padStart(4, '0');
    const creditNoteNo = `CN-${fyClean}-${paddedSeq}`;

    runner.prepare("UPDATE settings SET value = ? WHERE key = 'credit_note_seq'").run(String(seq + 1));
    return { creditNoteNo, fiscalYear };
  }

  /**
   * Creates an official sale invoice with line items, stock ledger updates, and payments
   */
  static createSale({
    invoiceType = 'TAX_INVOICE',
    customerId = null,
    customerName,
    customerPan = '',
    customerPhone = '',
    customerAddress = '',
    dateBs = null,
    items = [], // [{ productId, locationId, quantity, unit, unitPrice, discountPercent, isCutLength, cutLengthMeters, remnantCondition }]
    overallDiscount = 0,
    payments = [], // [{ method, amount, referenceNumber }]
    isDeliveryChallan = 0,
    notes = '',
    userId = 1
  }) {
    const todayBs = dateBs || getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    // Execute atomic transaction
    return db.transaction(() => {
      // 1. Get next invoice number
      const { invoiceNo, fiscalYear } = this.getNextInvoiceNumber(db);

      // 2. Calculate item totals and tax segregation
      let subtotal = 0;
      let totalItemDiscount = 0;
      let taxableAmount = 0;
      let nonTaxableAmount = 0;
      let totalVat = 0;

      const processedLines = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        if (!product) throw new Error(`Product ID ${item.productId} not found`);

        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Quantity for "${product.name_en}" must be a positive number greater than 0.`);
        }
        const rate = Number(item.unitPrice || product.selling_price);
        const lineGross = qty * rate;
        const discountPct = Number(item.discountPercent || 0);
        const discountAmt = (lineGross * discountPct) / 100;
        const lineNet = lineGross - discountAmt;

        subtotal += lineGross;
        totalItemDiscount += discountAmt;

        // Base unit conversion for stock ledger
        const { baseQuantity } = StockService.convertToBaseQuantity(product, qty, item.unit);

        // Strict Stock Check: Do not allow a sale if requested quantity is greater than the available store stock
        const stockRow = StockService.getStockBalance(product.id, item.locationId || null);
        const availableStock = stockRow ? Number(stockRow.current_stock_base || 0) : 0;
        if (baseQuantity > availableStock) {
          throw new Error(
            `Sale not allowed: Requested quantity for "${product.name_en}" (${qty} ${item.unit || product.base_unit}) is greater than available store stock (${availableStock} ${product.base_unit}).`
          );
        }

        let taxAmount = 0;
        if (product.tax_category === 'VAT_13') {
          taxableAmount += lineNet;
          taxAmount = Number((lineNet * 0.13).toFixed(2));
          totalVat += taxAmount;
        } else {
          nonTaxableAmount += lineNet;
        }

        processedLines.push({
          productId: product.id,
          locationId: item.locationId || 1,
          quantity: qty,
          unit: item.unit || product.base_unit,
          baseQuantity,
          unitPrice: rate,
          discountPercent: discountPct,
          discountAmount: discountAmt,
          lineTotal: lineNet,
          taxCategory: product.tax_category || 'VAT_13',
          taxAmount,
          isCutLength: item.isCutLength ? 1 : 0,
          cutLengthMeters: Number(item.cutLengthMeters || 0),
          remnantCondition: item.remnantCondition || 'usable',
          costPrice: product.cost_price || 0
        });
      }

      // Apply overall discount proportionally if provided
      const finalDiscount = totalItemDiscount + Number(overallDiscount || 0);
      const totalAmount = Number((subtotal - finalDiscount + totalVat).toFixed(2));

      // Calculate paid amount
      let amountPaid = 0;
      for (const p of payments) {
        amountPaid += Number(p.amount || 0);
      }
      amountPaid = Number(amountPaid.toFixed(2));
      const balanceDue = Number((totalAmount - amountPaid).toFixed(2));

      let paymentStatus = 'PAID';
      if (balanceDue > 0 && amountPaid > 0) paymentStatus = 'PARTIAL';
      else if (balanceDue > 0 && amountPaid === 0) paymentStatus = 'UNPAID';

      // 3. Insert sale header
      const insertSaleStmt = db.prepare(`
        INSERT INTO sales (
          invoice_no, invoice_type, fiscal_year, customer_id, customer_name,
          customer_pan, customer_phone, customer_address, date_ad, date_bs,
          status, subtotal, discount, taxable_amount, non_taxable_amount,
          tax_amount, total_amount, amount_paid, balance_due, payment_status,
          is_delivery_challan, delivery_status, cbms_sync_status, notes, created_by
        ) VALUES (
          @invoice_no, @invoice_type, @fiscal_year, @customer_id, @customer_name,
          @customer_pan, @customer_phone, @customer_address, @date_ad, @date_bs,
          'ISSUED', @subtotal, @discount, @taxable_amount, @non_taxable_amount,
          @tax_amount, @total_amount, @amount_paid, @balance_due, @payment_status,
          @is_delivery_challan, 'DELIVERED', 'PENDING', @notes, @created_by
        )
      `);

      const saleResult = insertSaleStmt.run({
        invoice_no: invoiceNo,
        invoice_type: invoiceType,
        fiscal_year: fiscalYear,
        customer_id: customerId || null,
        customer_name: customerName || 'Cash Customer / सामान्य ग्राहक',
        customer_pan: customerPan || '',
        customer_phone: customerPhone || '',
        customer_address: customerAddress || '',
        date_ad: adDateStr,
        date_bs: todayBs,
        subtotal,
        discount: finalDiscount,
        taxable_amount: taxableAmount,
        non_taxable_amount: nonTaxableAmount,
        tax_amount: totalVat,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        is_delivery_challan: isDeliveryChallan ? 1 : 0,
        notes,
        created_by: userId
      });

      const saleId = saleResult.lastInsertRowid;

      // 4. Insert sale lines and record stock ledger movements
      const insertLineStmt = db.prepare(`
        INSERT INTO sale_lines (
          sale_id, product_id, location_id, quantity, unit, base_quantity,
          unit_price, discount_percent, discount_amount, line_total,
          tax_category, tax_amount, is_cut_length, cut_length_meters, remnant_id
        ) VALUES (
          @sale_id, @product_id, @location_id, @quantity, @unit, @base_quantity,
          @unit_price, @discount_percent, @discount_amount, @line_total,
          @tax_category, @tax_amount, @is_cut_length, @cut_length_meters, @remnant_id
        )
      `);

      for (const line of processedLines) {
        let remnantId = null;

        // If it's a cut-length sale, handle cut piece remnant
        if (line.isCutLength && line.cutLengthMeters > 0) {
          const cutRes = StockService.recordCutLengthSale({
            productId: line.productId,
            locationId: line.locationId,
            cutLengthMeters: line.cutLengthMeters,
            saleId,
            userId,
            remnantCondition: line.remnantCondition
          }, db);
          remnantId = cutRes.remnantId;
        }

        insertLineStmt.run({
          sale_id: saleId,
          product_id: line.productId,
          location_id: line.locationId,
          quantity: line.quantity,
          unit: line.unit,
          base_quantity: line.baseQuantity,
          unit_price: line.unitPrice,
          discount_percent: line.discountPercent,
          discount_amount: line.discountAmount,
          line_total: line.lineTotal,
          tax_category: line.taxCategory,
          tax_amount: line.taxAmount,
          is_cut_length: line.isCutLength,
          cut_length_meters: line.cutLengthMeters || 0,
          remnant_id: remnantId
        });

        // Deduct inventory through Stock Movement Ledger (Single Source of Truth)
        StockService.recordMovement({
          product_id: line.productId,
          location_id: line.locationId,
          movement_type: 'SALE',
          quantity: line.quantity,
          unit: line.unit,
          base_quantity: -Math.abs(line.baseQuantity), // Negative for stock deduction
          unit_cost: line.costPrice,
          reference_type: 'SALE',
          reference_id: saleId,
          notes: `Sold via Invoice ${invoiceNo}`,
          user_id: userId,
          date_ad: adDateStr,
          date_bs: todayBs
        }, db);
      }

      // 5. Insert payments and update daily cash register
      if (payments && payments.length > 0) {
        const insertPaymentStmt = db.prepare(`
          INSERT INTO payments (
            party_type, party_id, reference_type, reference_id, method,
            amount, date_ad, date_bs, reference_number, notes, received_by
          ) VALUES (
            'CUSTOMER', @party_id, 'SALE', @reference_id, @method,
            @amount, @date_ad, @date_bs, @reference_number, @notes, @received_by
          )
        `);

        for (const p of payments) {
          const pAmt = Number(p.amount);
          if (pAmt > 0) {
            insertPaymentStmt.run({
              party_id: customerId || 0,
              reference_id: saleId,
              method: p.method,
              amount: pAmt,
              date_ad: adDateStr,
              date_bs: todayBs,
              reference_number: p.referenceNumber || '',
              notes: `Payment for Invoice ${invoiceNo}`,
              received_by: userId
            });

            // If cash payment, update active cash register session
            if (p.method === 'CASH') {
              const activeSession = db.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
              if (activeSession) {
                db.prepare(`
                  UPDATE cash_register_sessions 
                  SET cash_sales = cash_sales + ?
                  WHERE id = ?
                `).run(pAmt, activeSession.id);
              }
            }
          }
        }
      }

      // 6. Record Customer Khata Credit balance update if applicable
      if (customerId && balanceDue > 0) {
        // Customer bought on credit
        // Khata balance is derived from invoices and payments, but we can verify customer table
      }

      // Return complete sale object with Nepali amount in words
      return this.getSaleById(saleId, db);
    })();
  }

  /**
   * Fetches full invoice details for display / printing
   */
  static getSaleById(saleId, tx = null) {
    const runner = tx || db;
    const sale = runner.prepare(`
      SELECT s.*, u.full_name as created_by_name
      FROM sales s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `).get(saleId);

    if (!sale) return null;

    const lines = runner.prepare(`
      SELECT 
        sl.*,
        p.code as product_code,
        p.barcode,
        p.name_en as product_name,
        p.name_np as product_name_np,
        p.category,
        p.brand,
        p.grade,
        p.size,
        loc.name as location_name
      FROM sale_lines sl
      JOIN products p ON sl.product_id = p.id
      JOIN stock_locations loc ON sl.location_id = loc.id
      WHERE sl.sale_id = ?
    `).all(saleId);

    const payments = runner.prepare(`
      SELECT * FROM payments 
      WHERE reference_type = 'SALE' AND reference_id = ?
    `).all(saleId);

    const settingsRows = runner.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of settingsRows) settings[r.key] = r.value;

    return {
      ...sale,
      lines,
      payments,
      amountInWordsEn: numberToWordsEn(sale.total_amount),
      amountInWordsNp: numberToWordsNp(sale.total_amount),
      formattedTotal: formatNpr(sale.total_amount),
      store: settings
    };
  }

  /**
   * Process a Sales Return and issue an official IRD Credit Note
   */
  static processSaleReturn({
    saleId,
    returnLines, // [{ productId, locationId, quantity, unit, unitPrice, condition: 'RESALABLE'|'DAMAGED'|'SCRAP' }]
    reason,
    userId = 1
  }) {
    const todayBs = getTodayBs();
    const { adDateStr } = bsToAd(todayBs);

    return db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      if (!sale) throw new Error('Original sale invoice not found');

      const { creditNoteNo, fiscalYear } = this.getNextCreditNoteNumber(db);

      let subtotal = 0;
      let taxAmount = 0;

      const processedLines = [];
      for (const item of returnLines) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        const qty = Number(item.quantity);
        const rate = Number(item.unitPrice);
        const lineTotal = qty * rate;
        subtotal += lineTotal;

        const { baseQuantity } = StockService.convertToBaseQuantity(product, qty, item.unit);
        let lineTax = 0;
        if (product.tax_category === 'VAT_13') {
          lineTax = Number((lineTotal * 0.13).toFixed(2));
          taxAmount += lineTax;
        }

        processedLines.push({
          productId: product.id,
          locationId: item.locationId || 1,
          quantity: qty,
          unit: item.unit,
          baseQuantity,
          unitPrice: rate,
          lineTotal,
          condition: item.condition || 'RESALABLE',
          costPrice: product.cost_price || 0
        });
      }

      const totalAmount = Number((subtotal + taxAmount).toFixed(2));

      // Insert return record
      const insertReturn = db.prepare(`
        INSERT INTO returns (
          return_no, return_type, original_reference_type, original_reference_id,
          party_type, party_id, fiscal_year, date_ad, date_bs, reason,
          subtotal, tax_amount, total_amount, status, created_by
        ) VALUES (
          @return_no, 'SALE_RETURN', 'SALE', @saleId, 'CUSTOMER', @customerId,
          @fiscal_year, @date_ad, @date_bs, @reason, @subtotal, @tax_amount,
          @total_amount, 'APPROVED', @created_by
        )
      `);

      const returnRes = insertReturn.run({
        return_no: creditNoteNo,
        saleId,
        customerId: sale.customer_id || 0,
        fiscal_year: fiscalYear,
        date_ad: adDateStr,
        date_bs: todayBs,
        reason: reason || 'Goods returned by customer',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        created_by: userId
      });

      const returnId = returnRes.lastInsertRowid;

      // Insert return lines and adjust stock ledger
      const insertLine = db.prepare(`
        INSERT INTO return_lines (
          return_id, product_id, location_id, quantity, unit,
          base_quantity, unit_price, total_amount, condition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of processedLines) {
        insertLine.run(
          returnId, line.productId, line.locationId, line.quantity,
          line.unit, line.baseQuantity, line.unitPrice, line.lineTotal, line.condition
        );

        // If returned item is RESALABLE, restore inventory!
        // If DAMAGED or SCRAP, route to scrap inventory
        if (line.condition === 'RESALABLE') {
          StockService.recordMovement({
            product_id: line.productId,
            location_id: line.locationId,
            movement_type: 'SALE_RETURN',
            quantity: line.quantity,
            unit: line.unit,
            base_quantity: Math.abs(line.baseQuantity), // Positive to restore stock
            unit_cost: line.costPrice,
            reference_type: 'RETURN',
            reference_id: returnId,
            notes: `Return Credit Note ${creditNoteNo} (Ref Inv: ${sale.invoice_no})`,
            user_id: userId,
            date_ad: adDateStr,
            date_bs: todayBs
          }, db);
        } else {
          // Record as SCRAP
          StockService.recordMovement({
            product_id: line.productId,
            location_id: line.locationId,
            movement_type: 'SCRAP_DISCARD',
            quantity: line.quantity,
            unit: line.unit,
            base_quantity: 0, // Doesn't increase sellable stock
            unit_cost: line.costPrice,
            reference_type: 'RETURN',
            reference_id: returnId,
            notes: `Returned as ${line.condition} under ${creditNoteNo}`,
            user_id: userId,
            date_ad: adDateStr,
            date_bs: todayBs
          }, db);
        }
      }

      return {
        returnId,
        creditNoteNo,
        totalAmount,
        amountInWordsEn: numberToWordsEn(totalAmount),
        amountInWordsNp: numberToWordsNp(totalAmount)
      };
    })();
  }
}

module.exports = InvoiceService;
