const express = require('express');
const router = express.Router();
const db = require('../db/database');
const crypto = require('crypto');

// Generate safe auth token
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.full_name,
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

    // Verify user is not already registered
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR (phone IS NOT NULL AND phone != \'\' AND phone = ?)').get(cleanUser, cleanPhone || '__dummy__');
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this username or phone number is already registered. Please sign in instead. / यो नाम वा फोन नम्बर पहिले नै दर्ता छ ।'
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
      active: 1
    };

    const token = generateToken(newUser);

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

    // Look up registered user in SQLite
    const user = db.prepare(`
      SELECT id, username, password_hash, full_name, role, phone, active 
      FROM users 
      WHERE LOWER(username) = ? OR phone = ?
    `).get(cleanUser, cleanUser);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unregistered user. No account found for this Login ID. Please register first. / दर्ता नभएको प्रयोगकर्ता । पहिले दर्ता गर्नुहोस् ।'
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

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone
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

    const user = db.prepare('SELECT id, username, full_name, role, phone, active FROM users WHERE id = ?').get(session.userId);
    if (!user || user.active !== 1) {
      return res.status(401).json({ success: false, message: 'Session expired or user inactive' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone
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
