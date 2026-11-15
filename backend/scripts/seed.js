const db = require('../db/database');
const { initSchema } = require('../db/schema');
const StockService = require('../services/stockService');
const InvoiceService = require('../services/invoiceService');
const { getTodayBs, bsToAd } = require('../utils/nepaliCalendar');

initSchema();

console.log('🌱 Seeding Nepal Iron Store data...');

// 1. Seed Products
const sampleProducts = [
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
    opening_stock: 4500, // 4500 kg
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

const insertProdStmt = db.prepare(`
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

const todayBs = getTodayBs();
const { adDateStr } = bsToAd(todayBs);

for (const p of sampleProducts) {
  insertProdStmt.run({
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

  const row = db.prepare('SELECT id FROM products WHERE code = ?').get(p.code);
  if (row) {
    // Record opening stock in stock ledger if not already recorded
    const existingMovement = db.prepare('SELECT id FROM stock_ledger WHERE product_id = ?').get(row.id);
    if (!existingMovement) {
      StockService.recordMovement({
        product_id: row.id,
        location_id: 1,
        movement_type: 'PURCHASE_RECEIPT',
        quantity: p.opening_stock,
        unit: p.base_unit,
        base_quantity: p.opening_stock,
        unit_cost: p.cost_price,
        reference_type: 'OPENING_STOCK',
        notes: 'Initial warehouse stock receipt',
        user_id: 1,
        date_ad: adDateStr,
        date_bs: todayBs
      });
    }
  }
}

// 2. Seed Suppliers
const sampleSuppliers = [
  { name: 'Jagdamba Steels Limited', company_name: 'Shanker Group', phone: '01-4433221, 9801088991', address: 'Tinkune, Kathmandu / Simara Factory', pan_vat: '300189234', opening_balance: 150000 },
  { name: 'Panchakanya Steel Pvt. Ltd.', company_name: 'Panchakanya Group', phone: '01-5526555, 9851022334', address: 'Krishna Galli, Pulchowk, Lalitpur', pan_vat: '301289456', opening_balance: 0 },
  { name: 'Hulas Steel Industries Ltd.', company_name: 'Golchha Group', phone: '01-4228989', address: 'Biratnagar / Naxal, Kathmandu', pan_vat: '300456123', opening_balance: 85000 },
  { name: 'Shivam Cements Limited', company_name: 'Shivam Group', phone: '01-4411223', address: 'Anamnagar, Kathmandu', pan_vat: '302345678', opening_balance: 0 },
];

const insertSup = db.prepare(`
  INSERT OR IGNORE INTO suppliers (name, company_name, phone, address, pan_vat, opening_balance, notes)
  VALUES (@name, @company_name, @phone, @address, @pan_vat, @opening_balance, 'Authorized mill distributor')
`);
for (const s of sampleSuppliers) insertSup.run(s);

// 3. Seed Customers
const sampleCustomers = [
  { name: 'ABC Nirman Sewa Pvt. Ltd.', phone: '9851122334', address: 'Koteshwor-32, Kathmandu', pan_vat: '601239841', credit_limit: 500000, payment_terms_days: 30, opening_balance: 120000 },
  { name: 'Himalayan Builders & Engineers', phone: '9841998877', address: 'Satdobato, Lalitpur', pan_vat: '602349812', credit_limit: 800000, payment_terms_days: 45, opening_balance: 245000 },
  { name: 'Ram Chandra Shrestha', phone: '9841334455', address: 'Imadol, Mahalaxmi-4, Lalitpur', pan_vat: '', credit_limit: 150000, payment_terms_days: 15, opening_balance: 35000 },
  { name: 'Bikram Maharjan (Metal Fabricator)', phone: '9813556677', address: 'Balkumari, Lalitpur', pan_vat: '309876543', credit_limit: 200000, payment_terms_days: 20, opening_balance: 0 },
  { name: 'Kanti Construction & Developers', phone: '9851088776', address: 'Thapathali, Kathmandu', pan_vat: '608765432', credit_limit: 1000000, payment_terms_days: 30, opening_balance: 450000 },
];

const insertCust = db.prepare(`
  INSERT OR IGNORE INTO customers (name, phone, address, pan_vat, credit_limit, payment_terms_days, opening_balance, notes)
  VALUES (@name, @phone, @address, @pan_vat, @credit_limit, @payment_terms_days, @opening_balance, 'Regular iron buyer')
`);
for (const c of sampleCustomers) insertCust.run(c);

// 4. Seed a few available Cut Remnants
const tmt12 = db.prepare("SELECT id FROM products WHERE code = 'TMT-12-PAN'").get();
const tmt16 = db.prepare("SELECT id FROM products WHERE code = 'TMT-16-PAN'").get();
const giPipe = db.prepare("SELECT id FROM products WHERE code = 'PIP-GI-200-HUL'").get();

if (tmt12) {
  db.prepare(`
    INSERT INTO remnants (product_id, location_id, length_meters, quantity, condition, notes, status)
    VALUES (?, 2, 4.8, 2, 'usable', 'Usable remnant from beam cutting', 'available')
  `).run(tmt12.id);
  db.prepare(`
    INSERT INTO remnants (product_id, location_id, length_meters, quantity, condition, notes, status)
    VALUES (?, 2, 3.2, 1, 'usable', 'Clean cut remnant', 'available')
  `).run(tmt12.id);
}
if (tmt16) {
  db.prepare(`
    INSERT INTO remnants (product_id, location_id, length_meters, quantity, condition, notes, status)
    VALUES (?, 2, 5.5, 1, 'usable', 'Column cut remnant', 'available')
  `).run(tmt16.id);
}
if (giPipe) {
  db.prepare(`
    INSERT INTO remnants (product_id, location_id, length_meters, quantity, condition, notes, status)
    VALUES (?, 2, 2.4, 1, 'usable', '2 inch GI pipe cut remnant', 'available')
  `).run(giPipe.id);
}

// 5. Open an active morning cash session
const openSession = db.prepare("SELECT id FROM cash_register_sessions WHERE status = 'OPEN'").get();
if (!openSession) {
  db.prepare(`
    INSERT INTO cash_register_sessions (
      cashier_id, date_ad, date_bs, opening_cash, cash_sales,
      cash_receipts, cash_expenses, cash_supplier_payments, status, notes
    ) VALUES (2, ?, ?, 25000, 0, 0, 0, 0, 'OPEN', 'Shift opened with Rs 25,000 cash drawer float')
  `).run(adDateStr, todayBs);
}

// 6. Create 1 sample IRD Tax Invoice
const saleCount = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
if (saleCount === 0 && tmt12 && tmt16) {
  try {
    InvoiceService.createSale({
      invoiceType: 'TAX_INVOICE',
      customerId: 1,
      customerName: 'ABC Nirman Sewa Pvt. Ltd.',
      customerPan: '601239841',
      customerPhone: '9851122334',
      customerAddress: 'Koteshwor-32, Kathmandu',
      dateBs: todayBs,
      items: [
        {
          productId: tmt12.id,
          locationId: 1,
          quantity: 200, // 200 kg
          unit: 'kg',
          unitPrice: 99.5,
          discountPercent: 1.5,
          isCutLength: 0
        },
        {
          productId: tmt16.id,
          locationId: 1,
          quantity: 150, // 150 kg
          unit: 'kg',
          unitPrice: 99.5,
          discountPercent: 0,
          isCutLength: 0
        }
      ],
      overallDiscount: 0,
      payments: [
        { method: 'CASH', amount: 15000, referenceNumber: 'CASH-REC-01' },
        { method: 'QR_FONEPAY', amount: 20000, referenceNumber: 'FP-982187654' }
      ],
      isDeliveryChallan: 1,
      notes: 'Delivered to Koteshwor Site 2',
      userId: 2
    });
    console.log('✅ Sample IRD Tax Invoice generated.');
  } catch (err) {
    console.error('Sample invoice generation notice:', err.message);
  }
}

console.log('✅ Nepal Iron Store database seeding complete!');
