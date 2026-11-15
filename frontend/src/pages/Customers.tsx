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
  DollarSign
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Customer } from '../types';
import { formatNpr } from '../utils/formatters';

export const Customers: React.FC = () => {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected customer for Statement of Account (खता हिसाब)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    pan_vat: '',
    credit_limit: 200000,
    payment_terms_days: 30,
    opening_balance: 0,
    notes: ''
  });

  // Record Payment Voucher Modal (जम्मा भौचर)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'QR_FONEPAY' | 'CHEQUE'>('CASH');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

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

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        loadCustomers();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || payAmount <= 0) return;

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
          referenceNumber: payRef,
          notes: payNotes,
          userId: 2
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPayModal(false);
        setPayAmount(0);
        setPayRef('');
        setPayNotes('');
        // Refresh customer statement & list
        viewCustomerStatement(selectedCustomer.id);
        loadCustomers();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.pan_vat && c.pan_vat.includes(search))
  );

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'ग्राहक तथा उधारो खाता (Khata Ledger)' : 'Customers & Credit Khata'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer profiles, credit limits, deposit receipts (जम्मा भौचर), and statements.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Main Grid: Customer Directory & Selected Customer Khata Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer Directory List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name, phone, PAN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => viewCustomerStatement(c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-500 shadow-md ring-1 ring-orange-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                      {c.pan_vat && (
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          PAN: {c.pan_vat}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Balance Due</span>
                      <span className={`font-mono font-bold text-sm ${c.current_balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {formatNpr(c.current_balance)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{c.address}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Khata Statement & Receipts View (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              {/* Header Profile */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedCustomer.address} {selectedCustomer.phone ? `| Phone: ${selectedCustomer.phone}` : ''}
                  </p>
                  {selectedCustomer.pan_vat && (
                    <span className="inline-block mt-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                      स्थायी लेखा नं. (PAN): {selectedCustomer.pan_vat}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setPayAmount(Math.max(0, selectedCustomer.current_balance));
                    setShowPayModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow transition-colors"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Record Payment (जम्मा भौचर)</span>
                </button>
              </div>

              {/* Balance Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Invoiced</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatNpr(selectedCustomer.total_invoiced)}
                  </span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">Total Payments</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatNpr(selectedCustomer.total_paid)}
                  </span>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <span className="text-red-700 block">Outstanding Balance</span>
                  <span className="font-mono font-black text-red-700 text-sm">
                    {formatNpr(selectedCustomer.current_balance)}
                  </span>
                </div>
              </div>

              {/* Invoices History Table */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Invoices History
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">Invoice No</th>
                        <th className="p-2">Date (BS)</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">Paid</th>
                        <th className="p-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomer.invoices?.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">{inv.invoice_no}</td>
                          <td className="p-2 font-mono text-slate-600">{inv.date_bs}</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatNpr(inv.total_amount)}</td>
                          <td className="p-2 text-right font-mono text-emerald-700">{formatNpr(inv.amount_paid)}</td>
                          <td className="p-2 text-right font-mono font-bold text-red-600">{formatNpr(inv.balance_due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments History Table */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Receipts & Payment History (जम्मा विवरण)
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[200px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">Date (BS)</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Reference</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomer.payments?.map((pay: any) => (
                        <tr key={pay.id}>
                          <td className="p-2 font-mono text-slate-600">{pay.date_bs}</td>
                          <td className="p-2 font-semibold text-slate-800">{pay.method}</td>
                          <td className="p-2 font-mono text-slate-500">{pay.reference_number || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatNpr(pay.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Select a customer from the directory on the left to view their detailed Khata Statement of Account.
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Voucher Modal */}
      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Customer Deposit Receipt (जम्मा भौचर)</span>
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border">
                <span className="text-slate-500 block">Customer:</span>
                <strong className="text-slate-900 text-sm">{selectedCustomer.name}</strong>
                <div className="text-red-600 font-bold font-mono mt-1">
                  Current Khata Balance: {formatNpr(selectedCustomer.current_balance)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Receipt Amount (Rs) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-emerald-700 text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="CASH">Cash (काउन्टर नगद)</option>
                  <option value="BANK_TRANSFER">Bank Deposit / connectIPS</option>
                  <option value="QR_FONEPAY">Fonepay / NEPALPAY QR</option>
                  <option value="CHEQUE">Cheque (बैंक चेक)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cheque No / Slip No / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991828"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Advance deposit for rebar order"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow"
                >
                  Issue Receipt & Update Khata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Add New Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer / Firm Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Nirman Sewa / Ram Shrestha"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PAN / VAT No (स्थायी लेखा नं.)</label>
                  <input
                    type="text"
                    placeholder="9 digits"
                    value={newCustomer.pan_vat}
                    onChange={(e) => setNewCustomer({ ...newCustomer, pan_vat: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Koteshwor, Kathmandu"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credit Limit (Rs)</label>
                  <input
                    type="number"
                    value={newCustomer.credit_limit}
                    onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    value={newCustomer.payment_terms_days}
                    onChange={(e) => setNewCustomer({ ...newCustomer, payment_terms_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
