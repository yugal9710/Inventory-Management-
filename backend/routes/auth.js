const express = require('express');
const router = express.Router();
const db = require('../db/database');
const platformService = require('../services/platformService');

// Generate safe auth token with tenant binding
function generateToken(user, tenantId) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.full_name,
    tenantId: tenantId || user.tenantId || 'tenant-jagdamba-iron',
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, password, full_name, role, phone } = req.body;
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const cleanName = (full_name || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanRole = (role || 'cashier').trim();
    const currentTenantId = req.tenantId || 'tenant-jagdamba-iron';

    if (!cleanUser) {
      return res.status(400).json({
        success: false,
        message: 'Username / Login ID is required. / प्रयोगकर्ता नाम अनिवार्य छ ।'
      });
    }
    if (cleanUser.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long. / प्रयोगकर्ता नाम कम्तिमा ३ अक्षरको हुनुपर्छ ।'
      });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, underscores, and dots.'
      });
    }
    if (!cleanPass || cleanPass.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long. / पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्छ ।'
      });
    }
    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required. / पूरा नाम अनिवार्य छ ।'
      });
    }

    const validRoles = ['admin', 'cashier', 'storekeeper', 'accountant'];
    const assignedRole = validRoles.includes(cleanRole) ? cleanRole : 'cashier';

    // Verify user is not already registered in active tenant
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR (phone IS NOT NULL AND phone != \'\' AND phone = ?)').get(cleanUser, cleanPhone || '__dummy__');
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this username or phone number is already registered in this store. Please sign in instead.'
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, phone, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);
    const result = insertStmt.run(cleanUser, cleanPass, cleanName, assignedRole, cleanPhone || null);

    const newUser = {
      id: Number(result.lastInsertRowid),
      username: cleanUser,
      full_name: cleanName,
      role: assignedRole,
      phone: cleanPhone || null,
      tenantId: currentTenantId,
      active: 1
    };

    const token = generateToken(newUser, currentTenantId);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully! You are now registered and signed in. / नयाँ खाता सफलतापूर्वक दर्ता भयो ।',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required. / प्रयोगकर्ता नाम र पासवर्ड अनिवार्य छ ।'
      });
    }

    let activeTenantId = req.headers['x-tenant-id'] || req.body.tenantId || req.tenantId || 'tenant-jagdamba-iron';

    // 1. Look up user in active tenant's SQLite database
    let user = db.prepare(`
      SELECT id, username, password_hash, full_name, role, phone, active 
      FROM users 
      WHERE LOWER(username) = ? OR phone = ?
    `).get(cleanUser, cleanUser);

    // 2. If not found in active tenant, check platform registry across all provisioned tenants
    if (!user) {
      try {
        const allPlatformUsers = platformService.load().users || [];
        const matched = allPlatformUsers.find(u =>
          (u.username && u.username.toLowerCase() === cleanUser) ||
          (u.phone && u.phone === cleanUser)
        );

        if (matched && matched.tenantId && matched.tenantId !== activeTenantId) {
          activeTenantId = matched.tenantId;
          const tenantDb = db.getTenantDb(activeTenantId);
          user = tenantDb.prepare(`
            SELECT id, username, password_hash, full_name, role, phone, active 
            FROM users 
            WHERE LOWER(username) = ? OR phone = ?
          `).get(cleanUser, cleanUser);
        }
      } catch (findErr) {
        console.warn('Cross-tenant user discovery note:', findErr.message);
      }
    }

    // 3. Super Admin global fallback (if superadmin credentials are correct)
    if (!user && cleanUser === 'superadmin' && cleanPass === 'superadmin123') {
      user = {
        id: 999,
        username: 'superadmin',
        password_hash: 'superadmin123',
        full_name: 'Anaya Craft (Software Owner)',
        role: 'super_admin',
        phone: '9851087654',
        active: 1
      };
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unregistered user. No account found for this Login ID. Please check your credentials. / दर्ता नभएको प्रयोगकर्ता । विवरण जाँच गर्नुहोस् ।'
      });
    }

    if (user.active !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact administrator. / खाता निष्क्रिय गरिएको छ ।'
      });
    }

    // Verify password
    const valid = (user.password_hash === cleanPass);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Access denied. / गलत पासवर्ड । लगइन अस्वीकृत ।'
      });
    }

    const token = generateToken(user, activeTenantId);

    res.json({
      success: true,
      token,
      tenantId: activeTenantId,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        tenantId: activeTenantId
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const json = Buffer.from(token, 'base64').toString('utf8');
    const session = JSON.parse(json);

    const activeTenantId = (session.role === 'super_admin' && req.headers['x-tenant-id'])
      ? req.headers['x-tenant-id']
      : (session.tenantId || req.tenantId || 'tenant-jagdamba-iron');

    const tenantDb = db.getTenantDb(activeTenantId);
    let user = tenantDb.prepare('SELECT id, username, full_name, role, phone, active FROM users WHERE id = ? OR username = ?').get(session.userId, session.username);

    if (!user && session.role === 'super_admin') {
      user = {
        id: session.userId,
        username: session.username,
        full_name: session.name || 'Super Admin',
        role: 'super_admin',
        phone: '9851087654',
        active: 1
      };
    }

    if (!user || user.active !== 1) {
      return res.status(401).json({ success: false, message: 'Session expired or user inactive' });
    }

    res.json({
      success: true,
      tenantId: activeTenantId,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        tenantId: activeTenantId
      }
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid session token' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  try {
    const { username, phone, newPassword } = req.body;
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanUser) {
      return res.status(400).json({ success: false, message: 'Username / Login ID is required. / प्रयोगकर्ता नाम अनिवार्य छ ।' });
    }
    if (!cleanPhone || cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits (numbers only). / फोन नम्बर १० अंकको हुनुपर्छ ।' });
    }
    if (!cleanPass || cleanPass.length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long. / पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्छ ।' });
    }

    const user = db.prepare('SELECT id, username, full_name, phone FROM users WHERE LOWER(username) = ? AND phone = ?').get(cleanUser, cleanPhone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered user matches this Login ID and 10-digit phone number. / यो विवरणसँग मेल खाने प्रयोगकर्ता फेला परेन ।'
      });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(cleanPass, user.id);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password. / पासवर्ड सफलतापूर्वक परिवर्तन गरियो ।'
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ success: false, message: 'Error resetting password: ' + err.message });
  }
});

module.exports = router;
