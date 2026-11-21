const express = require('express');
const router = express.Router();
const platformService = require('../services/platformService');

// Overview KPIs & System Telemetry
router.get('/overview', (req, res) => {
  try {
    const data = platformService.getOverview();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tenants / Stores Management
router.get('/tenants', (req, res) => {
  try {
    const tenants = platformService.getAllTenants();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tenants', (req, res) => {
  try {
    const newTenant = platformService.createTenant(req.body);
    res.status(201).json({ success: true, tenant: newTenant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/tenants/:id', (req, res) => {
  try {
    const profile = platformService.getTenantById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Store tenant not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/tenants/:id', (req, res) => {
  try {
    const updated = platformService.updateTenant(req.params.id, req.body);
    res.json({ success: true, tenant: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/tenants/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const updated = platformService.toggleTenantStatus(req.params.id, status);
    res.json({ success: true, tenant: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/tenants/:id', (req, res) => {
  try {
    platformService.deleteTenant(req.params.id);
    res.json({ success: true, message: 'Store tenant deleted permanently' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/tenants/:id/toggle-module', (req, res) => {
  try {
    const { module } = req.body;
    const result = platformService.toggleModule(req.params.id, module);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Store Users
router.get('/tenants/:id/users', (req, res) => {
  try {
    const users = platformService.getTenantUsers(req.params.id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tenants/:id/users', (req, res) => {
  try {
    const user = platformService.createTenantUser(req.params.id, req.body);
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/tenants/:id/users/:userId', (req, res) => {
  try {
    const user = platformService.updateTenantUser(req.params.id, req.params.userId, req.body);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/tenants/:id/users/:userId', (req, res) => {
  try {
    platformService.deleteTenantUser(req.params.id, req.params.userId);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/tenants/:id/users/:userId/reset-password', (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }
    const result = platformService.resetTenantUserPassword(req.params.id, req.params.userId, newPassword.trim());
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Store Payments & Ledger
router.get('/tenants/:id/payments', (req, res) => {
  try {
    const payments = platformService.getTenantPayments(req.params.id);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tenants/:id/payments', (req, res) => {
  try {
    const result = platformService.createTenantPayment(req.params.id, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/tenants/:id/payments/:paymentId', (req, res) => {
  try {
    platformService.deleteTenantPayment(req.params.id, req.params.paymentId);
    res.json({ success: true, message: 'Payment record deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Extend Subscription
router.post('/tenants/:id/subscription/extend', (req, res) => {
  try {
    const tenant = platformService.extendTenantSubscription(req.params.id, req.body);
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Domain Management
router.get('/domains', (req, res) => {
  try {
    const domains = platformService.getAllDomains();
    res.json(domains);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/domains/verify', (req, res) => {
  try {
    const { domainId } = req.body;
    const domain = platformService.verifyDomain(domainId);
    res.json({ success: true, domain });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Subscription Plans
router.get('/subscriptions', (req, res) => {
  try {
    const plans = platformService.getPlans();
    const tenants = platformService.getAllTenants();
    res.json({ plans, tenants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/plans', (req, res) => {
  try {
    const plan = platformService.createPlan(req.body);
    res.status(201).json({ success: true, plan });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/plans/:id', (req, res) => {
  try {
    const plan = platformService.updatePlan(req.params.id, req.body);
    res.json({ success: true, plan });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Renewals & Receipts Verification
router.get('/renewals', (req, res) => {
  try {
    const { status } = req.query;
    const renewals = platformService.getAllRenewals(status);
    res.json(renewals);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/renewals/:id/approve', (req, res) => {
  try {
    const result = platformService.approveRenewal(req.params.id, 'Developer Admin');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/renewals/:id/reject', (req, res) => {
  try {
    const { reason, instructions } = req.body;
    const result = platformService.rejectRenewal(req.params.id, reason, instructions, 'Developer Admin');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Software Owner Payment Gateway Config
router.get('/payment-config', (req, res) => {
  try {
    const config = platformService.getPaymentConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/payment-config', (req, res) => {
  try {
    const config = platformService.updatePaymentConfig(req.body);
    res.json({ success: true, paymentConfig: config });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Audit Logs
router.get('/audit-logs', (req, res) => {
  try {
    const logs = platformService.getAuditLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audited Support Access Grant
router.post('/support-grant', (req, res) => {
  try {
    const { tenantId, reason, durationMinutes } = req.body;
    const grant = platformService.createSupportGrant(tenantId, reason, durationMinutes);
    res.json({ success: true, grant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Notifications
router.get('/notifications', (req, res) => {
  try {
    const notifs = platformService.getNotifications();
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/notifications/:id/read', (req, res) => {
  try {
    const success = platformService.markNotificationRead(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
