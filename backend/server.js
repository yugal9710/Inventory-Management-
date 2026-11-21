require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
console.log('📦 Initializing SQLite database connection...');
const db = require('./db/database');
console.log('✓ Database connected successfully.');

console.log('📦 Initializing schema...');
const { initSchema } = require('./db/schema');
initSchema();
console.log('✓ Schema initialized successfully.');

// Auto-seed if database is fresh on cloud deployment
try {
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get()?.count || 0;
  if (prodCount === 0) {
    console.log('🌱 Empty database detected on startup. Auto-seeding catalog & initial Nepal iron data...');
    require('./scripts/seed');
  }
} catch (e) {
  console.warn('Auto-seed check note:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure seed databases for pre-configured platform tenants
const platformService = require('./services/platformService');
try {
  platformService.ensureSeedDatabases();
} catch (pErr) {
  console.warn('ensureSeedDatabases note:', pErr.message);
}

// Tenant Resolution & Data Isolation Middleware
app.use((req, res, next) => {
  // Only process /api routes
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // 1. Resolve requested tenant
  let requestedTenantId = req.headers['x-tenant-id'] || req.query.tenantId;

  // 2. Decode user session if authorization header present
  let authUser = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      authUser = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      req.user = authUser;
    } catch (e) {}
  }

  // 3. Authorization & Tenant Access Control:
  // Non-super_admin users are strictly locked to their assigned store!
  if (authUser && authUser.role !== 'super_admin' && authUser.tenantId) {
    if (requestedTenantId && requestedTenantId !== authUser.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are only authorized to access your assigned store tenant.'
      });
    }
    requestedTenantId = authUser.tenantId;
  }

  // 4. Default fallback to primary store (Jagdamba Steel)
  const resolvedTenantId = requestedTenantId || authUser?.tenantId || 'tenant-jagdamba-iron';
  req.tenantId = resolvedTenantId;

  // 5. Run request handler within tenant context
  try {
    const tenantDb = db.getTenantDb(resolvedTenantId);
    db.tenantStorage.run({ tenantId: resolvedTenantId, db: tenantDb }, () => {
      next();
    });
  } catch (err) {
    console.error(`Tenant resolution error for [${resolvedTenantId}]:`, err);
    res.status(500).json({ success: false, error: 'Database access error for tenant: ' + err.message });
  }
});

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/cashbook', require('./routes/cashbook'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/cbms', require('./routes/cbms'));
app.use('/api/platform', require('./routes/platform'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    app: 'Nepal Iron Store Inventory & Billing System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if in production
const fs = require('fs');
const rootBuild = path.join(__dirname, '../build');
const frontendDist = path.join(__dirname, '../frontend/dist');
const staticDir = fs.existsSync(rootBuild) ? rootBuild : (fs.existsSync(frontendDist) ? frontendDist : null);

if (staticDir) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(staticDir, 'index.html'));
    }
    next();
  });
}

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nepal Iron Store API Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});
