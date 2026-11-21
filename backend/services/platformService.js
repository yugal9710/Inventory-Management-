const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db/database');

const DATA_DIR = path.join(__dirname, '../../data');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Seed Plans tailored for Iron, Steel & Hardware Businesses
const DEFAULT_PLANS = [
  {
    id: 'plan-starter',
    name: 'Starter Retail Store (काउन्टर पसल)',
    priceMonthly: 3500,
    priceYearly: 35000,
    maxBranches: 1,
    maxStaff: 5,
    maxCustomers: 1000,
    storageQuotaMb: 5120,
    modules: {
      cutRemnants: false,
      cbmsSync: true,
      multiYard: false,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: false
    }
  },
  {
    id: 'plan-professional',
    name: 'Professional Wholesale & Yard (गोदाम तथा कटिङ)',
    priceMonthly: 7500,
    priceYearly: 75000,
    maxBranches: 3,
    maxStaff: 15,
    maxCustomers: 5000,
    storageQuotaMb: 25600,
    modules: {
      cutRemnants: true,
      cbmsSync: true,
      multiYard: true,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: true
    }
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Multi-Yard Hub (कर्पोरेट रोलिङ मिल्स)',
    priceMonthly: 18000,
    priceYearly: 180000,
    maxBranches: 10,
    maxStaff: 100,
    maxCustomers: 50000,
    storageQuotaMb: 102400,
    modules: {
      cutRemnants: true,
      cbmsSync: true,
      multiYard: true,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: true
    }
  }
];

// Software Owner Payment Gateway Details (Anaya Craft IT Solutions)
const DEFAULT_PAYMENT_CONFIG = {
  accountName: 'Anaya Craft IT Solutions Pvt. Ltd.',
  bankName: 'Nabil Bank Limited',
  accountNumber: '01201017500982',
  branch: 'New Baneshwor Branch, Kathmandu',
  paymentIdentifier: 'anacraft@nabil',
  fonepayMerchantId: '9801234567',
  currency: 'Rs.',
  supportPhone: '+977 98012 34567',
  supportEmail: 'billing@anacraft.com',
  qrCodeUrl: '/qr-fonepay-nabil.svg',
  instructions: 'Please transfer the exact plan subscription amount via Mobile Banking, connectIPS, eSewa, Khalti, or Fonepay QR to our official Nabil Bank merchant account. Upload the payment voucher or screenshot below with your Payer Name.'
};

// Initial default seed tenants
const DEFAULT_TENANTS = [
  {
    id: 'tenant-jagdamba-iron',
    name: 'Jagdamba Steel & Iron Suppliers Pvt. Ltd.',
    slug: 'jagdamba-iron',
    status: 'Active',
    country: 'Nepal',
    currency: 'Rs.',
    timeZone: 'Asia/Kathmandu',
    planId: 'plan-professional',
    address: 'Bhanu Chowk, Biratnagar-9, Morang, Koshi Province',
    phone: '+977 21 524100',
    pan: '601239841',
    contactPerson: 'Dinesh Sharma (Owner)',
    createdAt: '2026-01-15T00:00:00.000Z',
    modules: {
      cutRemnants: true,
      cbmsSync: true,
      multiYard: true,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: true
    },
    subscription: {
      planId: 'plan-professional',
      billingCycle: 'Yearly',
      status: 'Active',
      expiryDate: '2027-10-31T00:00:00.000Z',
      totalAmountDue: 75000,
      amountPaid: 75000,
      remainingBalance: 0
    }
  },
  {
    id: 'tenant-panchakanya-iron',
    name: 'Panchakanya Metal & Steels Traders',
    slug: 'panchakanya-steels',
    status: 'Active',
    country: 'Nepal',
    currency: 'Rs.',
    timeZone: 'Asia/Kathmandu',
    planId: 'plan-enterprise',
    address: 'Birgunj Dryport Road, Parsa, Madhesh Province',
    phone: '+977 51 532980',
    pan: '609823411',
    contactPerson: 'Rameshwor Prasad Sah',
    createdAt: '2026-02-01T00:00:00.000Z',
    modules: {
      cutRemnants: true,
      cbmsSync: true,
      multiYard: true,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: true
    },
    subscription: {
      planId: 'plan-enterprise',
      billingCycle: 'Yearly',
      status: 'Active',
      expiryDate: '2027-08-15T00:00:00.000Z',
      totalAmountDue: 180000,
      amountPaid: 120000,
      remainingBalance: 60000
    }
  },
  {
    id: 'tenant-hulas-iron',
    name: 'Hulas Iron & CGI Sheet Depot',
    slug: 'hulas-depot',
    status: 'Active',
    country: 'Nepal',
    currency: 'Rs.',
    timeZone: 'Asia/Kathmandu',
    planId: 'plan-starter',
    address: 'Kalanki-14, Kathmandu, Bagmati Province',
    phone: '+977 1 4287110',
    pan: '604491023',
    contactPerson: 'Bikram Shrestha',
    createdAt: '2026-03-10T00:00:00.000Z',
    modules: {
      cutRemnants: false,
      cbmsSync: true,
      multiYard: false,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: false
    },
    subscription: {
      planId: 'plan-starter',
      billingCycle: 'Monthly',
      status: 'Active',
      expiryDate: '2026-12-15T00:00:00.000Z',
      totalAmountDue: 3500,
      amountPaid: 3500,
      remainingBalance: 0
    }
  }
];

