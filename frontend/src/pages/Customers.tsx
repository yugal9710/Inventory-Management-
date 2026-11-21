import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  History,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  DollarSign,
  Edit2,
  Mail,
  Building2,
  FileText,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Calendar,
  Hash,
  RefreshCw,
  Tag
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Customer } from '../types';
import { formatNpr } from '../utils/formatters';
import { getTodayBs } from '../utils/nepaliCalendar';
import NepalAddressFields, {
  NepalLocation,
  EMPTY_NEPAL_LOCATION,
  formatFullNepalAddress
} from '../components/Common/NepalAddressFields';

export const Customers: React.FC = () => {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected customer for Statement of Account (खाता हिसाब)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Add/Edit Customer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);

  const initialFormState = {
    customer_code: '',
    name: '',
    customer_type: 'Contractor',
    contact_person: '',
    phone: '',
    secondary_phone: '',
    email: '',
    pan_vat: '',
    credit_limit: 200000,
    payment_terms_days: 30,
    opening_balance: 0,
    notes: ''
  };

  const [customerForm, setCustomerForm] = useState(initialFormState);
  const [permanentLocation, setPermanentLocation] = useState<NepalLocation>(EMPTY_NEPAL_LOCATION);
  const [temporaryLocation, setTemporaryLocation] = useState<NepalLocation>(EMPTY_NEPAL_LOCATION);
  const [sameAsPermanent, setSameAsPermanent] = useState<boolean>(true);

  // Record Payment Voucher Modal (जम्मा भौचर)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDateBs, setPayDateBs] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'QR_FONEPAY' | 'CHEQUE'>('CASH');
  const [payRef, setPayRef] = useState<string>('');
  const [payInvoiceId, setPayInvoiceId] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const viewCustomerStatement = async (id: number) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open modal in create mode with auto-generated unique ID/Code
  const handleOpenCreateModal = async () => {
    setEditingCustomerId(null);
    setPermanentLocation(EMPTY_NEPAL_LOCATION);
    setTemporaryLocation(EMPTY_NEPAL_LOCATION);
    setSameAsPermanent(true);

    let nextCode = 'CUST-0001';
    try {
      const res = await fetch('/api/customers/next-code');
      const data = await res.json();
      if (data.success && data.nextCode) {
        nextCode = data.nextCode;
      }
    } catch (e) {
      console.warn('Failed to fetch next customer code:', e);
    }

    setCustomerForm({
      ...initialFormState,
      customer_code: nextCode
    });
    setShowAddModal(true);
  };

  // Open modal in edit mode
  const handleOpenEditModal = (cust: any) => {
    setEditingCustomerId(cust.id);
    setCustomerForm({
      customer_code: cust.customer_code || `CUST-${String(cust.id).padStart(4, '0')}`,
      name: cust.name || '',
      customer_type: cust.customer_type || 'Contractor',
      contact_person: cust.contact_person || '',
      phone: cust.phone || '',
      secondary_phone: cust.secondary_phone || '',
      email: cust.email || '',
      pan_vat: cust.pan_vat || '',
      credit_limit: cust.credit_limit || 0,
      payment_terms_days: cust.payment_terms_days || 30,
      opening_balance: cust.opening_balance || 0,
      notes: cust.notes || ''
    });

    let meta: any = null;
    try {
      if (cust.location_meta) {
        meta = typeof cust.location_meta === 'string' ? JSON.parse(cust.location_meta) : cust.location_meta;
      }
    } catch (e) {
      console.warn('Error parsing location_meta:', e);
    }

    if (meta && meta.permanent) {
      setPermanentLocation(meta.permanent);
      setTemporaryLocation(meta.temporary || meta.permanent);
      setSameAsPermanent(meta.sameAsPermanent !== undefined ? !!meta.sameAsPermanent : true);
    } else {
      setPermanentLocation({
        ...EMPTY_NEPAL_LOCATION,
        tole: cust.permanent_address || cust.address || ''
      });
      setTemporaryLocation({
        ...EMPTY_NEPAL_LOCATION,
        tole: cust.temporary_address || cust.address || ''
      });
      setSameAsPermanent(!cust.temporary_address || cust.temporary_address === cust.permanent_address);
    }

    setShowAddModal(true);
  };

  // Handle Permanent Address changes & auto-sync to temporary if sameAsPermanent
  const handlePermanentAddressChange = (nextLoc: NepalLocation) => {
    setPermanentLocation(nextLoc);
    if (sameAsPermanent) {
      setTemporaryLocation({ ...nextLoc });
    }
  };

  // Handle Temporary Address changes
  const handleTemporaryAddressChange = (nextLoc: NepalLocation) => {
    setTemporaryLocation(nextLoc);
  };

  // Toggle "Same as Permanent Address"
  const handleToggleSameAsPermanent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSameAsPermanent(isChecked);
    if (isChecked) {
      setTemporaryLocation({ ...permanentLocation });
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      alert(language === 'np' ? 'कृपया ग्राहकको नाम राख्नुहोस् ।' : 'Customer name is required.');
      return;
    }

    try {
      const permComposed = formatFullNepalAddress(permanentLocation, language === 'np' ? 'np' : 'en');
      const tempComposed = sameAsPermanent
        ? permComposed
        : formatFullNepalAddress(temporaryLocation, language === 'np' ? 'np' : 'en');

      const payload = {
        ...customerForm,
        permanent_address: permComposed,
        temporary_address: tempComposed,
        address: tempComposed || permComposed || customerForm.notes || '',
        location_meta: {
          permanent: permanentLocation,
          temporary: sameAsPermanent ? permanentLocation : temporaryLocation,
          sameAsPermanent
        }
      };

      const url = editingCustomerId ? `/api/customers/${editingCustomerId}` : '/api/customers';
      const method = editingCustomerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setEditingCustomerId(null);
        await loadCustomers();
        if (editingCustomerId) {
          viewCustomerStatement(editingCustomerId);
        }
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving customer');
    }
  };

  // Record Payment Voucher
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (payAmount <= 0) {
      alert(language === 'np' ? 'कृपया ० भन्दा बढी रकम प्रविष्ट गर्नुहोस् ।' : 'Please enter a payment amount greater than 0.');
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          date_bs: payDateBs || getTodayBs(),
          method: payMethod,
          referenceNumber: payRef,
          invoice_id: payInvoiceId ? Number(payInvoiceId) : null,
          notes: payNotes,
          userId: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPayModal(false);
        setPayAmount(0);
        setPayRef('');
        setPayNotes('');
        setPayInvoiceId('');
        await viewCustomerStatement(selectedCustomer.id);
        await loadCustomers();
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  // Reverse / Audit Adjustment Voucher
  const handleReversePayment = async (paymentId: number) => {
    const reason = window.prompt(
      language === 'np'
        ? 'भौचर रद्द/समायोजन गर्नुको कारण खुलाउनुहोस् (Audit Reason):'
        : 'Reason for payment voucher reversal / audit adjustment:'
    );
    if (reason === null) return; // User cancelled

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/payment/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || 'Audit reversal by authorized user',
          userId: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        await viewCustomerStatement(selectedCustomer.id);
        await loadCustomers();
      } else {
        alert(data.error || 'Failed to reverse voucher');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing reversal');
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search)) ||
      (c.pan_vat && c.pan_vat.includes(search)) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span>{language === 'np' ? 'ग्राहक तथा उधारो खाता (Khata Ledger)' : 'Customers & Credit Khata'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'np'
              ? 'ग्राहक प्रोफाइल, स्थानीय तह ठेगाना, उधारो सीमा, र भुक्तानी विवरण व्यवस्थापन'
              : 'Manage customer profiles, dependent local-level addresses, credit limits, and ledger accounts.'}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-orange-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'np' ? 'नयाँ ग्राहक थप्नुहोस्' : 'Add New Customer'}</span>
        </button>
      </div>

      {/* Main Grid: Customer Directory & Selected Customer Khata Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer Directory List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={language === 'np' ? 'नाम, फोन वा प्यान नम्बरबाट खोज्नुहोस्...' : 'Search by name, phone, PAN, address...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading customers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                No customer profiles found.
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => viewCustomerStatement(c.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-500 shadow-md ring-1 ring-orange-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                            {c.customer_code || `CUST-${String(c.id).padStart(4, '0')}`}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{c.name}</h4>
                          {c.customer_type && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                              {c.customer_type}
                            </span>
                          )}
                        </div>
                        {c.pan_vat && (
                          <span className="font-mono text-[10px] text-slate-400 font-semibold block mt-0.5">
                            PAN: {c.pan_vat}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Balance Due</span>
                        <span className={`font-mono font-bold text-sm ${c.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatNpr(c.current_balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {c.phone && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </span>
                      )}
                      {(c.address || c.permanent_address) && (
                        <span className="flex items-center gap-1 truncate text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.address || c.permanent_address}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Khata Statement & Receipts View (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              {/* Header Profile with Edit Button & Record Payment Button */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {selectedCustomer.customer_code || `CUST-${String(selectedCustomer.id).padStart(4, '0')}`}
                    </span>
                    <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">{selectedCustomer.name}</h3>
                    {selectedCustomer.customer_type && (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800">
                        {selectedCustomer.customer_type}
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1 font-mono">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.contact_person && (
                      <span>• Contact: <strong>{selectedCustomer.contact_person}</strong></span>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="pt-1.5 space-y-1 text-xs">
                    {selectedCustomer.permanent_address && (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">स्थायी (Permanent):</span>
                        <span className="font-medium">{selectedCustomer.permanent_address}</span>
                      </div>
                    )}
                    {selectedCustomer.temporary_address && (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">अस्थायी (Current):</span>
                        <span className="font-medium">{selectedCustomer.temporary_address}</span>
                      </div>
                    )}
                    {!selectedCustomer.permanent_address && !selectedCustomer.temporary_address && selectedCustomer.address && (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">ठेगाना (Address):</span>
                        <span className="font-medium">{selectedCustomer.address}</span>
                      </div>
                    )}
                  </div>

                  {selectedCustomer.pan_vat && (
                    <div className="mt-2">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        PAN / VAT: {selectedCustomer.pan_vat}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Actions: Edit & Record Payment */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(selectedCustomer)}
                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                    title="Edit profile & address"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setPayAmount(Math.max(0, selectedCustomer.current_balance));
                      setPayDateBs(getTodayBs());
                      setPayMethod('CASH');
                      setPayRef('');
                      setPayInvoiceId('');
                      setPayNotes('');
                      setShowPayModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Record Payment (जम्मा भौचर)</span>
                  </button>
                </div>
              </div>

              {/* Balance Summary Cards: Consistent Two Decimal Places */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* Total Invoiced */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">Total Invoiced</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base block mt-0.5">
                    {formatNpr(selectedCustomer.total_invoiced)}
                  </span>
                  {selectedCustomer.opening_balance > 0 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-mono">
                      + Opening Bal: {formatNpr(selectedCustomer.opening_balance)}
                    </span>
                  )}
                </div>

                {/* Total Payments */}
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                  <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-semibold">Total Payments</span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-base block mt-0.5">
                    {formatNpr(selectedCustomer.total_paid)}
                  </span>
                  <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 block mt-1 font-mono">
                    {selectedCustomer.payments?.length || 0} Vouchers Settled
                  </span>
                </div>

                {/* Outstanding Balance */}
                <div className="bg-rose-50/80 dark:bg-rose-950/40 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                  <span className="text-rose-700 dark:text-rose-400 block text-[11px] font-semibold">Outstanding Balance</span>
                  <span className="font-mono font-black text-rose-700 dark:text-rose-300 text-base block mt-0.5">
                    {formatNpr(selectedCustomer.current_balance)}
                  </span>
                  <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 block mt-1 font-mono">
                    {selectedCustomer.current_balance <= 0 ? '✓ Fully Cleared / Advance' : 'Due for Settlement'}
                  </span>
                </div>
              </div>

              {/* INVOICES HISTORY */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Invoices History
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedCustomer.invoices?.length || 0} Invoices Issued
                  </span>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Invoice No</th>
                        <th className="p-2.5">Date (BS)</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Paid</th>
                        <th className="p-2.5 text-right">Balance</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {/* Opening Balance Row if present */}
                      {selectedCustomer.opening_balance > 0 && (
                        <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-medium">
                          <td className="p-2.5 font-mono font-bold text-amber-800 dark:text-amber-400">
                            OPENING-BALANCE
                          </td>
                          <td className="p-2.5 font-mono text-slate-500">2083-01-01</td>
                          <td className="p-2.5 text-right font-mono font-semibold">
                            {formatNpr(selectedCustomer.opening_balance)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatNpr(Math.max(0, Math.min(selectedCustomer.opening_balance, selectedCustomer.total_paid)))}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                            {formatNpr(Math.max(0, selectedCustomer.opening_balance - selectedCustomer.total_paid))}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              OPENING
                            </span>
                          </td>
                        </tr>
                      )}

                      {(!selectedCustomer.invoices || selectedCustomer.invoices.length === 0) && selectedCustomer.opening_balance <= 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400 text-xs">
                            No invoices issued yet
                          </td>
                        </tr>
                      ) : (
                        selectedCustomer.invoices?.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">{inv.invoice_no}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{inv.date_bs}</td>
                            <td className="p-2.5 text-right font-mono font-semibold">{formatNpr(inv.total_amount)}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatNpr(inv.amount_paid)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatNpr(inv.balance_due)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`text-[9.5px] px-2 py-0.5 rounded font-bold border ${
                                inv.payment_status === 'PAID' || inv.balance_due <= 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : inv.amount_paid > 0
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}>
                                {inv.balance_due <= 0 ? 'PAID' : inv.amount_paid > 0 ? 'PARTIAL' : 'UNPAID'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RECEIPTS & PAYMENT HISTORY */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Receipts & Payment History (जम्मा विवरण)
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
                        <th className="p-2.5">Reference / Invoice Allocation</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {!selectedCustomer.payments || selectedCustomer.payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 text-xs">
                            No payment vouchers recorded yet
                          </td>
                        </tr>
                      ) : (
                        selectedCustomer.payments?.map((pay: any) => {
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
                              {/* Date & Voucher ID */}
                              <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                                <div className="font-bold">{pay.date_bs}</div>
                                <div className="text-[10px] text-slate-400 font-mono">VCH-#{pay.id}</div>
                              </td>

                              {/* Method */}
                              <td className="p-2.5 font-semibold">
                                <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                  {pay.method}
                                </span>
                              </td>

                              {/* Reference / Invoice Allocation */}
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

                              {/* Amount */}
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

                              {/* Action (Reversal / Adjustment) */}
                              <td className="p-2.5 text-center">
                                {!isReversalEntry && !isAlreadyReversed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReversePayment(pay.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 mx-auto cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              {language === 'np'
                ? 'खाता विवरण तथा भौचर हेर्न देब्रेपट्टिको सूचीबाट ग्राहक छनौट गर्नुहोस् ।'
                : 'Select a customer from the directory on the left to view their detailed Khata Statement of Account.'}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Profile Modal with Nepal Local-Level Hierarchy */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 my-auto border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                    {editingCustomerId
                      ? (language === 'np' ? 'ग्राहक प्रोफाइल सम्पादन' : 'Edit Customer Profile')
                      : (language === 'np' ? 'नयाँ ग्राहक दर्ता प्रोफाइल' : 'Add New Customer Profile')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'np'
                      ? 'नेपाल स्थानीय तह ठेगाना प्रणाली तथा उधारो खाता सर्तहरू'
                      : 'Dependent Nepal Local-Level Hierarchy & Commercial Credit Profile'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveCustomer} className="space-y-4 overflow-y-auto pr-1 text-xs">
              
              {/* SECTION 1: General Information & Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>1. General & Contact Information (आधारभूत तथा सम्पर्क विवरण)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Customer ID / Code (Auto-generated & Editable) */}
                  <div className="sm:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {language === 'np' ? 'ग्राहक कोड / आइडी' : 'Customer ID / Code'}
                        <span className="text-rose-500 ml-0.5">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/customers/next-code');
                            const data = await res.json();
                            if (data.success && data.nextCode) {
                              setCustomerForm(prev => ({ ...prev, customer_code: data.nextCode }));
                            }
                          } catch (e) {}
                        }}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        title={language === 'np' ? 'अद्वितीय कोड पुनः सिर्जना गर्नुहोस्' : 'Regenerate next unique code'}
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>{language === 'np' ? 'अटो जेनेरेट' : 'Auto Code'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. CUST-0012"
                        value={customerForm.customer_code}
                        onChange={(e) => setCustomerForm({ ...customerForm, customer_code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 pl-8 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 font-mono font-bold text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-orange-500 outline-none uppercase"
                      />
                      <Hash className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Customer / Firm Name */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'ग्राहक वा फर्मको नाम' : 'Customer / Firm Name'}
                      <span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABC Nirman Sewa / Ram Shrestha"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* Customer Category */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'ग्राहकको प्रकार' : 'Customer Category'}
                    </label>
                    <select
                      value={customerForm.customer_type}
                      onChange={(e) => setCustomerForm({ ...customerForm, customer_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                    >
                      <option value="Contractor">Contractor (ठेकेदार / बिल्डर)</option>
                      <option value="Retailer">Retailer (खुद्रा ग्राहक)</option>
                      <option value="Wholesaler">Wholesaler (थोक बिक्रेता)</option>
                      <option value="Fabricator">Fabricator (ग्रील / फेब्रिकेटर)</option>
                      <option value="Individual Builder">Individual Builder (व्यक्तिगत घरधनी)</option>
                      <option value="Government / Agency">Government / Agency (सरकारी / निकाय)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Primary Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'प्राथमिक मोबाइल नं.' : 'Primary Phone / Mobile'}
                      <span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="98XXXXXXXX (10 digits)"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* Contact Person */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'सम्पर्क व्यक्ति' : 'Contact Person'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dinesh Adhikari (Manager)"
                      value={customerForm.contact_person}
                      onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* PAN / VAT */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'स्थायी लेखा नं. (PAN / VAT)' : 'PAN / VAT No (9 Digits)'}
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="9 digits"
                      value={customerForm.pan_vat}
                      onChange={(e) => setCustomerForm({ ...customerForm, pan_vat: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Secondary Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'वैकल्पिक सम्पर्क नं.' : 'Secondary / Landline Phone'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01-XXXXXXX"
                      value={customerForm.secondary_phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, secondary_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'इमेल ठेगाना' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      placeholder="customer@domain.com"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Nepal Local-Level Address Hierarchy */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>2. Nepal Administrative Address Hierarchy (स्थानीय तह ठेगाना प्रणाली)</span>
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-mono">
                    7 Provinces • 77 Districts • 753 Local Levels
                  </span>
                </div>

                {/* Permanent Address */}
                <NepalAddressFields
                  title={language === 'np' ? 'स्थायी ठेगाना (Permanent Address)' : 'Permanent Address'}
                  badge={language === 'np' ? 'नागरिकता / दर्ता प्रमाण' : 'Official Registered Address'}
                  value={permanentLocation}
                  onChange={handlePermanentAddressChange}
                  lang={language === 'np' ? 'np' : 'en'}
                  required
                />

                {/* "Same as Permanent Address" Checkbox */}
                <div className="bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 rounded-xl p-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sameAsPermanent}
                      onChange={handleToggleSameAsPermanent}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer accent-orange-600"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {language === 'np'
                          ? 'हालको ठेगाना र स्थायी ठेगाना एउटै हो (Same as Permanent Address)'
                          : 'Temporary / Current Address is the same as Permanent Address'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {language === 'np'
                          ? 'चिन्ह लगाउँदा स्थायी ठेगाना स्वतः हालको ठेगानामा प्रतिलिपि हुनेछ ।'
                          : 'Checking this box automatically mirrors the permanent address to temporary address.'}
                      </span>
                    </div>
                  </label>
                  {sameAsPermanent && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      ✓ Auto-Synced
                    </span>
                  )}
                </div>

                {/* Temporary Address (Shown or editable based on sameAsPermanent) */}
                {!sameAsPermanent ? (
                  <NepalAddressFields
                    title={language === 'np' ? 'हालको / अस्थायी ठेगाना (Temporary / Current Address)' : 'Temporary / Current Address'}
                    badge={language === 'np' ? 'हाल बसोबास / साइट' : 'Current Residence / Project Site'}
                    value={temporaryLocation}
                    onChange={handleTemporaryAddressChange}
                    lang={language === 'np' ? 'np' : 'en'}
                    required
                  />
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between">
                    <span className="truncate">
                      <strong>Current Address:</strong> {formatFullNepalAddress(permanentLocation, language === 'np' ? 'np' : 'en') || '— Same as Permanent Address —'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSameAsPermanent(false)}
                      className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      Use Different Address
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 3: Financial & Credit Parameters */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>3. Financial, Credit Limits & Khata Terms (उधारो तथा खाता सर्तहरू)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Credit Limit */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'उधारो सीमा (Credit Limit Rs)' : 'Credit Limit (Rs)'}
                    </label>
                    <input
                      type="number"
                      value={customerForm.credit_limit}
                      onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* Payment Terms Days */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'भुक्तानी म्याद (Payment Terms Days)' : 'Payment Terms (Days)'}
                    </label>
                    <input
                      type="number"
                      value={customerForm.payment_terms_days}
                      onChange={(e) => setCustomerForm({ ...customerForm, payment_terms_days: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* Opening Balance */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'np' ? 'सुरुवाती बाँकी रकम (Opening Balance)' : 'Opening Balance (Rs)'}
                    </label>
                    <input
                      type="number"
                      disabled={!!editingCustomerId}
                      value={customerForm.opening_balance}
                      onChange={(e) => setCustomerForm({ ...customerForm, opening_balance: Number(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded-xl font-mono ${
                        editingCustomerId
                          ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500'
                      } outline-none`}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'डेलिभरी ठेगाना निर्देशन वा कैफियत' : 'Delivery Landmark / Internal Remarks'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={language === 'np' ? 'जस्तै: खोला पारीको साइड, सम्पर्क व्यक्ति उत्तम थापा' : 'e.g. Near Bridge Construction Site, Contact driver on arrival'}
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {language === 'np' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{editingCustomerId ? (language === 'np' ? 'अपडेट गर्नुहोस्' : 'Update Profile') : (language === 'np' ? 'ग्राहक दर्ता गर्नुहोस्' : 'Save Customer Profile')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Voucher Modal (जम्मा भौचर) */}
      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {language === 'np' ? 'ग्राहक भुक्तानी रसिद (जम्मा भौचर)' : 'Record Payment (जम्मा भौचर)'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedCustomer.name} • Due: {formatNpr(selectedCustomer.current_balance)}
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

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              {/* Payment Amount */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Amount (Rs) / जम्मा रकम *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="e.g. 35000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-base text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
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
                    placeholder="YYYY-MM-DD (e.g. 2083-08-02)"
                    value={payDateBs}
                    onChange={(e) => setPayDateBs(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Method / माध्यम *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="CASH">Cash (नगद)</option>
                  <option value="QR_FONEPAY">QR / FonePay (डिजिटल)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (बैंक दाखिला)</option>
                  <option value="CHEQUE">Cheque (चेक)</option>
                </select>
              </div>

              {/* Invoice Allocation */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Invoice Allocation (बिल मिलान)
                </label>
                <select
                  value={payInvoiceId}
                  onChange={(e) => setPayInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="">Auto: Allocate to Oldest Due Invoices / On Account</option>
                  {selectedCustomer.invoices?.filter((inv: any) => inv.balance_due > 0).map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_no} ({inv.date_bs}) - Due: {formatNpr(inv.balance_due)}
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
                  placeholder="e.g. FonePay Ref 849302 or Cheque #102938"
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
                  placeholder="e.g. Received partial payment against steel delivery"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                />
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPay ? 'Posting...' : 'Confirm & Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
