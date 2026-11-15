const express = require('express');
const router = express.Router();
const CbmsService = require('../services/cbmsService');
const db = require('../db/database');

// GET CBMS status & test connection
router.get('/status', async (req, res) => {
  try {
    const testResult = await CbmsService.testConnection();
    const config = CbmsService.getConfig();
    res.json({
      success: true,
      config: {
        enabled: config.enabled,
        apiUrl: config.apiUrl,
        sellerPan: config.sellerPan,
        fiscalYear: config.fiscalYear
      },
      connection: testResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET transmission logs
router.get('/logs', (req, res) => {
  try {
    const logs = CbmsService.getLogs(Number(req.query.limit || 50));
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST resync all pending/failed invoices
router.post('/resync-all', async (req, res) => {
  try {
    const pendingSales = db.prepare(`
      SELECT id FROM sales 
      WHERE cbms_sync_status IN ('PENDING', 'FAILED')
      ORDER BY id ASC
    `).all();

    const results = [];
    for (const s of pendingSales) {
      try {
        const syncRes = await CbmsService.syncInvoice(s.id);
        results.push({ saleId: s.id, success: syncRes.success, syncCode: syncRes.syncCode });
      } catch (e) {
        results.push({ saleId: s.id, success: false, error: e.message });
      }
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
