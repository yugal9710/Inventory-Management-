const db = require('../db/database');
const { getTodayBs } = require('../utils/nepaliCalendar');

class ReportService {
  /**
   * Nepal IRD VAT Sales Register (Schedule 10 / अनुसूची १० - कर बिक्री खाता)
   */
  static getVatSalesRegister({ fromDateBs, toDateBs, fiscalYear }) {
    let sql = `
      SELECT 
        s.id,
        s.invoice_no,
        s.invoice_type,
        s.fiscal_year,
        s.date_bs,
        s.date_ad,
        s.customer_name,
        s.customer_pan,
        s.total_amount,
        s.non_taxable_amount as exempt_amount,
        s.taxable_amount,
        s.tax_amount as vat_amount,
        s.cbms_sync_status,
        s.cbms_sync_code
      FROM sales s
      WHERE s.status = 'ISSUED'
    `;
    const params = [];

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

    sql += ' ORDER BY s.date_bs ASC, s.id ASC';

    const records = db.prepare(sql).all(...params);

    // Calculate totals
    const totals = records.reduce((acc, r) => {
      acc.total_amount += r.total_amount;
      acc.exempt_amount += r.exempt_amount;
      acc.taxable_amount += r.taxable_amount;
      acc.vat_amount += r.vat_amount;
      return acc;
    }, { total_amount: 0, exempt_amount: 0, taxable_amount: 0, vat_amount: 0 });

    return { records, totals };
  }

  /**
   * Nepal IRD VAT Purchase Register (Schedule 9 / अनुसूची ९ - कर खरिद खाता)
   */
  static getVatPurchaseRegister({ fromDateBs, toDateBs, fiscalYear }) {
    let sql = `
      SELECT 
        p.id,
        p.supplier_invoice_no,
        p.purchase_order_no,
        p.fiscal_year,
        p.date_bs,
        p.date_ad,
        s.name as supplier_name,
        s.pan_vat as supplier_pan,
        p.total_amount,
        (p.total_amount - p.taxable_amount - p.tax_amount) as exempt_amount,
        p.taxable_amount,
        p.tax_amount as vat_amount,
        p.freight_amount,
        p.unloading_charge
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = 'RECEIVED'
    `;
    const params = [];

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

    sql += ' ORDER BY p.date_bs ASC, p.id ASC';

    const records = db.prepare(sql).all(...params);

    const totals = records.reduce((acc, r) => {
      acc.total_amount += r.total_amount;
      acc.exempt_amount += r.exempt_amount;
      acc.taxable_amount += r.taxable_amount;
      acc.vat_amount += r.vat_amount;
      return acc;
    }, { total_amount: 0, exempt_amount: 0, taxable_amount: 0, vat_amount: 0 });

    return { records, totals };
  }

  /**
   * Stock on Hand & Inventory Valuation
   */
  static getStockValuationReport() {
    const sql = `
      SELECT 
        p.id,
        p.code,
        p.name_en,
        p.name_np,
        p.category,
        p.brand,
        p.grade,
        p.size,
        p.base_unit,
        p.reorder_level,
        p.cost_price,
        p.selling_price,
        COALESCE(SUM(sl.base_quantity), 0) as current_stock,
        COALESCE(SUM(sl.base_quantity), 0) * p.cost_price as total_cost_value,
        COALESCE(SUM(sl.base_quantity), 0) * p.selling_price as total_sales_value
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.category ASC, p.name_en ASC
    `;

    const items = db.prepare(sql).all();

    const summary = items.reduce((acc, item) => {
      acc.total_items += 1;
      acc.total_cost_valuation += item.total_cost_value;
      acc.total_sales_valuation += item.total_sales_value;
      if (item.current_stock <= item.reorder_level) {
        acc.low_stock_count += 1;
      }
      return acc;
    }, { total_items: 0, total_cost_valuation: 0, total_sales_valuation: 0, low_stock_count: 0 });

    return { items, summary };
  }

