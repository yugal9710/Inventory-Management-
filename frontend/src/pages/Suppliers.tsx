import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  Edit2,
  RotateCcw,
  Calendar,
  Hash,
  Tag,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Supplier } from '../types';
import { formatNpr } from '../utils/formatters';
import { getTodayBs } from '../utils/nepaliCalendar';
import { SupplierVoucherModal, SupplierVoucherData } from '../components/SupplierVoucherModal';

export const Suppliers: React.FC = () => {
  const { t, language } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected supplier ledger
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  // Add/Edit Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    supplier_code: '',
    name: '',
    company_name: '',
    phone: '',
    address: '',
    pan_vat: '',
    opening_balance: 0,
    notes: ''
  });

  // Record Payment to Supplier Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDateBs, setPayDateBs] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'QR_FONEPAY'>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState<string>('');
  const [payPurchaseId, setPayPurchaseId] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [submittingPay, setSubmittingPay] = useState(false);
  const [printOnSave, setPrintOnSave] = useState<boolean>(true);

  // Print Voucher Modal
  const [printVoucherData, setPrintVoucherData] = useState<SupplierVoucherData | null>(null);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const viewSupplierLedger = async (id: number) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedSupplier(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to open Add Modal
  const handleOpenAddModal = () => {
    setEditingSupplierId(null);
    setSupplierForm({
      supplier_code: `SUPP-${String(suppliers.length + 1).padStart(4, '0')}`,
      name: '',
      company_name: '',
      phone: '',
      address: '',
      pan_vat: '',
      opening_balance: 0,
      notes: ''
    });
    setShowSupplierModal(true);
  };

  // Helper to open Edit Modal
  const handleOpenEditModal = (s: any) => {
    setEditingSupplierId(s.id);
    setSupplierForm({
      supplier_code: s.supplier_code || `SUPP-${String(s.id).padStart(4, '0')}`,
      name: s.name || '',
      company_name: s.company_name || '',
      phone: s.phone || '',
      address: s.address || '',
      pan_vat: s.pan_vat || '',
      opening_balance: s.opening_balance || 0,
      notes: s.notes || ''
    });
    setShowSupplierModal(true);
  };

  // Save Supplier (Add or Update)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      alert('Please enter supplier name / आपूर्तिकर्ताको नाम अनिवार्य छ ।');
      return;
    }

    // Phone validation: exactly 10 digits if provided
    if (supplierForm.phone && supplierForm.phone.replace(/\D/g, '').length !== 10) {
      alert(language === 'np' ? 'फोन नम्बर अनिवार्य रूपमा १० अंकको हुनुपर्दछ ।' : 'Phone number must be exactly 10 digits.');
      return;
    }

    // PAN validation: exactly 9 digits if provided
    if (supplierForm.pan_vat && supplierForm.pan_vat.replace(/\D/g, '').length !== 9) {
      alert(language === 'np' ? 'स्थायी लेखा नं. (PAN) अनिवार्य रूपमा ९ अंकको हुनुपर्दछ ।' : 'PAN/VAT number must be exactly 9 digits.');
      return;
    }

    try {
      const url = editingSupplierId ? `/api/suppliers/${editingSupplierId}` : '/api/suppliers';
      const method = editingSupplierId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowSupplierModal(false);
        await loadSuppliers();
        if (selectedSupplier && editingSupplierId === selectedSupplier.id) {
          await viewSupplierLedger(selectedSupplier.id);
        }
      } else {
        alert(data.error || 'Failed to save supplier');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving supplier');
    }
  };

  // Fetch and display official payment voucher
  const handleFetchAndPrintVoucher = async (paymentId: number) => {
    if (!selectedSupplier) return;
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}/payment/${paymentId}/voucher`);
      const data = await res.json();
      if (data.success && data.data) {
        setPrintVoucherData(data.data);
      } else {
        alert(data.error || 'Failed to load voucher details');
      }
    } catch (err: any) {
      alert(err.message || 'Error loading voucher');
    }
  };

  // Record Payment to Supplier
  const handleRecordPayment = async (e?: React.FormEvent, forcePrint: boolean = false) => {
    if (e) e.preventDefault();
    if (!selectedSupplier) return;
    if (payAmount <= 0) {
      alert(language === 'np' ? 'कृपया ० भन्दा बढी रकम प्रविष्ट गर्नुहोस् ।' : 'Please enter a payment amount greater than 0.');
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          date_bs: payDateBs || getTodayBs(),
          method: payMethod,
          referenceNumber: payRef,
          purchase_id: payPurchaseId ? Number(payPurchaseId) : null,
          notes: payNotes,
          userId: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPayModal(false);
        const shouldPrint = forcePrint || printOnSave;
        const newPaymentId = data.paymentId;

        setPayAmount(0);
        setPayRef('');
        setPayNotes('');
        setPayPurchaseId('');
        await viewSupplierLedger(selectedSupplier.id);
        await loadSuppliers();

        if (shouldPrint && newPaymentId) {
          await handleFetchAndPrintVoucher(newPaymentId);
        }
      } else {
        alert(data.error || 'Failed to record supplier payment');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  // Reverse / Audit Adjustment for Supplier Payment Voucher
  const handleReversePayment = async (paymentId: number) => {
    const reason = window.prompt(
      language === 'np'
        ? 'भौचर रद्द/समायोजन गर्नुको कारण खुलाउनुहोस् (Audit Reason):'
        : 'Reason for payment voucher reversal / audit adjustment:'
    );
    if (reason === null) return;

    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}/payment/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || 'Audit reversal by authorized accountant',
          userId: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        await viewSupplierLedger(selectedSupplier.id);
        await loadSuppliers();
      } else {
        alert(data.error || 'Failed to reverse voucher');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.supplier_code && s.supplier_code.toLowerCase().includes(search.toLowerCase())) ||
    (s.company_name && s.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (s.pan_vat && s.pan_vat.includes(search)) ||
    (s.phone && s.phone.includes(search))
  );

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'आपूर्तिकर्ता तथा भुक्तानी खाता' : 'Suppliers & Accounts Payable'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage steel mills (Jagdamba, Panchakanya, Hulas), cement suppliers, and purchase ledgers.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-orange-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Suppliers List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search mills, companies, PAN, code (e.g. SUPP-0001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                No suppliers matching search criteria.
              </div>
            ) : (
              filtered.map((s) => {
                const isSelected = selectedSupplier?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => viewSupplierLedger(s.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-500 shadow-md ring-1 ring-orange-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.name}</h4>
                          {s.supplier_code && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {s.supplier_code}
                            </span>
                          )}
                        </div>
                        {s.company_name && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            {s.company_name}
                          </span>
                        )}
                        {s.pan_vat && (
                          <span className="block font-mono text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            PAN: {s.pan_vat}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Balance Payable</span>
                        <span className={`font-mono font-black text-sm ${s.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatNpr(s.current_balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      {s.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.phone}
                        </span>
                      )}
                      {s.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {s.address}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Supplier Purchase Ledger (7 cols) */}
        <div className="lg:col-span-7">
          {selectedSupplier ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">
                      {selectedSupplier.name}
                    </h3>
                    {selectedSupplier.supplier_code && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                        {selectedSupplier.supplier_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedSupplier.company_name ? `${selectedSupplier.company_name} • ` : ''}
                    {selectedSupplier.address || 'Address not specified'}
                    {selectedSupplier.phone ? ` • Phone: ${selectedSupplier.phone}` : ''}
                  </p>
                  {selectedSupplier.pan_vat && (
                    <span className="inline-block mt-2 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      स्थायी लेखा नं. (PAN): {selectedSupplier.pan_vat}
                    </span>
                  )}
                </div>

                {/* Profile Actions: Edit Supplier & Record Payment */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(selectedSupplier)}
                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                    title="Edit supplier profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setPayAmount(Math.max(0, selectedSupplier.current_balance));
                      setPayDateBs(getTodayBs());
                      setPayMethod('BANK_TRANSFER');
                      setPayRef('');
                      setPayPurchaseId('');
                      setPayNotes('');
                      setShowPayModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Payment (भुक्तानी भौचर)</span>
                  </button>
                </div>
              </div>

              {/* Financial Balance Summary (3 cards) */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* Total Purchased */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">Total Purchased</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base block mt-0.5">
                    {formatNpr(selectedSupplier.total_purchased)}
                  </span>
                  {selectedSupplier.opening_balance > 0 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-mono">
                      + Opening Bal: {formatNpr(selectedSupplier.opening_balance)}
                    </span>
                  )}
                </div>

                {/* Total Payments Paid */}
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                  <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-semibold">Total Payments Paid</span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-base block mt-0.5">
                    {formatNpr(selectedSupplier.total_paid)}
                  </span>
                </div>

                {/* Balance Payable */}
                <div className={`p-3.5 rounded-xl border shadow-2xs ${
                  selectedSupplier.current_balance > 0
                    ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                }`}>
                  <span className="text-red-700 dark:text-red-400 block text-[11px] font-semibold">Balance Payable (तिर्नुपर्ने)</span>
                  <span className="font-mono font-black text-red-700 dark:text-red-300 text-base block mt-0.5">
                    {formatNpr(selectedSupplier.current_balance)}
                  </span>
                </div>
              </div>

              {/* Purchases History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Purchases & Goods Received (खरीद बिल इतिहास)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedSupplier.purchases?.length || 0} Purchase Orders
                  </span>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">PO Ref</th>
                        <th className="p-2.5">Supplier Inv</th>
                        <th className="p-2.5">Date (BS)</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Paid</th>
                        <th className="p-2.5 text-right">Balance</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {!selectedSupplier.purchases || selectedSupplier.purchases.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400 text-xs">
                            No purchases recorded yet for this supplier
                          </td>
                        </tr>
                      ) : (
                        selectedSupplier.purchases?.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{p.purchase_order_no}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{p.supplier_invoice_no || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{p.date_bs}</td>
                            <td className="p-2.5 text-right font-mono font-semibold">{formatNpr(p.total_amount)}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-700 dark:text-emerald-400">{formatNpr(p.amount_paid)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">{formatNpr(p.balance_due)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                p.balance_due <= 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : p.amount_paid > 0
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}>
                                {p.balance_due <= 0 ? 'PAID' : p.amount_paid > 0 ? 'PARTIAL' : 'UNPAID'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Payment History (भुक्तानी विवरण)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Auditable Ledger • Reversals Recorded as Adjustments
                  </span>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Date (BS)</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Reference / PO Allocation</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {!selectedSupplier.payments || selectedSupplier.payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 text-xs">
                            No payment vouchers recorded yet
                          </td>
                        </tr>
                      ) : (
                        selectedSupplier.payments?.map((pay: any) => {
                          const isReversalEntry = pay.amount < 0 || pay.is_reversal === 1;
                          const isAlreadyReversed = pay.is_reversal === 2;

                          return (
                            <tr
                              key={pay.id}
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                                isReversalEntry
                                  ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                  : isAlreadyReversed
                                  ? 'opacity-60 bg-slate-50/40 dark:bg-slate-800/30 line-through'
                                  : ''
                              }`}
                            >
                              <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                                <div className="font-bold">{pay.date_bs}</div>
                                <div className="text-[10px] text-slate-400 font-mono">PV-#{pay.id}</div>
                              </td>
                              <td className="p-2.5 font-semibold">
                                <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                  {pay.method}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                <div className="font-mono text-slate-800 dark:text-slate-200">
                                  {pay.reference_number || '—'}
                                </div>
                                {pay.invoice_no && (
                                  <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold font-mono">
                                    Allocated: {pay.invoice_no}
                                  </div>
                                )}
                                {pay.notes && (
                                  <div className="text-[10.5px] text-slate-500 truncate max-w-xs">
                                    {pay.notes}
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-sm">
                                {isReversalEntry ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    -{formatNpr(Math.abs(pay.amount))}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    +{formatNpr(pay.amount)}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleFetchAndPrintVoucher(pay.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 transition flex items-center gap-1 cursor-pointer"
                                    title="Print payment disbursement voucher"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>Voucher</span>
                                  </button>

                                  {!isReversalEntry && !isAlreadyReversed ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReversePayment(pay.id)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 cursor-pointer"
                                      title="Record an audit adjustment / reversal voucher"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reverse</span>
                                    </button>
                                  ) : isAlreadyReversed ? (
                                    <span className="text-[10px] text-slate-400 font-semibold italic">
                                      Reversed
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold italic">
                                      Adjustment
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 text-xs">
              <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">No Supplier Selected</h4>
              <p>Select a steel mill or supplier from the list on the left to view their detailed purchase ledger, records, and payments.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {editingSupplierId ? 'Edit Mill / Supplier Profile' : 'Add New Mill / Supplier'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Register steel mills, cement distributors, or hardware vendors with unique supplier code.
                </p>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
              {/* Supplier Code */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Supplier Unique Code (कोड) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={supplierForm.supplier_code}
                    onChange={(e) => setSupplierForm({ ...supplierForm, supplier_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUPP-0005"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Supplier / Mill Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jagdamba Steels Ltd. / Hulas Steel"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Parent Company */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Parent Company / Corporate Group
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shanker Group / Golchha Group"
                  value={supplierForm.company_name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Phone & PAN Grid with strictly enforced digits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Contact Phone
                    </label>
                    <span className={`text-[10px] font-mono font-semibold ${
                      supplierForm.phone.length === 10
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400'
                    }`}>
                      {supplierForm.phone.length}/10 digits
                    </span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="98XXXXXXXX"
                    value={supplierForm.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setSupplierForm({ ...supplierForm, phone: clean });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      PAN / VAT No
                    </label>
                    <span className={`text-[10px] font-mono font-semibold ${
                      supplierForm.pan_vat.length === 9
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400'
                    }`}>
                      {supplierForm.pan_vat.length}/9 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="9 digits"
                    value={supplierForm.pan_vat}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setSupplierForm({ ...supplierForm, pan_vat: clean });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mill / Yard Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Simara, Bara / Birgunj / Kathmandu"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Opening Balance (only when creating) */}
              {!editingSupplierId && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Opening Balance Payable (शुरुवाती तिर्नुपर्ने रकम)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={supplierForm.opening_balance || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, opening_balance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary rebar supplier, credit terms 45 days"
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition cursor-pointer"
                >
                  {editingSupplierId ? 'Update Supplier Profile' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment to Supplier Modal (भुक्तानी भौचर) */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Record Supplier Payment (भुक्तानी भौचर)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedSupplier.name} • Payable Due: {formatNpr(selectedSupplier.current_balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              {/* Payment Amount */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Amount (Rs) / भुक्तानी रकम *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-base text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Date in Bikram Sambat (BS) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date in Bikram Sambat (BS) / भौचर मिति (वि.सं.) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DD (e.g. 2083-08-05)"
                    value={payDateBs}
                    onChange={(e) => setPayDateBs(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Method / भुक्तानी माध्यम *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / RTGS (बैंक दाखिला)</option>
                  <option value="CHEQUE">Account Payee Cheque (चेक)</option>
                  <option value="CASH">Cash (नगद भुक्तानी)</option>
                  <option value="QR_FONEPAY">QR / Digital (डिजिटल)</option>
                </select>
              </div>

              {/* Purchase Order Allocation */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Purchase Order Allocation (बिल मिलान)
                </label>
                <select
                  value={payPurchaseId}
                  onChange={(e) => setPayPurchaseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="">Auto: Allocate to Oldest Unpaid Purchase Orders / On Account</option>
                  {selectedSupplier.purchases?.filter((po: any) => po.balance_due > 0).map((po: any) => (
                    <option key={po.id} value={po.id}>
                      {po.purchase_order_no} ({po.date_bs}) - Due: {formatNpr(po.balance_due)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference / Cheque No */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reference / Cheque / Bank Txn No (भौचर / चेक नं.)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #102938 or Nabil Bank Ref 994821"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Remarks / Notes (कैफियत)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Payment for rebar batch consignment"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Option to Print Voucher */}
              <div className="flex items-center justify-between p-3 bg-orange-50/70 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 rounded-lg">
                    <Printer className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Print Voucher on Post (भौचर प्रिन्ट)
                    </span>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Auto-opens official disbursement voucher with IRD details and QR code
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printOnSave}
                    onChange={(e) => setPrintOnSave(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPay ? 'Posting...' : 'Confirm & Post'}
                </button>
                <button
                  type="button"
                  disabled={submittingPay}
                  onClick={(e) => handleRecordPayment(e, true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>{submittingPay ? 'Posting...' : 'Post & Print Voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Voucher Print Modal */}
      {printVoucherData && (
        <SupplierVoucherModal
          voucher={printVoucherData}
          onClose={() => setPrintVoucherData(null)}
        />
      )}
    </div>
  );
};

export default Suppliers;