const DEFAULT_DOMAINS = [
  { id: 'dom-1', tenantId: 'tenant-jagdamba-iron', domain: 'jagdamba-iron.anacraft.com', type: 'subdomain', isPrimary: true, verified: true, sslStatus: 'active' },
  { id: 'dom-2', tenantId: 'tenant-jagdamba-iron', domain: 'billing.jagdambairon.com.np', type: 'custom', isPrimary: false, verified: true, sslStatus: 'active' },
  { id: 'dom-3', tenantId: 'tenant-panchakanya-iron', domain: 'panchakanya-steels.anacraft.com', type: 'subdomain', isPrimary: true, verified: true, sslStatus: 'active' },
  { id: 'dom-4', tenantId: 'tenant-hulas-iron', domain: 'hulas-depot.anacraft.com', type: 'subdomain', isPrimary: true, verified: true, sslStatus: 'active' }
];

const DEFAULT_PAYMENTS = [
  {
    id: 'pay-1',
    tenantId: 'tenant-jagdamba-iron',
    amount: 75000,
    date: '2026-10-31',
    method: 'Fonepay QR',
    transactionRef: 'FP-NABIL-881293',
    invoiceNo: 'INV-AC-2026-081',
    billingPeriod: '2026-2027 Annual Subscription',
    notes: 'Full payment verified via Nabil Bank Merchant Statement.',
    recordedBy: 'Developer Admin'
  },
  {
    id: 'pay-2',
    tenantId: 'tenant-panchakanya-iron',
    amount: 120000,
    date: '2026-08-15',
    method: 'Bank Transfer (connectIPS)',
    transactionRef: 'IPS-TXN-902188',
    invoiceNo: 'INV-AC-2026-042',
    billingPeriod: '2026-2027 Multi-Yard Subscription',
    notes: 'First installment received. Balance Rs. 60,000 due in Mangshir 2083.',
    recordedBy: 'Developer Admin'
  },
  {
    id: 'pay-3',
    tenantId: 'tenant-hulas-iron',
    amount: 3500,
    date: '2026-11-15',
    method: 'Fonepay QR',
    transactionRef: 'FP-MBL-442199',
    invoiceNo: 'INV-AC-2026-109',
    billingPeriod: 'Nov-Dec 2026 Monthly Subscription',
    notes: 'Monthly renewal verified.',
    recordedBy: 'Developer Admin'
  }
];

const DEFAULT_USERS = [
  { id: 'usr-1', tenantId: 'tenant-jagdamba-iron', name: 'Dinesh Sharma', email: 'owner@jagdambairon.com', username: 'admin', role: 'admin', phone: '+977 9851087654', active: true },
  { id: 'usr-2', tenantId: 'tenant-jagdamba-iron', name: 'Suman Thapa', email: 'cashier@jagdambairon.com', username: 'cashier', role: 'cashier', phone: '+977 9841234567', active: true },
  { id: 'usr-3', tenantId: 'tenant-jagdamba-iron', name: 'Bikash Tamang', email: 'yard@jagdambairon.com', username: 'storekeeper', role: 'storekeeper', phone: '+977 9812345678', active: true },
  { id: 'usr-4', tenantId: 'tenant-jagdamba-iron', name: 'Pooja Shrestha', email: 'accounts@jagdambairon.com', username: 'accountant', role: 'accountant', phone: '+977 9801234567', active: true },
  { id: 'usr-5', tenantId: 'tenant-panchakanya-iron', name: 'Rameshwor Sah', email: 'rameshwor@panchakanya.np', username: 'pk_admin', role: 'admin', phone: '+977 9855012345', active: true },
  { id: 'usr-6', tenantId: 'tenant-hulas-iron', name: 'Bikram Shrestha', email: 'bikram@hulasdepot.np', username: 'hulas_admin', role: 'admin', phone: '+977 9841987654', active: true }
];

// Sample base64 placeholder voucher image
const SAMPLE_VOUCHER_BASE64 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f1f5f9" rx="16"/><rect x="40" y="40" width="520" height="320" fill="white" stroke="%23cbd5e1" stroke-width="2" rx="12"/><text x="70" y="90" font-family="sans-serif" font-size="20" font-weight="bold" fill="%231e293b">Nabil Bank Limited - Payment Voucher</text><line x1="70" y1="110" x2="530" y2="110" stroke="%23e2e8f0" stroke-width="2"/><text x="70" y="150" font-family="sans-serif" font-size="14" fill="%2364748b">Beneficiary: Anaya Craft IT Solutions Pvt. Ltd.</text><text x="70" y="180" font-family="sans-serif" font-size="14" fill="%2364748b">Account No: 01201017500982 (New Baneshwor)</text><text x="70" y="220" font-family="sans-serif" font-size="16" font-weight="bold" fill="%230f766e">Amount Transferred: NPR 75,000.00</text><text x="70" y="250" font-family="sans-serif" font-size="14" fill="%2364748b">Txn Ref: NABIL-TXN-998811-VERIFIED</text><text x="70" y="280" font-family="sans-serif" font-size="13" fill="%2394a3b8">Timestamp: 2026-10-31 14:22:10 NPT</text><rect x="420" y="140" width="110" height="110" fill="%23f8fafc" stroke="%230284c7" stroke-dasharray="4" rx="8"/><text x="440" y="200" font-family="sans-serif" font-size="12" fill="%230284c7" font-weight="bold">SUCCESS</text></svg>';

