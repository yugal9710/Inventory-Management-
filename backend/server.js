require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('./db/schema');
const db = require('./db/database');

// Initialize SQLite Schema
initSchema();

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

// Register API Routes
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
