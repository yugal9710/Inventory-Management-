import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  History,
  AlertTriangle,
  ClipboardCheck,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Layers
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { StockMovement, Product } from '../types';
import { formatNpr, formatQty } from '../utils/formatters';

export const Inventory: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger' | 'adjustment'>('balances');

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState('ALL');

  // Physical Count Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);
  const [adjReason, setAdjReason] = useState('Physical stock count discrepancy');
  const [adjLines, setAdjLines] = useState<{ productId: number; systemQty: number; countedQty: number; reason: string }[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, movRes, lowRes, locRes] = await Promise.all([
        fetch('/api/products?activeOnly=false'),
        fetch('/api/inventory/ledger?limit=150'),
        fetch('/api/inventory/low-stock'),
        fetch('/api/inventory/locations')
      ]);
      const prodData = await prodRes.json();
      const movData = await movRes.json();
      const lowData = await lowRes.json();
      const locData = await locRes.json();

      if (prodData.success) {
        setProducts(prodData.data);
        // Pre-populate adjustment lines
        setAdjLines(prodData.data.slice(0, 10).map((p: Product) => ({
          productId: p.id,
          systemQty: p.current_stock || 0,
          countedQty: p.current_stock || 0,
          reason: ''
        })));
      }
      if (movData.success) setMovements(movData.data);
      if (lowData.success) setLowStockItems(lowData.data);
      if (locData.success) setLocations(locData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const modifiedLines = adjLines.filter(l => l.countedQty !== l.systemQty);
      if (modifiedLines.length === 0) {
        alert('No variances detected between counted and system quantities.');
        return;
      }

      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          reason: adjReason,
          lines: modifiedLines,
          userId: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAdjModal(false);
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredMovements = movements.filter(m => {
    if (movementFilter !== 'ALL' && m.movement_type !== movementFilter) return false;
    if (!search) return true;
    return m.product_name.toLowerCase().includes(search.toLowerCase()) ||
      m.product_code.toLowerCase().includes(search.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'स्टक मौज्दात तथा चलखेल खाता (Stock Ledger)' : 'Stock Balances & Movement Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single Source of Truth: Stock balances derived directly from recorded receipts, sales, returns, and adjustments.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'balances' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Balances On Hand
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'ledger' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Movement Ledger</span>
            </button>
          </div>

          <button
            onClick={() => setShowAdjModal(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <ClipboardCheck className="w-4 h-4 text-orange-400" />
            <span>Stock Count & Audit</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">{lowStockItems.length} Materials below reorder level:</span>
              <span className="text-red-700 ml-1">
                {lowStockItems.slice(0, 4).map(i => `${i.name_en} (${i.current_stock} ${i.base_unit})`).join(', ')}
                {lowStockItems.length > 4 ? '...' : ''}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('balances')}
            className="font-bold underline hover:text-red-900"
          >
            View Low Stock
          </button>
        </div>
      )}

      {activeTab === 'balances' ? (
        /* Stock Balances Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search stock by code, name, size..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Brand / Grade</th>
                  <th className="px-4 py-3 text-right">Landed Cost</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Stock on Hand</th>
                  <th className="px-4 py-3 text-right">Total Cost Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products
                  .filter(p => !search || p.name_en.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
                  .map((p) => {
                    const stock = p.current_stock || 0;
                    const isLow = stock <= p.reorder_level;
                    const totalVal = stock * p.cost_price;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{p.name_en}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.code} {p.size ? `| Size: ${p.size}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.category}</td>
                        <td className="px-4 py-3 text-slate-600">{p.brand} {p.grade ? `(${p.grade})` : ''}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNpr(p.cost_price)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{formatNpr(p.selling_price)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={isLow ? 'text-red-600' : 'text-slate-900'}>
                            {formatQty(stock, p.base_unit)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatNpr(totalVal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isLow ? 'REORDER' : 'IN STOCK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stock Movement Ledger View (Single Source of Truth) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Event:</span>
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Movements</option>
                <option value="PURCHASE_RECEIPT">Goods Received (GRN)</option>
                <option value="SALE">Sales Deductions</option>
                <option value="SALE_RETURN">Sales Returns</option>
                <option value="ADJUSTMENT">Stock Count Adjustments</option>
                <option value="SCRAP_DISCARD">Scrap Discards</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date (BS)</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Base Change</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                  <th className="px-4 py-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => {
                  const isPositive = m.base_quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono text-slate-600">{m.date_bs}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{m.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.product_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.location_name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {m.quantity} {m.unit}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                        {isPositive ? `+${m.base_quantity}` : m.base_quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.notes || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{m.user_name || 'System'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Count & Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-orange-600" />
                <span>Physical Stock Count & Variance Reconciliation</span>
              </h3>
              <button onClick={() => setShowAdjModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Location / Yard *</label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reason for Audit *</label>
                  <input
                    type="text"
                    required
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                    <tr>
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5 text-right">System Qty</th>
                      <th className="p-2.5 text-right w-32">Counted Physical Qty</th>
                      <th className="p-2.5 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adjLines.map((line, idx) => {
                      const prod = products.find(p => p.id === line.productId);
                      const diff = line.countedQty - line.systemQty;

                      return (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {prod?.name_en} ({prod?.code})
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {line.systemQty} {prod?.base_unit}
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              step="any"
                              value={line.countedQty}
                              onChange={(e) => {
                                const updated = [...adjLines];
                                updated[idx].countedQty = Number(e.target.value);
                                setAdjLines(updated);
                              }}
                              className="w-28 px-2 py-1 border rounded text-right font-mono font-bold"
                            />
                          </td>
                          <td className={`p-2.5 text-right font-mono font-bold ${
                            diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow"
                >
                  Commit Audit Adjustment to Movement Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