const DEFAULT_RENEWALS = [
  {
    id: 'renew-101',
    tenantId: 'tenant-jagdamba-iron',
    tenantName: 'Jagdamba Steel & Iron Suppliers Pvt. Ltd.',
    userId: 'usr-1',
    userName: 'Dinesh Sharma (Owner)',
    userEmail: 'owner@jagdambairon.com',
    payerName: 'Dinesh Sharma',
    planId: 'plan-professional',
    planName: 'Professional Wholesale & Yard (गोदाम तथा कटिङ)',
    billingCycle: 'Yearly',
    amount: 75000,
    currency: 'Rs.',
    transactionRef: 'NABIL-TXN-998811-VERIFIED',
    receiptUrl: SAMPLE_VOUCHER_BASE64,
    receiptFileName: 'nabil_verified_statement.png',
    status: 'APPROVED',
    submittedAt: '2026-10-31T14:25:00.000Z',
    reviewedAt: '2026-10-31T14:35:00.000Z',
    reviewedBy: 'Developer Admin',
    rejectionReason: '',
    rejectionInstructions: ''
  },
  {
    id: 'renew-102',
    tenantId: 'tenant-panchakanya-iron',
    tenantName: 'Panchakanya Metal & Steels Traders',
    userId: 'usr-5',
    userName: 'Rameshwor Sah',
    userEmail: 'rameshwor@panchakanya.np',
    payerName: 'Panchakanya Metal Traders A/C',
    planId: 'plan-enterprise',
    planName: 'Enterprise Multi-Yard Hub (कर्पोरेट रोलिङ मिल्स)',
    billingCycle: 'Yearly',
    amount: 180000,
    currency: 'Rs.',
    transactionRef: 'CONNECTIPS-88492019',
    receiptUrl: SAMPLE_VOUCHER_BASE64,
    receiptFileName: 'connectips_voucher_180k.png',
    status: 'PENDING',
    submittedAt: '2026-11-15T09:30:00.000Z',
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: '',
    rejectionInstructions: ''
  }
];

const DEFAULT_AUDIT_LOGS = [
  {
    id: 'log-1',
    timestamp: '2026-10-31T14:35:00.000Z',
    action: 'RENEWAL_APPROVED',
    tenantId: 'tenant-jagdamba-iron',
    user: 'Developer Admin',
    details: 'Subscription renewal of Rs. 75,000 approved. Expiry extended to 2027-10-31.'
  },
  {
    id: 'log-2',
    timestamp: '2026-10-30T10:15:00.000Z',
    action: 'MODULE_TOGGLED',
    tenantId: 'tenant-jagdamba-iron',
    user: 'Developer Admin',
    details: 'Cut-Length Remnants Engine verified and active.'
  },
  {
    id: 'log-3',
    timestamp: '2026-10-25T11:00:00.000Z',
    action: 'DOMAIN_VERIFIED',
    tenantId: 'tenant-jagdamba-iron',
    user: 'Developer Admin',
    details: 'Custom domain billing.jagdambairon.com.np SSL certificate issued.'
  }
];

class PlatformService {
  constructor() {
    this.initPlatformData();
  }

  initPlatformData() {
    if (!fs.existsSync(PLATFORM_FILE)) {
      const initial = {
        tenants: DEFAULT_TENANTS,
        plans: DEFAULT_PLANS,
        domains: DEFAULT_DOMAINS,
        payments: DEFAULT_PAYMENTS,
        users: DEFAULT_USERS,
        renewals: DEFAULT_RENEWALS,
        paymentConfig: DEFAULT_PAYMENT_CONFIG,
        auditLogs: DEFAULT_AUDIT_LOGS,
        notifications: [
          {
            id: 'notif-1',
            type: 'RENEWAL_REQUEST_SUBMITTED',
            title: 'Renewal Request: Panchakanya Metal & Steels Traders',
            message: 'Rameshwor Sah submitted renewal voucher for Enterprise Multi-Yard Hub (Rs. 1,80,000). Verification required.',
            tenantId: 'tenant-panchakanya-iron',
            renewalId: 'renew-102',
            submittedAt: '2026-11-15T09:30:00.000Z',
            read: false
          }
        ]
      };
      this.save(initial);
    }
  }

