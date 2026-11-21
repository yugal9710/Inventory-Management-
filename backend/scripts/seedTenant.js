const { initSchema } = require('../db/schema');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

const catalogProducts = [
  {
    code: 'TMT-08-JAG',
    barcode: '890100800008',
    name_en: '8mm TMT Rebar Fe500D (Jagdamba)',
    name_np: '८ एमएम टिएमटी डण्डी Fe500D (जग्दम्बा)',
    category: 'TMT Rebar',
    grade: 'Fe500D',
    brand: 'Jagdamba',
    size: '8mm',
    base_unit: 'kg',
    selling_units: ['kg', 'piece', 'bundle', 'tonne'],
    unit_conversions: { kg_per_piece: 4.74, pieces_per_bundle: 10, kg_per_meter: 0.395, meter_per_piece: 12 },
    tax_category: 'VAT_13',
    cost_price: 88.0,
    selling_price: 96.0,
    reorder_level: 1500,
    allows_cutting: 1,
    standard_length: 12,
    opening_stock: 4500,
  },
  {
    code: 'TMT-10-JAG',
    barcode: '890100800010',
    name_en: '10mm TMT Rebar Fe500D (Jagdamba)',
    name_np: '१० एमएम टिएमटी डण्डी Fe500D (जग्दम्बा)',
    category: 'TMT Rebar',
    grade: 'Fe500D',
    brand: 'Jagdamba',
    size: '10mm',
    base_unit: 'kg',
    selling_units: ['kg', 'piece', 'bundle', 'tonne'],
    unit_conversions: { kg_per_piece: 7.40, pieces_per_bundle: 7, kg_per_meter: 0.617, meter_per_piece: 12 },
    tax_category: 'VAT_13',
    cost_price: 88.0,
    selling_price: 96.0,
    reorder_level: 2000,
    allows_cutting: 1,
    standard_length: 12,
    opening_stock: 6200,
  },
  {
    code: 'TMT-12-PAN',
    barcode: '890100800012',
    name_en: '12mm TMT Rebar Fe500D (Panchakanya)',
    name_np: '१२ एमएम टिएमटी डण्डी Fe500D (पञ्चकन्या)',
    category: 'TMT Rebar',
    grade: 'Fe500D',
    brand: 'Panchakanya',
    size: '12mm',
    base_unit: 'kg',
    selling_units: ['kg', 'piece', 'bundle', 'tonne'],
    unit_conversions: { kg_per_piece: 10.66, pieces_per_bundle: 5, kg_per_meter: 0.888, meter_per_piece: 12 },
    tax_category: 'VAT_13',
    cost_price: 91.0,
    selling_price: 99.5,
    reorder_level: 2500,
    allows_cutting: 1,
    standard_length: 12,
    opening_stock: 8500,
  },
  {
    code: 'TMT-16-PAN',
    barcode: '890100800016',
    name_en: '16mm TMT Rebar Fe500D (Panchakanya)',
    name_np: '१६ एमएम टिएमटी डण्डी Fe500D (पञ्चकन्या)',
    category: 'TMT Rebar',
    grade: 'Fe500D',
    brand: 'Panchakanya',
    size: '16mm',
    base_unit: 'kg',
    selling_units: ['kg', 'piece', 'bundle', 'tonne'],
    unit_conversions: { kg_per_piece: 18.94, pieces_per_bundle: 3, kg_per_meter: 1.578, meter_per_piece: 12 },
    tax_category: 'VAT_13',
    cost_price: 91.0,
    selling_price: 99.5,
    reorder_level: 2000,
    allows_cutting: 1,
    standard_length: 12,
    opening_stock: 5800,
  },
  {
    code: 'TMT-20-JAG',
    barcode: '890100800020',
    name_en: '20mm TMT Rebar Fe500D (Jagdamba)',
    name_np: '२० एमएम टिएमटी डण्डी Fe500D (जग्दम्बा)',
    category: 'TMT Rebar',
    grade: 'Fe500D',
    brand: 'Jagdamba',
    size: '20mm',
    base_unit: 'kg',
    selling_units: ['kg', 'piece', 'bundle', 'tonne'],
    unit_conversions: { kg_per_piece: 29.59, pieces_per_bundle: 2, kg_per_meter: 2.466, meter_per_piece: 12 },
    tax_category: 'VAT_13',
    cost_price: 88.5,
    selling_price: 97.0,
    reorder_level: 1200,
    allows_cutting: 1,
    standard_length: 12,
    opening_stock: 3200,
  },
  {
    code: 'PIP-GI-150-HUL',
    barcode: '890200150001',
    name_en: '1.5" GI Pipe Class B (Hulas)',
    name_np: '१.५ इन्च जि.आई. पाइप (हुलास)',
    category: 'Pipes & Hollow Sections',
    grade: 'Class B (Medium)',
    brand: 'Hulas',
    size: '1.5 inch x 6m',
    base_unit: 'piece',
    selling_units: ['piece', 'meter', 'foot'],
    unit_conversions: { meter_per_piece: 6, foot_per_piece: 19.68 },
    tax_category: 'VAT_13',
    cost_price: 2650.0,
    selling_price: 3100.0,
    reorder_level: 25,
    allows_cutting: 1,
    standard_length: 6,
    opening_stock: 80,
  },
  {
    code: 'PIP-GI-200-HUL',
    barcode: '890200200001',
    name_en: '2.0" GI Pipe Class B (Hulas)',
    name_np: '२.० इन्च जि.आई. पाइप (हुलास)',
    category: 'Pipes & Hollow Sections',
    grade: 'Class B (Medium)',
    brand: 'Hulas',
    size: '2.0 inch x 6m',
    base_unit: 'piece',
    selling_units: ['piece', 'meter', 'foot'],
    unit_conversions: { meter_per_piece: 6, foot_per_piece: 19.68 },
    tax_category: 'VAT_13',
    cost_price: 3750.0,
    selling_price: 4350.0,
    reorder_level: 20,
    allows_cutting: 1,
    standard_length: 6,
    opening_stock: 45,
  },
  {
    code: 'PIP-SQ-1010-AAR',
    barcode: '890200101016',
    name_en: '1" x 1" MS Square Box Pipe 1.6mm',
    name_np: '१" x १" एमएस स्क्वायर बक्स पाइप',
    category: 'Pipes & Hollow Sections',
    grade: 'Commercial',
    brand: 'Aarti',
    size: '1" x 1" x 1.6mm x 6m',
    base_unit: 'piece',
    selling_units: ['piece', 'meter'],
    unit_conversions: { meter_per_piece: 6 },
    tax_category: 'VAT_13',
    cost_price: 880.0,
    selling_price: 1050.0,
    reorder_level: 30,
    allows_cutting: 1,
    standard_length: 6,
    opening_stock: 120,
  },
  {
    code: 'SHT-CGI-035-HUL',
    barcode: '890300035010',
    name_en: '0.35mm Color CGI Corrugated Sheet 10ft',
    name_np: '०.३५ एमएम रंगीन जस्तापाता १० फिट (हुलास)',
    category: 'Corrugated & Plain Sheets',
    grade: 'Color Coated',
    brand: 'Hulas',
    size: '10 ft',
    base_unit: 'sheet',
    selling_units: ['sheet', 'bundle'],
    unit_conversions: { sheets_per_bundle: 10 },
    tax_category: 'VAT_13',
    cost_price: 1250.0,
    selling_price: 1480.0,
    reorder_level: 40,
    allows_cutting: 0,
    opening_stock: 150,
  },
  {
    code: 'ANG-40405-JAG',
    barcode: '890400404005',
    name_en: '40mm x 40mm x 5mm MS Angle (Jagdamba)',
    name_np: '४० x ४० x ५ एमएम एमएस एंगल (जग्दम्बा)',
    category: 'Angles & Channels',
    grade: 'IS 2062',
    brand: 'Jagdamba',
    size: '40x40x5mm x 6m',
    base_unit: 'kg',
    selling_units: ['kg', 'piece'],
    unit_conversions: { kg_per_piece: 18.0, meter_per_piece: 6 },
    tax_category: 'VAT_13',
    cost_price: 94.0,
    selling_price: 104.0,
    reorder_level: 500,
    allows_cutting: 1,
    standard_length: 6,
    opening_stock: 1200,
  },
  {
    code: 'WIR-BIND-20G',
    barcode: '890500000020',
    name_en: '20 Gauge Annealed Binding Wire',
    name_np: '२० गेज डण्डी बाइन्डिङ तार',
    category: 'Wire & Nails',
    grade: 'Standard',
    brand: 'Aarti',
    size: '20G',
    base_unit: 'kg',
    selling_units: ['kg', 'bundle'],
    unit_conversions: { kg_per_bundle: 25 },
    tax_category: 'VAT_13',
    cost_price: 105.0,
    selling_price: 125.0,
    reorder_level: 200,
    allows_cutting: 0,
    opening_stock: 650,
  },
  {
    code: 'NAL-WIRE-250',
    barcode: '890500000250',
    name_en: '2.5" Wire Nails (काँटी)',
    name_np: '२.५ इन्च किल्ला / काँटी',
    category: 'Wire & Nails',
    grade: 'Standard',
    brand: 'Swastik',
    size: '2.5 inch',
    base_unit: 'kg',
    selling_units: ['kg', 'packet'],
    unit_conversions: { kg_per_packet: 5 },
    tax_category: 'VAT_13',
    cost_price: 110.0,
    selling_price: 130.0,
    reorder_level: 150,
    allows_cutting: 0,
    opening_stock: 400,
  },
  {
    code: 'CEM-SHIV-OPC',
    barcode: '890600000053',
    name_en: 'Shivam OPC 53 Grade Cement',
    name_np: 'शिवम ओ.पि.सि. सिमेन्ट ५३ ग्रेड',
    category: 'Cement & Aggregates',
    grade: 'OPC 53 Grade',
    brand: 'Shivam',
    size: '50kg Bag',
    base_unit: 'bag',
    selling_units: ['bag', 'tonne'],
    unit_conversions: { bags_per_tonne: 20 },
    tax_category: 'VAT_13',
    cost_price: 780.0,
    selling_price: 860.0,
    reorder_level: 50,
    allows_cutting: 0,
    opening_stock: 250,
  },
  {
    code: 'TOOL-CUT-4IN',
    barcode: '890700000004',
    name_en: '4" Metal Cutting Disc / Wheel (Schneider)',
    name_np: '४" फलाम काट्ने डिस्क / ब्लेड',
    category: 'Hardware & Tools',
    grade: 'Industrial',
    brand: 'Schneider',
    size: '105 x 1.2 x 16mm',
    base_unit: 'piece',
    selling_units: ['piece', 'box'],
    unit_conversions: { pieces_per_box: 50 },
    tax_category: 'VAT_13',
    cost_price: 45.0,
    selling_price: 65.0,
    reorder_level: 50,
    allows_cutting: 0,
    opening_stock: 300,
  }
];

