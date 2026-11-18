const db = require('./database');

function initSchema() {
  db.exec(`
    -- Settings table for Store Profile, Fiscal Year, CBMS config, Tax defaults
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Nepal Fiscal Years (Shrawan to Ashadh)
    CREATE TABLE IF NOT EXISTS fiscal_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL, -- e.g. '2081/82'
      start_date_bs TEXT NOT NULL,
      end_date_bs TEXT NOT NULL,
      start_date_ad TEXT NOT NULL,
      end_date_ad TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User accounts with Roles (Owner/Admin, Cashier, Storekeeper, Accountant)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('super_admin', 'admin', 'cashier', 'storekeeper', 'accountant')) NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Warehouse / Yard Stock Locations
    CREATE TABLE IF NOT EXISTS stock_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_np TEXT,
      code TEXT UNIQUE NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products / Items Catalogue
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      barcode TEXT,
      name_en TEXT NOT NULL,
      name_np TEXT,
      category TEXT NOT NULL, -- 'TMT Rebar', 'Pipes & Hollow Sections', 'Corrugated & Plain Sheets', 'Angles & Channels', 'Wire & Nails', 'Hardware & Tools', 'Cement'
      grade TEXT, -- 'Fe500D', 'Fe500', 'Class B', 'Commercial', '43 Grade'
      brand TEXT, -- 'Jagdamba', 'Panchakanya', 'Hulas', 'Aarti', 'Shivam'
      size TEXT, -- '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm', '2" x 2mm', '0.40mm'
      base_unit TEXT NOT NULL, -- 'kg', 'piece', 'meter', 'sheet', 'bundle'
      selling_units TEXT NOT NULL, -- JSON array e.g. ["kg", "piece", "bundle"]
      unit_conversions TEXT NOT NULL, -- JSON e.g. {"kg_per_piece": 10.65, "meter_per_piece": 12.0, "pieces_per_bundle": 5, "kg_per_meter": 0.888}
      tax_category TEXT CHECK(tax_category IN ('VAT_13', 'EXEMPT', 'ZERO')) DEFAULT 'VAT_13',
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      reorder_level REAL DEFAULT 10,
      allows_cutting INTEGER DEFAULT 0,
      standard_length REAL DEFAULT 12, -- in meters (for cut-length sales)
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cut-off remnants & offcut inventory
    CREATE TABLE IF NOT EXISTS remnants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      location_id INTEGER NOT NULL REFERENCES stock_locations(id),
      length_meters REAL NOT NULL,
      quantity INTEGER DEFAULT 1,
      condition TEXT CHECK(condition IN ('usable', 'scrap')) DEFAULT 'usable',
      notes TEXT,
      status TEXT CHECK(status IN ('available', 'sold', 'discarded')) DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock Movement Ledger (The absolute Single Source of Truth for inventory)
    CREATE TABLE IF NOT EXISTS stock_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      location_id INTEGER NOT NULL REFERENCES stock_locations(id),
      movement_type TEXT CHECK(movement_type IN (
        'PURCHASE_RECEIPT',
        'PURCHASE_RETURN',
        'SALE',
        'SALE_RETURN',
        'CUT_DISPATCH',
        'CUT_REMNANT',
        'ADJUSTMENT',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'SCRAP_DISCARD'
      )) NOT NULL,
      quantity REAL NOT NULL, -- original quantity entered
      unit TEXT NOT NULL,
      base_quantity REAL NOT NULL, -- converted to base_unit (+ for incoming, - for outgoing)
      unit_cost REAL DEFAULT 0,
      reference_type TEXT, -- 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'REMNANT'
      reference_id INTEGER,
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers & Accounts Payable
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT,
      address TEXT,
      pan_vat TEXT,
      opening_balance REAL DEFAULT 0,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers & Khata Credit Ledger
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      secondary_phone TEXT,
      email TEXT,
      contact_person TEXT,
      customer_type TEXT DEFAULT 'Contractor',
      address TEXT,
      permanent_address TEXT,
      temporary_address TEXT,
      location_meta TEXT,
      pan_vat TEXT,
      credit_limit REAL DEFAULT 0,
      payment_terms_days INTEGER DEFAULT 30,
      opening_balance REAL DEFAULT 0,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Purchases & Goods Receiving (GRN)
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_no TEXT,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      supplier_invoice_no TEXT,
      fiscal_year TEXT NOT NULL,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      status TEXT CHECK(status IN ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED')) DEFAULT 'RECEIVED',
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      freight_amount REAL DEFAULT 0,
      unloading_charge REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0, -- 13% VAT
      total_amount REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      payment_status TEXT CHECK(payment_status IN ('PAID', 'PARTIAL', 'UNPAID')) DEFAULT 'UNPAID',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Purchase Line Items
    CREATE TABLE IF NOT EXISTS purchase_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      location_id INTEGER NOT NULL REFERENCES stock_locations(id),
      ordered_qty REAL DEFAULT 0,
      received_qty REAL NOT NULL,
      shortage_qty REAL DEFAULT 0,
      damaged_qty REAL DEFAULT 0,
      unit TEXT NOT NULL,
      base_quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      landed_unit_cost REAL NOT NULL,
      line_total REAL NOT NULL,
      tax_category TEXT DEFAULT 'VAT_13'
    );

    -- Sales & IRD Invoices
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL, -- e.g. TI-8182-0001
      invoice_type TEXT CHECK(invoice_type IN ('TAX_INVOICE', 'ABBREVIATED', 'CHALLAN')) DEFAULT 'TAX_INVOICE',
      fiscal_year TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_pan TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      due_date_bs TEXT,
      status TEXT CHECK(status IN ('ISSUED', 'RETURNED', 'CANCELLED')) DEFAULT 'ISSUED',
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      non_taxable_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      payment_status TEXT CHECK(payment_status IN ('PAID', 'PARTIAL', 'UNPAID')) DEFAULT 'PAID',
      is_delivery_challan INTEGER DEFAULT 0,
      delivery_status TEXT CHECK(delivery_status IN ('DELIVERED', 'PENDING', 'PARTIAL')) DEFAULT 'DELIVERED',
      cbms_sync_status TEXT CHECK(cbms_sync_status IN ('PENDING', 'SYNCED', 'FAILED', 'EXEMPT')) DEFAULT 'PENDING',
      cbms_sync_code TEXT,
      cbms_sync_response TEXT,
      cbms_sync_at DATETIME,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale Line Items
    CREATE TABLE IF NOT EXISTS sale_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      location_id INTEGER NOT NULL REFERENCES stock_locations(id),
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      base_quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      line_total REAL NOT NULL,
      tax_category TEXT DEFAULT 'VAT_13',
      tax_amount REAL DEFAULT 0,
      is_cut_length INTEGER DEFAULT 0,
      cut_length_meters REAL DEFAULT 0,
      remnant_id INTEGER REFERENCES remnants(id)
    );

    -- Payments & Cash/Bank/QR Collections
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_type TEXT CHECK(party_type IN ('CUSTOMER', 'SUPPLIER')) NOT NULL,
      party_id INTEGER NOT NULL,
      reference_type TEXT CHECK(reference_type IN ('SALE', 'PURCHASE', 'ON_ACCOUNT')) NOT NULL,
      reference_id INTEGER,
      method TEXT CHECK(method IN ('CASH', 'BANK_TRANSFER', 'QR_FONEPAY', 'QR_NEPALPAY', 'CHEQUE')) NOT NULL,
      amount REAL NOT NULL,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      reference_number TEXT, -- Transaction ID, cheque number
      notes TEXT,
      received_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sales & Purchase Returns
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_no TEXT UNIQUE NOT NULL, -- e.g. CN-8182-0001 (Credit Note)
      return_type TEXT CHECK(return_type IN ('SALE_RETURN', 'PURCHASE_RETURN')) NOT NULL,
      original_reference_type TEXT,
      original_reference_id INTEGER,
      party_type TEXT CHECK(party_type IN ('CUSTOMER', 'SUPPLIER')) NOT NULL,
      party_id INTEGER NOT NULL,
      fiscal_year TEXT NOT NULL,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      reason TEXT,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status TEXT CHECK(status IN ('APPROVED', 'PENDING')) DEFAULT 'APPROVED',
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Return Line Items
    CREATE TABLE IF NOT EXISTS return_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      location_id INTEGER NOT NULL REFERENCES stock_locations(id),
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      base_quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      condition TEXT CHECK(condition IN ('RESALABLE', 'DAMAGED', 'SCRAP')) DEFAULT 'RESALABLE'
    );

    -- Daily Cash Register Sessions
    CREATE TABLE IF NOT EXISTS cash_register_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER NOT NULL REFERENCES users(id),
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      opening_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      closing_time DATETIME,
      status TEXT CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
      opening_cash REAL DEFAULT 0,
      cash_sales REAL DEFAULT 0,
      cash_receipts REAL DEFAULT 0,
      cash_expenses REAL DEFAULT 0,
      cash_supplier_payments REAL DEFAULT 0,
      expected_closing_cash REAL DEFAULT 0,
      actual_closing_cash REAL DEFAULT 0,
      cash_difference REAL DEFAULT 0,
      notes TEXT
    );

    -- Daily Cashbook Expenses & Transactions
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES cash_register_sessions(id),
      type TEXT CHECK(type IN ('EXPENSE', 'DEPOSIT', 'WITHDRAWAL', 'PETTY_CASH')) NOT NULL,
      category TEXT NOT NULL, -- 'TEA_KHAJA', 'TRANSPORT_FREIGHT', 'OFFICE_SUPPLIES', 'WAGES_LABOUR', 'MAINTENANCE', 'UTILITIES', 'OTHER'
      amount REAL NOT NULL,
      description TEXT,
      payee TEXT,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock Physical Count & Adjustments
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_no TEXT UNIQUE NOT NULL,
      location_id INTEGER NOT NULL REFERENCES stock_locations(id),
      reason TEXT,
      status TEXT CHECK(status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')) DEFAULT 'APPROVED',
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      approved_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      system_qty REAL NOT NULL,
      counted_qty REAL NOT NULL,
      difference_qty REAL NOT NULL,
      unit TEXT NOT NULL,
      reason TEXT
    );

    -- IRD CBMS Transmission Logs
    CREATE TABLE IF NOT EXISTS cbms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES sales(id),
      fiscal_year TEXT NOT NULL,
      bill_no TEXT NOT NULL,
      customer_pan TEXT,
      bill_amount REAL NOT NULL,
      taxable_amount REAL NOT NULL,
      tax_amount REAL NOT NULL,
      request_payload TEXT,
      response_payload TEXT,
      status_code INTEGER,
      status TEXT CHECK(status IN ('SUCCESS', 'FAILED')) NOT NULL,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for high-speed queries on large datasets
    CREATE INDEX IF NOT EXISTS idx_stock_ledger_prod_loc ON stock_ledger(product_id, location_id);
    CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON stock_ledger(date_bs);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date_bs);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date_bs);
    CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_type, party_id);
  `);

  // Initialize Default Settings if not present
  const defaultSettings = [
    { key: 'shop_name_en', value: 'Shree Krishna Iron & Construction Materials' },
    { key: 'shop_name_np', value: 'श्री कृष्ण फलाम तथा निर्माण सामग्री भण्डार' },
    { key: 'pan_number', value: '304892716' },
    { key: 'ird_reg_no', value: 'IRD-KTM-2081-4491' },
    { key: 'address_en', value: 'Imadol Ring Road, Lalitpur, Nepal' },
    { key: 'address_np', value: 'इमाडोल चक्रपथ, ललितपुर, नेपाल' },
    { key: 'phone', value: '+977-1-5201982, 9851087654' },
    { key: 'email', value: 'contact@shreekrishnairon.com.np' },
    { key: 'active_fiscal_year', value: '2081/82' },
    { key: 'invoice_prefix', value: 'TI' },
    { key: 'invoice_seq', value: '1' },
    { key: 'credit_note_seq', value: '1' },
    { key: 'default_tax_rate', value: '13' },
    { key: 'cbms_enabled', value: '0' },
    { key: 'cbms_api_url', value: 'https://cbms.ird.gov.np/api/bill' },
    { key: 'cbms_username', value: '304892716' },
    { key: 'cbms_password', value: 'ird_sandbox_demo_key' },
    { key: 'qr_bank_name', value: 'Global IME Bank Ltd.' },
    { key: 'qr_account_name', value: 'SHREE KRISHNA IRON STORE' },
    { key: 'qr_account_number', value: '0102030405060708' },
    { key: 'qr_merchant_id', value: 'GLOBAL-NEPALPAY-8821' },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)
  `);

  const setTransaction = db.transaction((settings) => {
    for (const s of settings) insertSetting.run(s);
  });
  setTransaction(defaultSettings);

  // Initialize default fiscal years
  const defaultFiscalYears = [
    { name: '2080/81', start_bs: '2080-04-01', end_bs: '2080-12-30', start_ad: '2023-07-17', end_ad: '2024-07-15', is_active: 0 },
    { name: '2081/82', start_bs: '2081-04-01', end_bs: '2081-12-30', start_ad: '2024-07-16', end_ad: '2025-07-15', is_active: 1 },
    { name: '2082/83', start_bs: '2082-04-01', end_bs: '2082-12-30', start_ad: '2025-07-16', end_ad: '2026-07-15', is_active: 0 },
  ];

  const insertFy = db.prepare(`
    INSERT OR IGNORE INTO fiscal_years (name, start_date_bs, end_date_bs, start_date_ad, end_date_ad, is_active)
    VALUES (@name, @start_bs, @end_bs, @start_ad, @end_ad, @is_active)
  `);

  const fyTransaction = db.transaction((fys) => {
    for (const f of fys) insertFy.run(f);
  });
  fyTransaction(defaultFiscalYears);

  // Initialize default warehouses / locations
  const defaultLocations = [
    { name: 'Main Yard (गोदाम १)', name_np: 'मुख्य गोदाम १', code: 'YARD-1', is_default: 1 },
    { name: 'Cutting & Fabrication Shed (कटिङ सेड)', name_np: 'कटिङ सेड', code: 'SHED', is_default: 0 },
    { name: 'Retail Hardware Store (पसल काउन्टर)', name_np: 'काउन्टर पसल', code: 'STORE', is_default: 0 },
  ];

  const insertLoc = db.prepare(`
    INSERT OR IGNORE INTO stock_locations (name, name_np, code, is_default)
    VALUES (@name, @name_np, @code, @is_default)
  `);

  const locTransaction = db.transaction((locs) => {
    for (const l of locs) insertLoc.run(l);
  });
  locTransaction(defaultLocations);

  // Initialize default users if table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, phone, active)
      VALUES (@username, @password_hash, @full_name, @role, @phone, 1)
    `);

    // In a real app we hash passwords; for local demo we provide clean standard access
    insertUser.run({ username: 'superadmin', password_hash: 'superadmin123', full_name: 'Anaya Craft (Software Owner)', role: 'super_admin', phone: '9851087654' });
    insertUser.run({ username: 'admin', password_hash: 'admin123', full_name: 'Dinesh Sharma (Owner)', role: 'admin', phone: '9851087654' });
    insertUser.run({ username: 'cashier', password_hash: 'cashier123', full_name: 'Suman Thapa (Cashier)', role: 'cashier', phone: '9841234567' });
    insertUser.run({ username: 'storekeeper', password_hash: 'store123', full_name: 'Bikash Tamang (Storekeeper)', role: 'storekeeper', phone: '9812345678' });
    insertUser.run({ username: 'accountant', password_hash: 'account123', full_name: 'Pooja Shrestha (Accountant)', role: 'accountant', phone: '9801234567' });
  }

  console.log('✅ SQLite schema initialized successfully with Nepal IRD specifications.');
}

module.exports = {
  initSchema
};
