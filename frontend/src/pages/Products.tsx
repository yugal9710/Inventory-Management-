import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Scissors,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Warehouse
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Product, Remnant } from '../types';
import { formatNpr, formatQty } from '../utils/formatters';

export const Products: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'catalogue' | 'remnants'>('catalogue');

  const [products, setProducts] = useState<Product[]>([]);
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // New Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: '',
    barcode: '',
    name_en: '',
    name_np: '',
    category: 'TMT Rebar',
    grade: 'Fe500D',
    brand: 'Jagdamba',
    size: '12mm',
    base_unit: 'kg',
    selling_units: ['kg', 'piece', 'bundle'],
    kg_per_piece: 10.66,
    pieces_per_bundle: 5,
    kg_per_meter: 0.888,
    standard_length: 12,
    allows_cutting: 1,
    cost_price: 90,
    selling_price: 98,
    reorder_level: 1500,
    opening_stock: 0,
    tax_category: 'VAT_13'
  });

  // Remnant modal
  const [showRemnantModal, setShowRemnantModal] = useState(false);
  const [newRemnant, setNewRemnant] = useState({
    productId: '',
    lengthMeters: '',
    quantity: 1,
    condition: 'usable',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, remRes] = await Promise.all([
        fetch('/api/products?activeOnly=false'),
        fetch('/api/inventory/remnants?status=all')
      ]);
      const prodData = await prodRes.json();
      const remData = await remRes.json();

      if (prodData.success) setProducts(prodData.data);
      if (remData.success) setRemnants(remData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const unitConversions = {
        kg_per_piece: Number(newProduct.kg_per_piece || 0),
        pieces_per_bundle: Number(newProduct.pieces_per_bundle || 1),
        kg_per_meter: Number(newProduct.kg_per_meter || 0),
        meter_per_piece: Number(newProduct.standard_length || 12)
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          unit_conversions: unitConversions
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRemnant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/remnants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(newRemnant.productId),
          lengthMeters: Number(newRemnant.lengthMeters),
          quantity: Number(newRemnant.quantity || 1),
          condition: newRemnant.condition,
          notes: newRemnant.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowRemnantModal(false);
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateRemnantStatus = async (id: number, status: string, condition?: string) => {
    try {
      await fetch(`/api/inventory/remnants/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, condition })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = !search ||
      p.name_en.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.size && p.size.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'सामग्री क्याटलग र कटिङ टुक्रा व्यवस्थापन' : 'Product Catalogue & Remnant Inventory'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage rebar, pipes, CGI sheets, hardware, unit conversions, and offcut remnants.
          </p>
        </div>

        {/* Tab Switcher & Add Actions */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'catalogue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catalogue ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('remnants')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'remnants' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Remnants ({remnants.filter(r => r.status === 'available').length})
            </button>
          </div>

          {activeTab === 'catalogue' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          ) : (
            <button
              onClick={() => setShowRemnantModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Scissors className="w-4 h-4 text-orange-400" />
              <span>Record Cut Remnant</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'catalogue' ? (
        /* Catalogue View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by code, name, size, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Categories</option>
                <option value="TMT Rebar">TMT Rebar (डण्डी)</option>
                <option value="Pipes & Hollow Sections">Pipes & Hollow Sections (पाइप)</option>
                <option value="Corrugated & Plain Sheets">CGI & Plain Sheets (जस्तापाता)</option>
                <option value="Angles & Channels">Angles, Channels & Flats</option>
                <option value="Wire & Nails">Wire & Nails (तार/किल्ला)</option>
                <option value="Cement & Aggregates">Cement & Aggregates</option>
                <option value="Hardware & Tools">Hardware & Fasteners</option>
              </select>
              <button
                onClick={loadData}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
                title="Reload"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Catalogue Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Code / Barcode</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Brand & Grade</th>
                  <th className="px-4 py-3">Base Unit</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Stock On Hand</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const stock = p.current_stock || 0;
                  const isLow = stock <= p.reorder_level;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800">{p.code}</span>
                        {p.barcode && <span className="block font-mono text-[10px] text-slate-400">{p.barcode}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.name_en}</div>
                        {p.name_np && <div className="text-[11px] text-slate-500">{p.name_np}</div>}
                        {p.size && <span className="text-[10px] text-orange-700 font-medium">Size: {p.size}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.brand || '-'} {p.grade ? `(${p.grade})` : ''}
                      </td>
                      <td className="px-4 py-3 uppercase font-medium">{p.base_unit}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNpr(p.cost_price)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNpr(p.selling_price)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={`inline-block font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                          {formatQty(stock, p.base_unit)}
                        </span>
                        {isLow && (
                          <span className="block text-[10px] text-red-500 font-semibold">
                            Low (Reorder: {p.reorder_level})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.active ? 'ACTIVE' : 'INACTIVE'}
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
        /* Remnants / Cut Pieces View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-orange-50/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-orange-600" />
                <span>Offcut Remnants & Scrap Stock (कटिङ टुक्रा)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                These pieces were cut during past sales and are ready to sell to customers or write off as scrap.
              </p>
            </div>
            <button
              onClick={() => setShowRemnantModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm"
            >
              + Record Remnant
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Length (Meters)</th>
                  <th className="px-4 py-3 text-center">Condition</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {remnants.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{r.product_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.product_code} | {r.size}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.location_name || 'Yard'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-orange-600 text-sm">
                      {r.length_meters} m
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.condition === 'usable' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {r.condition.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'available' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'available' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateRemnantStatus(r.id, 'sold')}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                          >
                            Mark Sold
                          </button>
                          <button
                            onClick={() => handleUpdateRemnantStatus(r.id, 'discarded', 'scrap')}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-red-100 hover:text-red-700"
                          >
                            To Scrap
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Add New Iron & Construction Material</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TMT-12-PAN"
                    value={newProduct.code}
                    onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 890100800012"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product Name (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12mm TMT Rebar Fe500D"
                    value={newProduct.name_en}
                    onChange={(e) => setNewProduct({ ...newProduct, name_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product Name (नेपाली)</label>
                  <input
                    type="text"
                    placeholder="e.g. १२ एमएम टिएमटी डण्डी"
                    value={newProduct.name_np}
                    onChange={(e) => setNewProduct({ ...newProduct, name_np: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="TMT Rebar">TMT Rebar (डण्डी)</option>
                    <option value="Pipes & Hollow Sections">Pipes & Hollow Sections</option>
                    <option value="Corrugated & Plain Sheets">CGI & Plain Sheets</option>
                    <option value="Angles & Channels">Angles & Channels</option>
                    <option value="Wire & Nails">Wire & Nails</option>
                    <option value="Cement & Aggregates">Cement & Aggregates</option>
                    <option value="Hardware & Tools">Hardware & Fasteners</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Jagdamba / Panchakanya"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. Fe500D / Class B"
                    value={newProduct.grade}
                    onChange={(e) => setNewProduct({ ...newProduct, grade: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Conversion Configuration */}
              <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-3 space-y-2">
                <span className="font-bold text-orange-900 block text-xs uppercase">
                  Unit Conversion & Length Rules (Nepal Standards)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Base Unit</label>
                    <select
                      value={newProduct.base_unit}
                      onChange={(e) => setNewProduct({ ...newProduct, base_unit: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded bg-white font-bold"
                    >
                      <option value="kg">kg (किलो)</option>
                      <option value="piece">piece (थान)</option>
                      <option value="bundle">bundle (बन्डल)</option>
                      <option value="sheet">sheet (पाता)</option>
                      <option value="meter">meter (मिटर)</option>
                      <option value="bag">bag (बोरा)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Kg / Piece</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 10.66"
                      value={newProduct.kg_per_piece}
                      onChange={(e) => setNewProduct({ ...newProduct, kg_per_piece: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Pcs / Bundle</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={newProduct.pieces_per_bundle}
                      onChange={(e) => setNewProduct({ ...newProduct, pieces_per_bundle: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Std Length (m)</label>
                    <input
                      type="number"
                      placeholder="12"
                      value={newProduct.standard_length}
                      onChange={(e) => setNewProduct({ ...newProduct, standard_length: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cost Price (Rs)</label>
                  <input
                    type="number"
                    step="any"
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sale Price (Rs)</label>
                  <input
                    type="number"
                    step="any"
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newProduct.reorder_level}
                    onChange={(e) => setNewProduct({ ...newProduct, reorder_level: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={newProduct.opening_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, opening_stock: Number(e.target.value) })}
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
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Remnant Modal */}
      {showRemnantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-600" />
                <span>Record Cut Remnant Piece</span>
              </h3>
              <button onClick={() => setShowRemnantModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateRemnant} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Material *</label>
                <select
                  required
                  value={newRemnant.productId}
                  onChange={(e) => setNewRemnant({ ...newRemnant, productId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name_en} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Length in Meters *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 4.8"
                    value={newRemnant.lengthMeters}
                    onChange={(e) => setNewRemnant({ ...newRemnant, lengthMeters: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Condition</label>
                  <select
                    value={newRemnant.condition}
                    onChange={(e) => setNewRemnant({ ...newRemnant, condition: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="usable">Usable Piece (पुन: बेच्न मिल्ने)</option>
                    <option value="scrap">Scrap (कवाडी/पत्रु)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Remnant Origin</label>
                <input
                  type="text"
                  placeholder="e.g. Cut from beam 12m length"
                  value={newRemnant.notes}
                  onChange={(e) => setNewRemnant({ ...newRemnant, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRemnantModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow"
                >
                  Save Remnant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
