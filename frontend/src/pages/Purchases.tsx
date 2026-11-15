import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  DollarSign,
  ChevronDown,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Purchase, Supplier, Product, PurchaseLine } from '../types';
import { formatNpr, formatQty } from '../utils/formatters';
import { getTodayBs } from '../utils/nepaliCalendar';

export const Purchases: React.FC = () => {
  const { t, language } = useLanguage();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail view modal
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Helper to create a fresh blank item line with zero/empty values
  const createBlankItem = (prodList: Product[] = products): PurchaseLine => {
    const firstProd = prodList[0];
    return {
      product_id: firstProd?.id || 1,
      location_id: 1,
      ordered_qty: 0,
      received_qty: 0,
      shortage_qty: 0,
      damaged_qty: 0,
      unit: firstProd?.base_unit || 'kg',
      unit_cost: 0,
      line_total: 0,
      tax_category: firstProd?.tax_category || 'VAT_13'
    };
  };

  // New GRN Modal
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>('');
  const [purchaseOrderNo, setPurchaseOrderNo] = useState<string>('');
  const [freightAmount, setFreightAmount] = useState<number>(0); // भाडा
  const [unloadingCharge, setUnloadingCharge] = useState<number>(0); // लोड/अनलोड मजदुरी
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Purchase items - starts clean with empty 0 values
  const [items, setItems] = useState<PurchaseLine[]>([
    { product_id: 1, location_id: 1, ordered_qty: 0, received_qty: 0, shortage_qty: 0, damaged_qty: 0, unit: 'kg', unit_cost: 0, line_total: 0, tax_category: 'VAT_13' }
  ]);

  // Reset entire GRN form to clean initial blank state
  const resetGrnForm = (prodList: Product[] = products) => {
    setSupplierId('');
    setSupplierInvoiceNo('');
    setPurchaseOrderNo('');
    setFreightAmount(0);
    setUnloadingCharge(0);
    setAmountPaid(0);
    setPaymentMethod('BANK_TRANSFER');
    setPaymentReference('');
    setNotes('');
    const firstProd = prodList[0];
    setItems([{
      product_id: firstProd?.id || 1,
      location_id: 1,
      ordered_qty: 0,
      received_qty: 0,
      shortage_qty: 0,
      damaged_qty: 0,
      unit: firstProd?.base_unit || 'kg',
      unit_cost: 0,
      line_total: 0,
      tax_category: firstProd?.tax_category || 'VAT_13'
    }]);
  };

  // Payment to supplier modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetPurchase, setPayTargetPurchase] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/suppliers'),
        fetch('/api/products')
      ]);
      const purData = await purRes.json();
      const supData = await supRes.json();
      const prodData = await prodRes.json();

      if (purData.success) setPurchases(purData.data);
      if (supData.success) setSuppliers(supData.data);
      if (prodData.success) setProducts(prodData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItemLine = () => {
    setItems([...items, createBlankItem()]);
  };

  const updateItemLine = (idx: number, updates: Partial<PurchaseLine>) => {
    const updated = [...items];
    const current = { ...updated[idx], ...updates };

    if ('received_qty' in updates || 'unit_cost' in updates) {
      current.line_total = Number((current.received_qty * current.unit_cost).toFixed(2));
    }
    if ('product_id' in updates) {
      const prod = products.find(p => p.id === current.product_id);
      if (prod) {
        current.unit = prod.base_unit;
        current.unit_cost = prod.cost_price;
        current.line_total = current.received_qty * current.unit_cost;
        current.tax_category = prod.tax_category;
      }
    }

    updated[idx] = current;
    setItems(updated);
  };

  const removeItemLine = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const calculateGrnSummary = () => {
    let subtotal = 0;
    let vatAmount = 0;
    for (const item of items) {
      const lineGross = Number(item.received_qty || 0) * Number(item.unit_cost || 0);
      subtotal += lineGross;
      if (item.tax_category === 'VAT_13') {
        vatAmount += lineGross * 0.13;
      }
    }
    const additional = Number(freightAmount || 0) + Number(unloadingCharge || 0);
    const total = Number((subtotal + vatAmount + additional).toFixed(2));
    return {
      subtotal: Number(subtotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      additional: Number(additional.toFixed(2)),
      total
    };
  };

  const handleDeletePurchase = async (id: number, poNo: string) => {
    if (!window.confirm(`Delete purchase record "${poNo}"? This will reverse the stock movements and payment records.`)) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Submit GRN
  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier / आपूर्तिकर्ता छान्नुहोस्');
      return;
    }
    if (!supplierInvoiceNo.trim()) {
      alert('Please enter supplier invoice / bill number / आपूर्तिकर्ताको बिल नम्बर राख्नुहोस्');
      return;
    }
    const hasValidItem = items.some(i => Number(i.received_qty) > 0);
    if (!hasValidItem) {
      alert('Please enter received quantity (> 0) for at least one item');
      return;
    }

    const summary = calculateGrnSummary();
    let finalAmountPaid = Number(amountPaid || 0);
    if (finalAmountPaid > summary.total) {
      const confirmCap = window.confirm(
        `Amount paid (${formatNpr(finalAmountPaid)}) exceeds total payable (${formatNpr(summary.total)}).\n\nDo you want to adjust amount paid to the exact bill total ${formatNpr(summary.total)}?`
      );
      if (confirmCap) {
        finalAmountPaid = summary.total;
        setAmountPaid(summary.total);
      }
    }

    try {
      const payload = {
        supplierId: Number(supplierId),
        supplierInvoiceNo,
        purchaseOrderNo,
        dateBs: getTodayBs(),
        items: items.map(i => ({
          productId: i.product_id,
          locationId: i.location_id || 1,
          orderedQty: Number(i.ordered_qty) || 0,
          receivedQty: Number(i.received_qty) || 0,
          shortageQty: Number(i.shortage_qty) || 0,
          damagedQty: Number(i.damaged_qty) || 0,
          unit: i.unit,
          unitCost: Number(i.unit_cost) || 0,
          taxCategory: i.tax_category
        })),
        freightAmount,
        unloadingCharge,
        amountPaid: finalAmountPaid,
        paymentMethod,
        paymentReference,
        notes,
        userId: 1
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        resetGrnForm();
        setShowGrnModal(false);
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit payment to supplier
  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetPurchase || payAmount <= 0) return;

    try {
      const res = await fetch(`/api/purchases/${payTargetPurchase.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
          referenceNumber: payRef
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPayModal(false);
        loadData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'खरिद तथा मालसामान दाखिला (GRN)' : 'Purchasing & Goods Receiving (GRN)'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record supplier invoices, shortages, freight & unloading landed cost allocation into stock.
          </p>
        </div>

        <button
          onClick={() => {
            resetGrnForm();
            setShowGrnModal(true);
          }}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Goods Received (GRN)</span>
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">PO / GRN No</th>
                <th className="px-4 py-3">Supplier Invoice</th>
                <th className="px-4 py-3">Date (BS)</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Freight (भाडा)</th>
                <th className="px-4 py-3 text-right">Total (Rs)</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">
                    {p.purchase_order_no}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {p.supplier_invoice_no}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono">
                    {p.date_bs}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{p.supplier_name}</div>
                    {p.supplier_pan && <div className="text-[10px] text-slate-400 font-mono">PAN: {p.supplier_pan}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">
                    {formatNpr(p.freight_amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatNpr(p.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">
                    {formatNpr(p.amount_paid)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {p.balance_due > 0 ? (
                      <span className="text-red-600">{formatNpr(p.balance_due)}</span>
                    ) : (
                      <span className="text-emerald-700">Rs. 0.00</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/purchases/${p.id}`);
                          const data = await res.json();
                          if (data.success) setSelectedPurchase(data.data);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                      >
                        View
                      </button>
                      {p.balance_due > 0 && (
                        <button
                          onClick={() => {
                            setPayTargetPurchase(p);
                            setPayAmount(p.balance_due);
                            setShowPayModal(true);
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                        >
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePurchase(p.id, p.purchase_order_no)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                        title="Delete purchase entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New GRN Modal */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <span>Receive Goods (Goods Received Note - GRN)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => resetGrnForm()}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded font-semibold transition cursor-pointer"
                  title="Clear all fields in this form"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Form (सबै खाली गर्नुहोस्)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetGrnForm();
                    setShowGrnModal(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateGrn} className="space-y-4 text-xs">
              {/* Supplier and Invoice Identifiers */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="">-- Select Mill / Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.pan_vat ? `(PAN: ${s.pan_vat})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Bill / Invoice No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JAG-INV-8821"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">PO / Order Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8182-01"
                    value={purchaseOrderNo}
                    onChange={(e) => setPurchaseOrderNo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wide">
                    Received Items (Actual Goods Weighed / Counted)
                  </span>
                  <button
                    type="button"
                    onClick={addItemLine}
                    className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-white p-2.5 rounded border border-slate-200 items-end">
                    <div className="col-span-4">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Product</label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItemLine(idx, { product_id: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 border rounded bg-white text-xs"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name_en} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Ordered Qty</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={item.ordered_qty || ''}
                        onChange={(e) => updateItemLine(idx, { ordered_qty: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border rounded font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Received Qty</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={item.received_qty || ''}
                        onChange={(e) => updateItemLine(idx, { received_qty: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border rounded font-mono font-bold text-emerald-700"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Cost Rate (Rs)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={item.unit_cost || ''}
                        onChange={(e) => updateItemLine(idx, { unit_cost: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border rounded font-mono font-bold"
                      />
                    </div>

                    <div className="col-span-1 text-right font-mono font-bold text-xs pb-1.5">
                      {formatNpr(item.line_total, false)}
                    </div>

                    <div className="col-span-1 text-center pb-1">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemLine(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Landed Cost Inputs (Freight & Labour) */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-amber-900 block mb-1">Freight Charges / ढुवानी भाडा (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={freightAmount || ''}
                    onChange={(e) => setFreightAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded font-mono font-bold bg-white"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">Automatically allocated into product unit landed cost.</p>
                </div>
                <div>
                  <label className="font-bold text-amber-900 block mb-1">Unloading Labour / लोड-अनलोड मजदुरी (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={unloadingCharge || ''}
                    onChange={(e) => setUnloadingCharge(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded font-mono font-bold bg-white"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">Included in stock valuation cost.</p>
                </div>
              </div>

              {/* Live Calculation Summary */}
              {(() => {
                const summary = calculateGrnSummary();
                const diff = (amountPaid || 0) - summary.total;
                return (
                  <div className="bg-slate-900 text-white rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-700 pb-2">
                      <span>Subtotal (वस्तुको मूल्य): <strong className="text-white font-mono">{formatNpr(summary.subtotal)}</strong></span>
                      <span>13% VAT: <strong className="text-white font-mono">{formatNpr(summary.vatAmount)}</strong></span>
                      <span>Freight & Labour: <strong className="text-white font-mono">{formatNpr(summary.additional)}</strong></span>
                      <span className="text-sm font-bold text-amber-400">Total Payable: <strong className="text-emerald-400 font-mono text-base">{formatNpr(summary.total)}</strong></span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Quick Set:</span>
                        <button
                          type="button"
                          onClick={() => setAmountPaid(summary.total)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition"
                        >
                          Pay Full ({formatNpr(summary.total)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmountPaid(0)}
                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-semibold transition"
                        >
                          Pay Later / Credit (Rs. 0)
                        </button>
                      </div>

                      <div className="text-right">
                        {amountPaid > summary.total ? (
                          <span className="text-red-400 font-bold text-xs bg-red-950/80 px-2 py-0.5 rounded border border-red-500/50">
                            ⚠ Exceeds bill total by {formatNpr(diff)}
                          </span>
                        ) : amountPaid === summary.total && summary.total > 0 ? (
                          <span className="text-emerald-400 font-semibold text-xs">
                            ✓ Fully Settled (Balance Due: Rs. 0.00)
                          </span>
                        ) : amountPaid > 0 ? (
                          <span className="text-amber-400 font-semibold text-xs">
                            Partial Payment (Balance Due: {formatNpr(summary.total - amountPaid)})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            Full Credit (Balance Due: {formatNpr(summary.total)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount Paid (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / connectIPS</option>
                    <option value="CHEQUE">Cheque (चेक)</option>
                    <option value="CASH">Cash (नगद)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Reference</label>
                  <input
                    type="text"
                    placeholder="Cheque No or Bank Ref"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    resetGrnForm();
                    setShowGrnModal(false);
                  }}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow"
                >
                  Confirm Goods Receipt & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment to Supplier Modal */}
      {showPayModal && payTargetPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Record Payment to Supplier</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="font-bold text-slate-900">{payTargetPurchase.supplier_name}</div>
                <div className="text-slate-500 font-mono">Invoice: {payTargetPurchase.supplier_invoice_no}</div>
                <div className="text-red-600 font-bold font-mono mt-1">
                  Balance Due: {formatNpr(payTargetPurchase.balance_due)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Amount (Rs) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / connectIPS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reference No</label>
                <input
                  type="text"
                  placeholder="Cheque No or Txn Ref"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
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
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  GRN Details: {selectedPurchase.purchase_order_no}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Supplier Invoice: {selectedPurchase.supplier_invoice_no} | Date: {selectedPurchase.date_bs} BS
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border text-xs grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500 block">Supplier:</span>
                <strong className="text-slate-900">{selectedPurchase.supplier_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Freight / भाडा:</span>
                <strong className="text-slate-900 font-mono">{formatNpr(selectedPurchase.freight_amount)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Total Invoiced:</span>
                <strong className="text-slate-900 font-mono">{formatNpr(selectedPurchase.total_amount)}</strong>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border text-right">Ordered</th>
                    <th className="p-2 border text-right">Received</th>
                    <th className="p-2 border text-right">Shortage</th>
                    <th className="p-2 border text-right">Unit Cost</th>
                    <th className="p-2 border text-right">Landed Cost</th>
                    <th className="p-2 border text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchase.lines && selectedPurchase.lines.map((l, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 border font-semibold">{l.product_name}</td>
                      <td className="p-2 border text-right font-mono">{l.ordered_qty} {l.unit}</td>
                      <td className="p-2 border text-right font-mono font-bold text-emerald-700">{l.received_qty} {l.unit}</td>
                      <td className="p-2 border text-right font-mono text-red-600">{l.shortage_qty}</td>
                      <td className="p-2 border text-right font-mono">{formatNpr(l.unit_cost, false)}</td>
                      <td className="p-2 border text-right font-mono font-bold text-orange-600">{formatNpr(l.landed_unit_cost, false)}</td>
                      <td className="p-2 border text-right font-mono font-bold">{formatNpr(l.line_total, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
