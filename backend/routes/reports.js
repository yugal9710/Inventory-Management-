const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');

// GET dashboard KPIs
router.get('/dashboard', (req, res) => {
  try {
    const summary = ReportService.getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET VAT Sales Register (Schedule 10)
router.get('/vat-sales', (req, res) => {
  try {
    const { fromDateBs, toDateBs, fiscalYear } = req.query;
    const report = ReportService.getVatSalesRegister({ fromDateBs, toDateBs, fiscalYear });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET VAT Purchase Register (Schedule 9)
router.get('/vat-purchases', (req, res) => {
  try {
    const { fromDateBs, toDateBs, fiscalYear } = req.query;
    const report = ReportService.getVatPurchaseRegister({ fromDateBs, toDateBs, fiscalYear });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Stock on hand & valuation
router.get('/stock-valuation', (req, res) => {
  try {
    const report = ReportService.getStockValuationReport();
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Profit & Margin
router.get('/profit-margin', (req, res) => {
  try {
    const { fromDateBs, toDateBs } = req.query;
    const report = ReportService.getProfitMarginReport({ fromDateBs, toDateBs });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Customer Khata Aging
router.get('/customer-aging', (req, res) => {
  try {
    const report = ReportService.getCustomerAgingReport();
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
