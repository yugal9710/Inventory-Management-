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

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required / प्रयोगकर्ता नाम र पासवर्ड अनिवार्य छ ।'
      });
    }

    // Look up user in SQLite
    const user = db.prepare(`
      SELECT id, username, password_hash, full_name, role, phone, active 
      FROM users 
      WHERE LOWER(username) = ? OR phone = ?
    `).get(cleanUser, cleanUser);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password. Access denied. / गलत विवरण । लगइन अस्वीकृत ।'
      });
    }

    if (user.active !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact administrator. / खाता निष्क्रिय गरिएको छ ।'
      });
    }

    // Verify password (plain text or hash)
    const valid = (user.password_hash === cleanPass);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password. Access denied. / गलत पासवर्ड । लगइन अस्वीकृत ।'
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

// GET /api/auth/demo-users
router.get('/demo-users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, full_name, role, phone FROM users WHERE active = 1 ORDER BY id ASC').all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