/**
 * Initializes and seeds a tenant's isolated SQLite database with:
 * - Schema tables, indexes & constraints
 * - Custom store profile settings (store name, PAN, phone, yard location)
 * - Initial administrator account
 * - Super admin access
 * - Authentic Nepal steel catalog with initial inventory
 * - Starter suppliers & cash session
 */
function seedTenant(targetDb, tenantInfo = {}) {
  initSchema(targetDb);

  const todayBs = getTodayBs();
  const { adDateStr } = bsToAd(todayBs);

  // 1. Update Settings with tenant-specific profile
  const upsertSetting = targetDb.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  if (tenantInfo.name) {
    upsertSetting.run('company_name_en', tenantInfo.name);
    upsertSetting.run('shop_name_en', tenantInfo.name);
    upsertSetting.run('company_name_np', tenantInfo.nameNepali || tenantInfo.name);
    upsertSetting.run('shop_name_np', tenantInfo.nameNepali || tenantInfo.name);
  }
  if (tenantInfo.pan) {
    upsertSetting.run('company_pan', tenantInfo.pan);
    upsertSetting.run('pan_number', tenantInfo.pan);
    upsertSetting.run('ird_seller_pan', tenantInfo.pan);
  }
  if (tenantInfo.address) {
    upsertSetting.run('company_address', tenantInfo.address);
    upsertSetting.run('address_en', tenantInfo.address);
  }
  if (tenantInfo.phone) {
    upsertSetting.run('company_phone', tenantInfo.phone);
    upsertSetting.run('phone', tenantInfo.phone);
  }

  // 2. Setup initial Store Admin account if provided
  if (tenantInfo.adminUsername) {
    const cleanUser = tenantInfo.adminUsername.toLowerCase().trim();
    const existing = targetDb.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUser);
    if (existing) {
      targetDb.prepare(`
        UPDATE users SET password_hash = ?, full_name = ?, phone = ?, role = 'admin', active = 1
        WHERE id = ?
      `).run(
        tenantInfo.adminPassword || 'admin123',
        tenantInfo.adminName || 'Store Administrator',
        tenantInfo.phone || '',
        existing.id
      );
    } else {
      targetDb.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, phone, active)
        VALUES (?, ?, ?, 'admin', ?, 1)
      `).run(
        cleanUser,
        tenantInfo.adminPassword || 'admin123',
        tenantInfo.adminName || 'Store Administrator',
        tenantInfo.phone || ''
      );
    }
  }

  // 3. Ensure superadmin exists in this database so platform owner can always access it
  const existingSuper = targetDb.prepare("SELECT id FROM users WHERE role = 'super_admin'").get();
  if (!existingSuper) {
    targetDb.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, phone, active)
      VALUES ('superadmin', 'superadmin123', 'Anaya Craft (Software Owner)', 'super_admin', '9851087654', 1)
    `).run();
  }

  // 4. Seed authentic Nepal steel products catalog
  const prodCount = targetDb.prepare('SELECT COUNT(*) as count FROM products').get()?.count || 0;
  if (prodCount === 0) {
    const insertProd = targetDb.prepare(`
      INSERT OR IGNORE INTO products (
        code, barcode, name_en, name_np, category, grade, brand, size,
        base_unit, selling_units, unit_conversions, tax_category,
        cost_price, selling_price, reorder_level, allows_cutting, standard_length
      ) VALUES (
        @code, @barcode, @name_en, @name_np, @category, @grade, @brand, @size,
        @base_unit, @selling_units, @unit_conversions, @tax_category,
        @cost_price, @selling_price, @reorder_level, @allows_cutting, @standard_length
      )
    `);

    const insertLedger = targetDb.prepare(`
      INSERT INTO stock_ledger (
        product_id, location_id, movement_type, quantity, unit,
        base_quantity, unit_cost, reference_type, notes, user_id, date_ad, date_bs
      ) VALUES (?, 1, 'PURCHASE_RECEIPT', ?, ?, ?, ?, 'OPENING_STOCK', 'Initial warehouse stock receipt', 1, ?, ?)
    `);

    for (const p of catalogProducts) {
      insertProd.run({
        code: p.code,
        barcode: p.barcode,
        name_en: p.name_en,
        name_np: p.name_np,
        category: p.category,
        grade: p.grade,
        brand: p.brand,
        size: p.size,
        base_unit: p.base_unit,
        selling_units: JSON.stringify(p.selling_units),
        unit_conversions: JSON.stringify(p.unit_conversions),
        tax_category: p.tax_category,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        reorder_level: p.reorder_level,
        allows_cutting: p.allows_cutting,
        standard_length: p.standard_length || 12
      });

      const row = targetDb.prepare('SELECT id FROM products WHERE code = ?').get(p.code);
      if (row && p.opening_stock > 0) {
        insertLedger.run(row.id, p.opening_stock, p.base_unit, p.opening_stock, p.cost_price, adDateStr, todayBs);
      }
    }
  }

  // 5. Seed default suppliers if empty
  const suppCount = targetDb.prepare('SELECT COUNT(*) as count FROM suppliers').get()?.count || 0;
  if (suppCount === 0) {
    const insertSup = targetDb.prepare(`
      INSERT INTO suppliers (supplier_code, name, company_name, phone, address, pan_vat, opening_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Authorized mill distributor')
    `);
    insertSup.run('SUPP-0001', 'Jagdamba Steels Limited', 'Shanker Group', '01-4433221', 'Tinkune, Kathmandu', '300189234', 0);
    insertSup.run('SUPP-0002', 'Panchakanya Steel Pvt. Ltd.', 'Panchakanya Group', '01-5526555', 'Pulchowk, Lalitpur', '301289456', 0);
    insertSup.run('SUPP-0003', 'Hulas Steel Industries Ltd.', 'Golchha Group', '01-4228989', 'Biratnagar', '300456123', 0);
  }

  // 6. Open an initial cash drawer session if none open
  const openSession = targetDb.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN'").get();
  if (!openSession) {
    targetDb.prepare(`
      INSERT INTO cash_register_sessions (
        cashier_id, date_ad, date_bs, opening_cash, cash_sales,
        cash_receipts, cash_expenses, cash_supplier_payments, status, notes
      ) VALUES (1, ?, ?, 25000, 0, 0, 0, 0, 'OPEN', 'Shift opened with Rs 25,000 cash drawer float')
    `).run(adDateStr, todayBs);
  }

  console.log(`✅ Tenant database successfully seeded for "${tenantInfo.name || 'Store'}".`);
}

module.exports = {
  seedTenant,
  catalogProducts
};