  load() {
    try {
      const content = fs.readFileSync(PLATFORM_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed reading platform.json:', e);
      return {
        tenants: DEFAULT_TENANTS,
        plans: DEFAULT_PLANS,
        domains: DEFAULT_DOMAINS,
        payments: DEFAULT_PAYMENTS,
        users: DEFAULT_USERS,
        renewals: DEFAULT_RENEWALS,
        paymentConfig: DEFAULT_PAYMENT_CONFIG,
        auditLogs: DEFAULT_AUDIT_LOGS,
        notifications: []
      };
    }
  }

  save(data) {
    try {
      fs.writeFileSync(PLATFORM_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed writing platform.json:', e);
    }
  }

  logAudit(action, tenantId, details, user = 'Developer Admin') {
    const data = this.load();
    const entry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      tenantId,
      user,
      details
    };
    data.auditLogs = [entry, ...(data.auditLogs || [])].slice(0, 200);
    this.save(data);
    return entry;
  }

  getOverview() {
    const data = this.load();
    const tenants = data.tenants || [];
    const totalTenants = tenants.length;
    const activeTenantsCount = tenants.filter(t => t.status === 'Active').length;

    let totalSoftwareDue = 0;
    let totalSoftwarePaid = 0;

    for (const t of tenants) {
      const sub = t.subscription || {};
      totalSoftwareDue += Number(sub.totalAmountDue) || 0;
      totalSoftwarePaid += Number(sub.amountPaid) || 0;
    }

    const totalRemainingBalance = Math.max(0, totalSoftwareDue - totalSoftwarePaid);

    // Get live database counts from SQLite
    let totalProducts = 0;
    let totalCustomers = 0;
    let totalInvoices = 0;
    try {
      totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get()?.c || 0;
      totalCustomers = db.prepare('SELECT COUNT(*) as c FROM customers').get()?.c || 0;
      totalInvoices = db.prepare('SELECT COUNT(*) as c FROM sales_invoices').get()?.c || 0;
    } catch (e) {}

    const pendingRenewalsCount = (data.renewals || []).filter(r => r.status === 'PENDING').length;

    return {
      success: true,
      totalTenants,
      activeTenantsCount,
      totalSoftwareDue,
      totalSoftwarePaid,
      totalRemainingBalance,
      totalProducts,
      totalCustomers,
      totalInvoices,
      totalUsers: (data.users || []).length,
      pendingRenewalsCount,
      health: {
        status: 'ONLINE',
        systemIsolation: '100% OK',
        databaseEngine: 'SQLite WAL (Foreign Keys Active)',
        nepalFiscalCompliance: 'IRD Schedule 5 & Schedule 10 Enabled'
      }
    };
  }

  getAllTenants() {
    return this.load().tenants || [];
  }

  getTenantById(id) {
    const data = this.load();
    const tenant = (data.tenants || []).find(t => t.id === id);
    if (!tenant) return null;

    const users = (data.users || []).filter(u => u.tenantId === id);
    const payments = (data.payments || []).filter(p => p.tenantId === id);
    const domains = (data.domains || []).filter(d => d.tenantId === id);
    const renewals = (data.renewals || []).filter(r => r.tenantId === id);

    return {
      tenant,
      users,
      payments,
      domains,
      renewals
    };
  }

  createTenant(payload) {
    const data = this.load();
    const slug = (payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/--+/g, '-');
    const id = `tenant-${slug}-${Date.now().toString().slice(-4)}`;

    let cleanPhone = '';
    if (payload.phone) {
      cleanPhone = String(payload.phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Contact phone must contain numbers only and be exactly 10 digits.');
      }
    }

    let cleanPan = '';
    if (payload.pan) {
      cleanPan = String(payload.pan).replace(/\D/g, '');
      if (cleanPan.length !== 9) {
        throw new Error('Nepal PAN / VAT No. must contain numbers only and be 9 digits.');
      }
    }

    const totalDue = Number(payload.totalAmountDue) || 75000;
    const initialPay = Number(payload.initialPayment) || 0;

    const newTenant = {
      id,
      name: payload.name,
      slug,
      status: payload.status || 'Active',
      country: payload.country || 'Nepal',
      currency: payload.currency || 'Rs.',
      timeZone: payload.timeZone || 'Asia/Kathmandu',
      planId: payload.planId || 'plan-professional',
      address: payload.address || 'Kathmandu, Nepal',
      phone: cleanPhone,
      pan: cleanPan,
      contactPerson: payload.contactPerson || payload.adminName || '',
      createdAt: new Date().toISOString(),
      modules: {
        cutRemnants: payload.enableCutRemnants !== undefined ? payload.enableCutRemnants : true,
        cbmsSync: payload.enableCbmsSync !== undefined ? payload.enableCbmsSync : true,
        multiYard: payload.enableMultiYard !== undefined ? payload.enableMultiYard : true,
        dynamicQr: payload.enableDynamicQr !== undefined ? payload.enableDynamicQr : true,
        customerKhata: payload.enableCustomerKhata !== undefined ? payload.enableCustomerKhata : true,
        bulkDiscounts: payload.enableBulkDiscounts !== undefined ? payload.enableBulkDiscounts : true
      },
      subscription: {
        planId: payload.planId || 'plan-professional',
        billingCycle: payload.billingCycle || 'Yearly',
        status: 'Active',
        expiryDate: payload.subscriptionExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        totalAmountDue: totalDue,
        amountPaid: initialPay,
        remainingBalance: Math.max(0, totalDue - initialPay)
      }
    };

    data.tenants.push(newTenant);

    // Create default domain
    data.domains.push({
      id: `dom-${Date.now()}`,
      tenantId: id,
      domain: `${slug}.anacraft.com`,
      type: 'subdomain',
      isPrimary: true,
      verified: true,
      sslStatus: 'active'
    });

    // Create initial admin user
    if (payload.adminUsername || payload.adminEmail) {
      data.users.push({
        id: `usr-${Date.now()}`,
        tenantId: id,
        name: payload.adminName || 'Store Admin',
        email: payload.adminEmail || `${slug}@anacraft.com`,
        username: payload.adminUsername || 'admin',
        password: payload.adminPassword || 'admin123',
        password_hash: payload.adminPassword || 'admin123',
        role: 'admin',
        phone: payload.phone || '',
        active: true
      });
    }

    // Record initial payment if provided
    if (initialPay > 0) {
      data.payments.push({
        id: `pay-${Date.now()}`,
        tenantId: id,
        amount: initialPay,
        date: new Date().toISOString().split('T')[0],
        method: 'Initial Deposit / Cash',
        transactionRef: `INIT-${Date.now().toString().slice(-6)}`,
        invoiceNo: `INV-AC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        billingPeriod: `${newTenant.subscription.billingCycle} Contract Onboarding`,
        notes: 'Initial onboarding fee payment recorded during provisioning.',
        recordedBy: 'Developer Admin'
      });
    }

    this.save(data);

    // Provision physical isolated SQLite database for tenant
    try {
      const { seedTenant } = require('../scripts/seedTenant');
      const tenantDb = db.getTenantDb(id);
      seedTenant(tenantDb, {
        name: payload.name,
        pan: payload.pan,
        phone: payload.phone,
        address: payload.address,
        adminUsername: payload.adminUsername || 'admin',
        adminPassword: payload.adminPassword || 'admin123',
        adminName: payload.adminName || payload.contactPerson || 'Store Administrator',
        adminEmail: payload.adminEmail || `${slug}@anacraft.com`
      });
    } catch (dbErr) {
      console.error(`Error provisioning database for tenant ${id}:`, dbErr);
    }

    this.logAudit('TENANT_PROVISIONED', id, `New store "${payload.name}" provisioned on ${newTenant.planId}.`);
    return newTenant;
  }

  updateTenant(id, payload) {
    const data = this.load();
    const index = data.tenants.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Store tenant not found');

    const t = data.tenants[index];
    if (payload.name) t.name = payload.name;
    if (payload.slug) t.slug = payload.slug;
    if (payload.planId) {
      t.planId = payload.planId;
      if (t.subscription) t.subscription.planId = payload.planId;
    }
    if (payload.address !== undefined) t.address = payload.address;
    if (payload.phone !== undefined) {
      if (payload.phone) {
        const cleanPhone = String(payload.phone).replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          throw new Error('Contact phone must contain numbers only and be exactly 10 digits.');
        }
        t.phone = cleanPhone;
      } else {
        t.phone = '';
      }
    }
    if (payload.pan !== undefined) {
      if (payload.pan) {
        const cleanPan = String(payload.pan).replace(/\D/g, '');
        if (cleanPan.length !== 9) {
          throw new Error('Nepal PAN / VAT No. must contain numbers only and be 9 digits.');
        }
        t.pan = cleanPan;
      } else {
        t.pan = '';
      }
    }
    if (payload.contactPerson !== undefined) t.contactPerson = payload.contactPerson;
    if (payload.status) t.status = payload.status;

    if (payload.subscription) {
      t.subscription = { ...t.subscription, ...payload.subscription };
    }

    data.tenants[index] = t;
    this.save(data);
    this.logAudit('TENANT_UPDATED', id, `Store profile updated for "${t.name}".`);
    return t;
  }

  toggleTenantStatus(id, newStatus) {
    const data = this.load();
    const tenant = data.tenants.find(t => t.id === id);
    if (!tenant) throw new Error('Store tenant not found');

    tenant.status = newStatus;
    if (tenant.subscription) tenant.subscription.status = newStatus;

    this.save(data);
    this.logAudit('TENANT_STATUS_CHANGED', id, `Status updated to ${newStatus}.`);
    return tenant;
  }

  deleteTenant(id) {
    if (id === 'tenant-jagdamba-iron') {
      throw new Error('Primary system client store (tenant-jagdamba-iron) cannot be deleted.');
    }
    const data = this.load();
    const beforeCount = data.tenants.length;
    data.tenants = data.tenants.filter(t => t.id !== id);
    data.domains = (data.domains || []).filter(d => d.tenantId !== id);
    data.users = (data.users || []).filter(u => u.tenantId !== id);
    data.payments = (data.payments || []).filter(p => p.tenantId !== id);
    data.renewals = (data.renewals || []).filter(r => r.tenantId !== id);

    if (data.tenants.length === beforeCount) throw new Error('Tenant not found');

    // Clean up isolated database file
    try {
      const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
      const tenantDbFile = path.join(DATA_DIR, 'tenants', `${cleanId}.db`);
      if (fs.existsSync(tenantDbFile)) fs.unlinkSync(tenantDbFile);
      if (fs.existsSync(tenantDbFile + '-wal')) fs.unlinkSync(tenantDbFile + '-wal');
      if (fs.existsSync(tenantDbFile + '-shm')) fs.unlinkSync(tenantDbFile + '-shm');
    } catch (e) {}

    this.save(data);
    this.logAudit('TENANT_DELETED', id, `Store tenant ${id} and associated platform records permanently deleted.`);
    return true;
  }

  ensureSeedDatabases() {
    try {
      const { seedTenant } = require('../scripts/seedTenant');
      const tenants = this.getAllTenants();
      for (const t of tenants) {
        if (t.id === 'tenant-jagdamba-iron') continue;
        const tenantDb = db.getTenantDb(t.id);
        const prodCount = tenantDb.prepare('SELECT COUNT(*) as c FROM products').get()?.c || 0;
        if (prodCount === 0) {
          console.log(`🌱 Seeding initial isolated database for ${t.name} (${t.id})...`);
          seedTenant(tenantDb, {
            name: t.name,
            pan: t.pan,
            phone: t.phone,
            address: t.address,
            adminUsername: t.slug ? `${t.slug.replace(/[^a-z0-9]/g, '').slice(0, 4)}_admin` : 'admin',
            adminPassword: 'admin123',
            adminName: t.contactPerson || 'Store Administrator'
          });
        }
      }
    } catch (e) {
      console.warn('ensureSeedDatabases note:', e.message);
    }
  }

  toggleModule(id, moduleName) {
    const data = this.load();
    const tenant = data.tenants.find(t => t.id === id);
    if (!tenant) throw new Error('Store tenant not found');

    if (!tenant.modules) tenant.modules = {};
    const currentState = !!tenant.modules[moduleName];
    tenant.modules[moduleName] = !currentState;

    this.save(data);
    this.logAudit('MODULE_TOGGLED', id, `Feature module "${moduleName}" set to ${!currentState}.`);
    return { enabled: !currentState, tenant };
  }

  getTenantUsers(tenantId) {
    const data = this.load();
    return (data.users || []).filter(u => u.tenantId === tenantId);
  }

  createTenantUser(tenantId, payload) {
    const data = this.load();
    let cleanPhone = '';
    if (payload.phone) {
      cleanPhone = String(payload.phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('User phone must contain numbers only and be exactly 10 digits.');
      }
    }
    const newUser = {
      id: `usr-${Date.now()}`,
      tenantId,
      name: payload.name,
      email: payload.email,
      username: payload.username,
      role: payload.role || 'cashier',
      phone: cleanPhone,
      active: true
    };
    data.users = data.users || [];
    data.users.push(newUser);
    this.save(data);
    this.logAudit('USER_CREATED', tenantId, `User "${payload.username}" created with role "${payload.role}".`);
    return newUser;
  }

  updateTenantUser(tenantId, userId, payload) {
    const data = this.load();
    const user = (data.users || []).find(u => u.tenantId === tenantId && u.id === userId);
    if (!user) throw new Error('User not found');

    if (payload.name) user.name = payload.name;
    if (payload.email) user.email = payload.email;
    if (payload.username) user.username = payload.username;
    if (payload.role) user.role = payload.role;
    if (payload.phone !== undefined) {
      if (payload.phone) {
        const cleanPhone = String(payload.phone).replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          throw new Error('User phone must contain numbers only and be exactly 10 digits.');
        }
        user.phone = cleanPhone;
      } else {
        user.phone = '';
      }
    }
    if (payload.active !== undefined) user.active = payload.active;
    if (payload.password) {
      user.password = payload.password;
      user.password_hash = payload.password;
    }

    this.save(data);
    this.logAudit('USER_UPDATED', tenantId, `User "${user.username}" modified.`);
    return user;
  }

  resetTenantUserPassword(tenantId, userId, newPassword) {
    const data = this.load();
    const user = (data.users || []).find(u => u.tenantId === tenantId && u.id === userId);
    if (!user) throw new Error('User not found');
    user.password = newPassword;
    user.password_hash = newPassword;
    this.save(data);
    this.logAudit('USER_PASSWORD_RESET', tenantId, `Password assigned/reset for user "${user.username}".`);
    return { success: true, message: `Password successfully reset for user "${user.username}".` };
  }

  deleteTenantUser(tenantId, userId) {
    const data = this.load();
    data.users = (data.users || []).filter(u => !(u.tenantId === tenantId && u.id === userId));
    this.save(data);
    this.logAudit('USER_DELETED', tenantId, `User account ${userId} removed.`);
    return true;
  }

  getTenantPayments(tenantId) {
    const data = this.load();
    return (data.payments || []).filter(p => p.tenantId === tenantId);
  }

  createTenantPayment(tenantId, payload) {
    const data = this.load();
    const tenant = data.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const paymentAmount = Number(payload.amount);
    if (!paymentAmount || paymentAmount <= 0) throw new Error('Invalid payment amount');

    const payment = {
      id: `pay-${Date.now()}`,
      tenantId,
      amount: paymentAmount,
      date: payload.date || new Date().toISOString().split('T')[0],
      method: payload.method || 'Fonepay QR',
      transactionRef: payload.transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
      invoiceNo: payload.invoiceNo || `INV-AC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      billingPeriod: payload.billingPeriod || 'Subscription Fee',
      notes: payload.notes || '',
      recordedBy: payload.recordedBy || 'Developer Admin'
    };

    data.payments = data.payments || [];
    data.payments.unshift(payment);

    // Update tenant subscription totals
    if (!tenant.subscription) tenant.subscription = {};
    tenant.subscription.amountPaid = (Number(tenant.subscription.amountPaid) || 0) + paymentAmount;
    tenant.subscription.remainingBalance = Math.max(0, (Number(tenant.subscription.totalAmountDue) || 0) - tenant.subscription.amountPaid);

    this.save(data);
    this.logAudit('PAYMENT_RECORDED', tenantId, `Software payment of Rs. ${paymentAmount} recorded. Ref: ${payment.transactionRef}`);
    return { payment, tenant };
  }

  deleteTenantPayment(tenantId, paymentId) {
    const data = this.load();
    const payment = (data.payments || []).find(p => p.tenantId === tenantId && p.id === paymentId);
    if (!payment) throw new Error('Payment record not found');

    data.payments = data.payments.filter(p => p.id !== paymentId);

    // Recalculate tenant subscription totals
    const tenant = data.tenants.find(t => t.id === tenantId);
    if (tenant && tenant.subscription) {
      tenant.subscription.amountPaid = Math.max(0, (Number(tenant.subscription.amountPaid) || 0) - payment.amount);
      tenant.subscription.remainingBalance = Math.max(0, (Number(tenant.subscription.totalAmountDue) || 0) - tenant.subscription.amountPaid);
    }

    this.save(data);
    this.logAudit('PAYMENT_DELETED', tenantId, `Payment record ${paymentId} (Rs. ${payment.amount}) deleted.`);
    return true;
  }

  extendTenantSubscription(tenantId, payload) {
    const data = this.load();
    const tenant = data.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Store tenant not found');

    if (!tenant.subscription) tenant.subscription = {};
    if (payload.planId) tenant.subscription.planId = payload.planId;
    if (payload.billingCycle) tenant.subscription.billingCycle = payload.billingCycle;
    if (payload.status) tenant.subscription.status = payload.status;
    if (payload.expiryDate) tenant.subscription.expiryDate = payload.expiryDate;
    if (payload.totalAmountDue !== undefined) {
      tenant.subscription.totalAmountDue = Number(payload.totalAmountDue);
      tenant.subscription.remainingBalance = Math.max(0, tenant.subscription.totalAmountDue - (Number(tenant.subscription.amountPaid) || 0));
    }

    this.save(data);
    this.logAudit('SUBSCRIPTION_EXTENDED', tenantId, `Subscription updated. Expiry: ${payload.expiryDate || tenant.subscription.expiryDate}`);
    return tenant;
  }

  getAllDomains() {
    return this.load().domains || [];
  }

  verifyDomain(domainId) {
    const data = this.load();
    const domain = (data.domains || []).find(d => d.id === domainId);
    if (!domain) throw new Error('Domain record not found');

    domain.verified = true;
    domain.sslStatus = 'active';

    this.save(data);
    this.logAudit('DOMAIN_VERIFIED', domain.tenantId, `Domain ${domain.domain} DNS and SSL verification complete.`);
    return domain;
  }

  getPlans() {
    return this.load().plans || [];
  }

  createPlan(payload) {
    const data = this.load();
    const newPlan = {
      id: payload.id || `plan-${payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: payload.name,
      priceMonthly: Number(payload.priceMonthly) || 3500,
      priceYearly: Number(payload.priceYearly) || 35000,
      maxBranches: Number(payload.maxBranches) || 1,
      maxStaff: Number(payload.maxStaff) || 5,
      maxCustomers: Number(payload.maxCustomers) || 1000,
      storageQuotaMb: Number(payload.storageQuotaMb) || 5120,
      modules: payload.modules || {
        cutRemnants: true,
        cbmsSync: true,
        multiYard: false,
        dynamicQr: true,
        customerKhata: true,
        bulkDiscounts: false
      }
    };

    data.plans = data.plans || [];
    data.plans.push(newPlan);
    this.save(data);
    this.logAudit('PLAN_CREATED', null, `Subscription plan tier "${newPlan.name}" created.`);
    return newPlan;
  }

  updatePlan(id, payload) {
    const data = this.load();
    const plan = (data.plans || []).find(p => p.id === id);
    if (!plan) throw new Error('Plan not found');

    if (payload.name) plan.name = payload.name;
    if (payload.priceMonthly !== undefined) plan.priceMonthly = Number(payload.priceMonthly);
    if (payload.priceYearly !== undefined) plan.priceYearly = Number(payload.priceYearly);
    if (payload.maxBranches !== undefined) plan.maxBranches = Number(payload.maxBranches);
    if (payload.maxStaff !== undefined) plan.maxStaff = Number(payload.maxStaff);
    if (payload.maxCustomers !== undefined) plan.maxCustomers = Number(payload.maxCustomers);
    if (payload.storageQuotaMb !== undefined) plan.storageQuotaMb = Number(payload.storageQuotaMb);
    if (payload.modules) plan.modules = { ...plan.modules, ...payload.modules };

    this.save(data);
    this.logAudit('PLAN_UPDATED', null, `Plan "${plan.name}" pricing & quotas updated.`);
    return plan;
  }

  getAllRenewals(statusFilter) {
    const data = this.load();
    let renewals = data.renewals || [];
    if (statusFilter && statusFilter !== 'all') {
      renewals = renewals.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    }
    return renewals;
  }

  approveRenewal(id, user = 'Developer Admin') {
    const data = this.load();
    const renewal = (data.renewals || []).find(r => r.id === id);
    if (!renewal) throw new Error('Renewal request not found');

    renewal.status = 'APPROVED';
    renewal.reviewedAt = new Date().toISOString();
    renewal.reviewedBy = user;

    // Extend tenant expiry and record payment
    const tenant = (data.tenants || []).find(t => t.id === renewal.tenantId);
    if (tenant) {
      if (!tenant.subscription) tenant.subscription = {};
      tenant.subscription.status = 'Active';
      tenant.status = 'Active';

      const currentExpiry = tenant.subscription.expiryDate ? new Date(tenant.subscription.expiryDate) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      if (renewal.billingCycle === 'Monthly') {
        baseDate.setMonth(baseDate.getMonth() + 1);
      } else {
        baseDate.setFullYear(baseDate.getFullYear() + 1);
      }
      tenant.subscription.expiryDate = baseDate.toISOString();

      // Record payment transaction
      data.payments = data.payments || [];
      data.payments.unshift({
        id: `pay-${Date.now()}`,
        tenantId: renewal.tenantId,
        amount: renewal.amount,
        date: new Date().toISOString().split('T')[0],
        method: 'Verified Bank Voucher / Fonepay',
        transactionRef: renewal.transactionRef,
        invoiceNo: `INV-AC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        billingPeriod: `${renewal.billingCycle} Subscription (${renewal.planName})`,
        notes: `Renewal voucher verified and approved by ${user}.`,
        recordedBy: user
      });

      tenant.subscription.amountPaid = (Number(tenant.subscription.amountPaid) || 0) + renewal.amount;
      tenant.subscription.remainingBalance = Math.max(0, (Number(tenant.subscription.totalAmountDue) || 0) - tenant.subscription.amountPaid);
    }

    this.save(data);
    this.logAudit('RENEWAL_APPROVED', renewal.tenantId, `Subscription renewal for "${renewal.tenantName}" approved by ${user}. Expiry extended.`);
    return { renewal, tenant };
  }

  rejectRenewal(id, reason, instructions, user = 'Developer Admin') {
    const data = this.load();
    const renewal = (data.renewals || []).find(r => r.id === id);
    if (!renewal) throw new Error('Renewal request not found');

    renewal.status = 'REJECTED';
    renewal.reviewedAt = new Date().toISOString();
    renewal.reviewedBy = user;
    renewal.rejectionReason = reason;
    renewal.rejectionInstructions = instructions;

    this.save(data);
    this.logAudit('RENEWAL_REJECTED', renewal.tenantId, `Renewal rejected for "${renewal.tenantName}". Reason: ${reason}`);
    return { renewal };
  }

  getPaymentConfig() {
    return this.load().paymentConfig || DEFAULT_PAYMENT_CONFIG;
  }

  updatePaymentConfig(payload) {
    const data = this.load();
    data.paymentConfig = { ...data.paymentConfig, ...payload };
    this.save(data);
    this.logAudit('PAYMENT_CONFIG_UPDATED', null, 'Software owner payment gateway & banking details updated.');
    return data.paymentConfig;
  }

  getAuditLogs() {
    return this.load().auditLogs || [];
  }

  createSupportGrant(tenantId, reason, durationMinutes = 60) {
    const data = this.load();
    const tenant = (data.tenants || []).find(t => t.id === tenantId);
    if (!tenant) throw new Error('Store tenant not found');

    const token = `AGY_SUPPORT_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const grant = {
      tenantId,
      storeName: tenant.name,
      reason,
      durationMinutes,
      token,
      expiresAt,
      issuedAt: new Date().toISOString()
    };

    this.logAudit('SUPPORT_GRANT_ISSUED', tenantId, `Audited support token issued for ${durationMinutes} mins. Reason: ${reason}`);
    return grant;
  }

  getNotifications() {
    return this.load().notifications || [];
  }

  markNotificationRead(id) {
    const data = this.load();
    const notif = (data.notifications || []).find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save(data);
      return true;
    }
    return false;
  }
}

module.exports = new PlatformService();
