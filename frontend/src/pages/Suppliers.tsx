import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Receipt
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Supplier } from '../types';
import { formatNpr } from '../utils/formatters';

export const Suppliers: React.FC = () => {
  const { t, language } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected supplier ledger
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  // New Supplier modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    company_name: '',
    phone: '',
    address: '',
    pan_vat: '',
    opening_balance: 0,
    notes: ''
  });

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers(data.data);
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

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        loadSuppliers();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.company_name && s.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (s.pan_vat && s.pan_vat.includes(search))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'आपूर्तिकर्ता तथा भुक्तानी खाता' : 'Suppliers & Accounts Payable'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage steel mills (Jagdamba, Panchakanya, Hulas), cement suppliers, and purchase ledgers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Suppliers List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search mills, companies, PAN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((s) => {
              const isSelected = selectedSupplier?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => viewSupplierLedger(s.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-500 shadow-md ring-1 ring-orange-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{s.name}</h4>
                      {s.company_name && <span className="text-xs text-slate-500">{s.company_name}</span>}
                      {s.pan_vat && (
                        <span className="block font-mono text-[10px] text-slate-400 font-semibold">
                          PAN: {s.pan_vat}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Balance Payable</span>
                      <span className={`font-mono font-bold text-sm ${s.current_balance > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatNpr(s.current_balance)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    {s.address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{s.address}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Supplier Purchase Ledger (7 cols) */}
        <div className="lg:col-span-7">
          {selectedSupplier ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{selectedSupplier.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedSupplier.company_name} | {selectedSupplier.address} {selectedSupplier.phone ? `| Phone: ${selectedSupplier.phone}` : ''}
                  </p>
                  {selectedSupplier.pan_vat && (
                    <span className="inline-block mt-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                      स्थायी लेखा नं. (PAN): {selectedSupplier.pan_vat}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Purchased</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatNpr(selectedSupplier.total_purchased)}
                  </span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">Total Payments Paid</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatNpr(selectedSupplier.total_paid)}
                  </span>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <span className="text-red-700 block">Balance Payable (तिर्नुपर्ने)</span>
                  <span className="font-mono font-black text-red-700 text-sm">
                    {formatNpr(selectedSupplier.current_balance)}
                  </span>
                </div>
              </div>

              {/* Purchases History */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Purchases & Invoices
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[240px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">PO Ref</th>
                        <th className="p-2">Supplier Inv</th>
                        <th className="p-2">Date (BS)</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">Paid</th>
                        <th className="p-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSupplier.purchases?.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">{p.purchase_order_no}</td>
                          <td className="p-2 font-mono text-slate-600">{p.supplier_invoice_no}</td>
                          <td className="p-2 font-mono text-slate-600">{p.date_bs}</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatNpr(p.total_amount)}</td>
                          <td className="p-2 text-right font-mono text-emerald-700">{formatNpr(p.amount_paid)}</td>
                          <td className="p-2 text-right font-mono font-bold text-red-600">{formatNpr(p.balance_due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments History */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Payment History (भुक्तानी विवरण)
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
                      {selectedSupplier.payments?.map((pay: any) => (
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
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Select a supplier from the list on the left to view their detailed purchase ledger.
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Add New Mill / Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Supplier / Mill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jagdamba Steels Ltd. / Hulas Steel"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Parent Company / Group</label>
                <input
                  type="text"
                  placeholder="e.g. Shanker Group"
                  value={newSupplier.company_name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, company_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PAN / VAT No</label>
                  <input
                    type="text"
                    placeholder="9 digits"
                    value={newSupplier.pan_vat}
                    onChange={(e) => setNewSupplier({ ...newSupplier, pan_vat: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Birgunj / Kathmandu"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