  /**
   * Sales Profit & Margin Analysis
   */
  static getProfitMarginReport({ fromDateBs, toDateBs }) {
    let sql = `
      SELECT 
        p.id as product_id,
        p.code,
        p.name_en,
        p.category,
        p.base_unit,
        SUM(sl.quantity) as sold_quantity,
        SUM(sl.line_total) as total_revenue,
        SUM(sl.base_quantity * p.cost_price) as total_cogs,
        (SUM(sl.line_total) - SUM(sl.base_quantity * p.cost_price)) as gross_profit,
        ROUND(((SUM(sl.line_total) - SUM(sl.base_quantity * p.cost_price)) / NULLIF(SUM(sl.line_total), 0)) * 100, 2) as margin_pct
      FROM sale_lines sl
      JOIN sales s ON sl.sale_id = s.id
      JOIN products p ON sl.product_id = p.id
      WHERE s.status = 'ISSUED'
    `;
    const params = [];

    if (fromDateBs) {
      sql += ' AND s.date_bs >= ?';
      params.push(fromDateBs);
    }
    if (toDateBs) {
      sql += ' AND s.date_bs <= ?';
      params.push(toDateBs);
    }

    sql += ' GROUP BY p.id ORDER BY gross_profit DESC';

    const items = db.prepare(sql).all(...params);

    const summary = items.reduce((acc, r) => {
      acc.total_revenue += r.total_revenue;
      acc.total_cogs += r.total_cogs;
      acc.total_profit += r.gross_profit;
      return acc;
    }, { total_revenue: 0, total_cogs: 0, total_profit: 0 });

    summary.overall_margin_pct = summary.total_revenue > 0
      ? Number(((summary.total_profit / summary.total_revenue) * 100).toFixed(2))
      : 0;

    return { items, summary };
  }

  /**
   * Customer Credit Khata & Aging
   */
  static getCustomerAgingReport() {
    const customers = db.prepare(`
      SELECT 
        c.*,
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE customer_id = c.id AND status = 'ISSUED'), 0) as total_invoiced,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'CUSTOMER' AND party_id = c.id), 0) as total_paid
      FROM customers c
      WHERE c.active = 1
      ORDER BY c.name ASC
    `).all();

    const list = customers.map(c => {
      const balance = c.opening_balance + c.total_invoiced - c.total_paid;
      const isOverdue = c.credit_limit > 0 && balance > c.credit_limit;
      return {
        ...c,
        balance_due: balance,
        is_overdue: isOverdue,
        available_credit: Math.max(0, c.credit_limit - balance)
      };
    });

    const totalReceivable = list.reduce((sum, c) => sum + (c.balance_due > 0 ? c.balance_due : 0), 0);

    return { customers: list, totalReceivable };
  }

  /**
   * Dashboard Overview Statistics
   */
  static getDashboardSummary() {
    const todayBs = getTodayBs();

    // Today's Sales
    const todaySales = db.prepare(`
      SELECT 
        COALESCE(COUNT(*), 0) as invoice_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(amount_paid), 0) as cash_collected,
        COALESCE(SUM(balance_due), 0) as credit_issued
      FROM sales 
      WHERE date_bs = ? AND status = 'ISSUED'
    `).get(todayBs);

    // Active Cash in Drawer (from open session)
    const activeSession = db.prepare(`
      SELECT * FROM cash_register_sessions 
      WHERE status = 'OPEN' 
      ORDER BY id DESC LIMIT 1
    `).get();

    // Low Stock Items Count
    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT p.id, p.reorder_level, COALESCE(SUM(sl.base_quantity), 0) as stock
        FROM products p
        LEFT JOIN stock_ledger sl ON p.id = sl.product_id
        WHERE p.active = 1
        GROUP BY p.id
        HAVING stock <= p.reorder_level
      )
    `).get().count;

    // Total Customer Outstanding Khata Balance
    const totalKhata = db.prepare(`
      SELECT 
        COALESCE(SUM(balance_due), 0) as total_receivable
      FROM sales
      WHERE status = 'ISSUED' AND balance_due > 0
    `).get().total_receivable;

    // Total Supplier Balance Due
    const totalPayables = db.prepare(`
      SELECT 
        COALESCE(SUM(balance_due), 0) as total_payable
      FROM purchases
      WHERE status = 'RECEIVED' AND balance_due > 0
    `).get().total_payable;

    // Available Cut Remnants Count
    const remnantsCount = db.prepare(`
      SELECT COUNT(*) as count FROM remnants WHERE status = 'available'
    `).get().count;

    return {
      todayBs,
      todaySales,
      activeSession,
      lowStockCount,
      totalKhataReceivable: totalKhata,
      totalSupplierPayables: totalPayables,
      remnantsCount
    };
  }
}

module.exports = ReportService;
