import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Scissors,
  QrCode,
  Printer,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Users,
  Building,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Product, Customer, SaleLine, Sale } from '../types';
import { formatNpr, formatQty } from '../utils/formatters';
import { getTodayBs } from '../utils/nepaliCalendar';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import { DynamicQrModal } from '../components/DynamicQrModal';

export const NewSale: React.FC = () => {
  const { t, language } = useLanguage();

  // Data sources
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [walkInName, setWalkInName] = useState('Cash Customer / सामान्य ग्राहक');
  const [walkInPan, setWalkInPan] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Cart Lines
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [isDeliveryChallan, setIsDeliveryChallan] = useState<boolean>(false);
  const [invoiceType, setInvoiceType] = useState<'TAX_INVOICE' | 'ABBREVIATED'>('TAX_INVOICE');
  const [notes, setNotes] = useState<string>('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'QR_FONEPAY' | 'CREDIT' | 'SPLIT'>('CASH');
  const [customerPaying, setCustomerPaying] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');

  // Modals & Submission outcome
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalAmount, setQrModalAmount] = useState(0);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load products & customers
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products?activeOnly=true'),
        fetch('/api/customers')
      ]);
      const prodData = await prodRes.json();
      const custData = await custRes.json();

      if (prodData.success) setProducts(prodData.data);
      if (custData.success) setCustomers(custData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products for catalog
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = !searchTerm ||
      p.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.name_np && p.name_np.includes(searchTerm)) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      (p.size && p.size.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Categories list
  const categories = ['ALL', 'TMT Rebar', 'Pipes & Hollow Sections', 'Corrugated & Plain Sheets', 'Angles & Channels', 'Wire & Nails', 'Cement & Aggregates', 'Hardware & Tools'];

  // Convert line quantity in selected unit to product base units
  const convertToBaseQty = (product: Product, qty: number, unit: string): number => {
    if (!product || !qty) return 0;
    if (unit === product.base_unit) return qty;
    const conv = product.unit_conversions || {};
    if (unit === 'piece' && conv.kg_per_piece) return qty * conv.kg_per_piece;
    if (unit === 'bundle') {
      if (conv.kg_per_bundle) return qty * conv.kg_per_bundle;
      if (conv.pieces_per_bundle && conv.kg_per_piece) return qty * conv.pieces_per_bundle * conv.kg_per_piece;
    }
    if (unit === 'meter' && conv.kg_per_meter) return qty * conv.kg_per_meter;
    if (unit === 'tonne') return qty * 1000;
    if (unit === 'sheet' && conv.kg_per_sheet) return qty * conv.kg_per_sheet;
    if (unit === 'packet' && conv.kg_per_packet) return qty * conv.kg_per_packet;
    if (unit === 'box' && conv.pieces_per_box && conv.kg_per_piece) return qty * conv.pieces_per_box * conv.kg_per_piece;
    return qty;
  };

  const getLineStockInfo = (line: SaleLine) => {
    const product = products.find(p => p.id === line.product_id);
    const availableStock = Number(product?.current_stock || 0);
    const baseQty = product ? convertToBaseQty(product, line.quantity, line.unit) : line.quantity;
    const isOverStock = baseQty > availableStock;
    const baseUnit = product?.base_unit || 'kg';
    return { product, availableStock, baseQty, isOverStock, baseUnit };
  };

  // Add item to cart with stock validation
  const addToCart = (product: Product) => {
    const currentStock = Number(product.current_stock || 0);
    if (currentStock <= 0) {
      setErrorMsg(`Cannot add "${product.name_en}": Out of stock (0 ${product.base_unit} available in store).`);
      return;
    }

    // Check if already in cart
    const existingIdx = cart.findIndex(c => c.product_id === product.id && !c.is_cut_length);
    if (existingIdx >= 0) {
      const updated = [...cart];
      const nextQty = updated[existingIdx].quantity + 1;
      const nextBase = convertToBaseQty(product, nextQty, updated[existingIdx].unit);
      if (nextBase > currentStock) {
        setErrorMsg(`Cannot increase quantity: Maximum available stock for "${product.name_en}" is ${currentStock} ${product.base_unit}.`);
        return;
      }
      updated[existingIdx].quantity = nextQty;
      updated[existingIdx].line_total = Number((updated[existingIdx].quantity * updated[existingIdx].unit_price).toFixed(2));
      setCart(updated);
      return;
    }

    const defaultUnit = product.selling_units?.[0] || product.base_unit;
    const defaultPrice = product.selling_price || 0;

    const newLine: SaleLine = {
      product_id: product.id,
      product_code: product.code,
      product_name: product.name_en,
      product_name_np: product.name_np,
      category: product.category,
      brand: product.brand,
      size: product.size,
      location_id: 1,
      quantity: 1,
      unit: defaultUnit,
      unit_price: defaultPrice,
      discount_percent: 0,
      discount_amount: 0,
      line_total: defaultPrice,
      tax_category: product.tax_category || 'VAT_13',
      tax_amount: product.tax_category === 'VAT_13' ? Number((defaultPrice * 0.13).toFixed(2)) : 0,
      is_cut_length: 0,
      cut_length_meters: 0
    };

    setCart([...cart, newLine]);
  };

  // Update line in cart
  const updateCartLine = (index: number, updates: Partial<SaleLine>) => {
    const updated = [...cart];
    const current = { ...updated[index], ...updates };

    // Calculate line total
    const gross = current.quantity * current.unit_price;
    const discPct = current.discount_percent || 0;
    const discAmt = (gross * discPct) / 100;
    const net = gross - discAmt;

    current.discount_amount = discAmt;
    current.line_total = Number(net.toFixed(2));

    if (current.tax_category === 'VAT_13') {
      current.tax_amount = Number((net * 0.13).toFixed(2));
    } else {
      current.tax_amount = 0;
    }

    updated[index] = current;
    setCart(updated);
  };

  // Remove line from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Totals calculations
  let subtotal = 0;
  let taxableAmount = 0;
  let nonTaxableAmount = 0;
  let totalVat = 0;

  for (const line of cart) {
    subtotal += line.quantity * line.unit_price;
    if (line.tax_category === 'VAT_13') {
      taxableAmount += line.line_total;
      totalVat += line.tax_amount || 0;
    } else {
      nonTaxableAmount += line.line_total;
    }
  }

  const grandTotal = Number((taxableAmount + nonTaxableAmount + totalVat - Number(overallDiscount || 0)).toFixed(2));

  // Sync default paying amount whenever grandTotal changes
  useEffect(() => {
    if (paymentMethod === 'CREDIT') {
      setCustomerPaying(0);
      setCreditAmount(grandTotal);
      setCashAmount(0);
      setBankAmount(0);
      setQrAmount(0);
    } else {
      setCustomerPaying(grandTotal);
      if (paymentMethod === 'CASH') setCashAmount(grandTotal);
      else if (paymentMethod === 'BANK_TRANSFER') setBankAmount(grandTotal);
      else if (paymentMethod === 'QR_FONEPAY') setQrAmount(grandTotal);
      setCreditAmount(0);
    }
  }, [grandTotal]);

  // Check stock errors across cart
  const cartStockErrors = cart
    .map((line, idx) => {
      const info = getLineStockInfo(line);
      if (info.isOverStock) {
        return {
          idx,
          name: line.product_name,
          requested: `${line.quantity} ${line.unit}`,
          available: `${info.availableStock.toLocaleString()} ${info.baseUnit}`
        };
      }
      return null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const hasStockError = cartStockErrors.length > 0;

  // Submit sale
  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      setErrorMsg('Please add at least one item to cart');
      return;
    }

    if (hasStockError) {
      const err = cartStockErrors[0];
      setErrorMsg(`Sale not allowed: Requested quantity for "${err.name}" (${err.requested}) is greater than available store stock (${err.available}).`);
      return;
    }

    if (isWalkIn && walkInPhone && walkInPhone.length !== 10) {
      setErrorMsg('Walk-in customer phone number must contain numbers only and be exactly 10 digits.');
      return;
    }

    if (isWalkIn && walkInPan && walkInPan.length !== 9) {
      setErrorMsg('Walk-in buyer PAN must contain numbers only and be exactly 9 digits.');
      return;
    }

    if (!isWalkIn && !selectedCustomer) {
      setErrorMsg('Please select a customer for account billing');
      return;
    }

    const paying = Math.max(0, Number(customerPaying) || 0);
    const amountToRecord = Math.min(paying, grandTotal);

    if (paying < grandTotal && isWalkIn) {
      setErrorMsg('Walk-in customers cannot have an unpaid Khata balance. Please collect full payment or select a registered Khata Customer.');
      return;
    }

    // Build payments array
    const payments = [];
    if (amountToRecord > 0) {
      const method = paymentMethod === 'CREDIT' ? 'CASH' : paymentMethod;
      payments.push({
        method,
        amount: amountToRecord,
        referenceNumber: paymentRefNumber || (paymentMethod === 'CASH' && paying > grandTotal ? `CASH TENDERED: Rs. ${paying}` : '')
      });
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        invoiceType,
        customerId: isWalkIn ? null : selectedCustomer?.id,
        customerName: isWalkIn ? walkInName : selectedCustomer?.name,
        customerPan: isWalkIn ? walkInPan : selectedCustomer?.pan_vat,
        customerPhone: isWalkIn ? walkInPhone : selectedCustomer?.phone,
        customerAddress: isWalkIn ? 'Local Counter' : selectedCustomer?.address,
        dateBs: getTodayBs(),
        items: cart.map(line => ({
          productId: line.product_id,
          locationId: line.location_id || 1,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unit_price,
          discountPercent: line.discount_percent,
          isCutLength: line.is_cut_length,
          cutLengthMeters: line.cut_length_meters,
          remnantCondition: 'usable'
        })),
        overallDiscount,
        payments,
        isDeliveryChallan: isDeliveryChallan ? 1 : 0,
        notes,
        userId: 2 // Cashier
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setCreatedSale(data.data);
        // Reset form
        setCart([]);
        setOverallDiscount(0);
        setNotes('');
        setPaymentRefNumber('');
        // Reload products for fresh stock
        loadData();
      } else {
        setErrorMsg(data.error || 'Failed to issue invoice');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Customer & Billing Mode Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Customer Selector */}
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsWalkIn(true); setSelectedCustomer(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isWalkIn ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'np' ? 'काउन्टर ग्राहक (नगद)' : 'Walk-in Cash Customer'}
            </button>
            <button
              onClick={() => { setIsWalkIn(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isWalkIn ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'np' ? 'खाता ग्राहक (उधारो/रेगुलर)' : 'Khata Customer'}
            </button>
          </div>

          {!isWalkIn ? (
            <div className="flex-1 flex items-center gap-2">
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find(c => c.id === Number(e.target.value));
                  setSelectedCustomer(cust || null);
                }}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">-- Select Registered Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.customer_code || `CUST-${String(c.id).padStart(4, '0')}`}] {c.name} {c.pan_vat ? `(PAN: ${c.pan_vat})` : ''} - Bal: Rs. {c.current_balance}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="shrink-0 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px]">
                    {selectedCustomer.customer_code || `CUST-${String(selectedCustomer.id).padStart(4, '0')}`}
                  </span>
                  <span className="text-slate-500">Khata:</span>
                  <span className={`font-mono font-bold ${selectedCustomer.current_balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatNpr(selectedCustomer.current_balance)}
                  </span>
                  {selectedCustomer.credit_limit > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Limit: {formatNpr(selectedCustomer.credit_limit)})
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 flex-1"
              />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Phone (10 digits)"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 w-36 font-mono"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="Buyer PAN (9 digits)"
                value={walkInPan}
                onChange={(e) => setWalkInPan(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 w-36 font-mono"
              />
            </div>
          )}
        </div>

        {/* Invoice Type & Challan Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as any)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="TAX_INVOICE">कर बिजक (TAX INVOICE)</option>
            <option value="ABBREVIATED">संक्षिप्त कर बिजक (CASH MEMO)</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isDeliveryChallan}
              onChange={(e) => setIsDeliveryChallan(e.target.checked)}
              className="rounded text-orange-600 focus:ring-orange-500"
            />
            <span>चलानी (Delivery Challan)</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Left Catalog & Right Cart & Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Product Search & Quick Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar & Category filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('searchProduct')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs md:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? (language === 'np' ? 'सबै' : 'All Items') : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const conversions = product.unit_conversions || {};
              const stock = product.current_stock || 0;
              const isOut = stock <= 0;
              const isLow = stock > 0 && stock <= product.reorder_level;

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-white p-3.5 rounded-xl border transition-all flex flex-col justify-between group ${
                    isOut
                      ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/80'
                      : 'border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {product.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOut
                          ? 'bg-slate-200 text-slate-600 font-semibold'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOut ? 'Out of Stock' : `Stock: ${formatQty(stock, product.base_unit)}`}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-orange-600 transition-colors mt-1 line-clamp-1">
                      {product.name_en}
                    </h4>
                    {product.name_np && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {product.name_np}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                      {product.brand && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">{product.brand}</span>}
                      {product.grade && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">{product.grade}</span>}
                      {product.size && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">{product.size}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block leading-tight">Default Price</span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {formatNpr(product.selling_price)}
                        <span className="text-[10px] font-normal text-slate-500">/{product.base_unit}</span>
                      </span>
                    </div>
                    <button
                      className="p-1.5 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors"
                      title="Add to Bill"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Billing Cart & Checkout Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
            {/* Cart Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  {language === 'np' ? 'बिक्री विवरण (Cart)' : 'Invoice Line Items'}
                </span>
                <span className="px-1.5 py-0.2 bg-orange-600 text-white text-[10px] font-mono font-bold rounded-full">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Cart Lines */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No materials added to bill. Click items from the catalog on the left to add.
                </div>
              ) : (
                cart.map((line, idx) => {
                  const { product, availableStock, baseQty, isOverStock, baseUnit } = getLineStockInfo(line);

                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 text-xs space-y-2 transition-all ${
                        isOverStock
                          ? 'bg-rose-50/70 border-rose-400 ring-1 ring-rose-400'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{line.product_name}</span>
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                isOverStock
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                                  : 'bg-slate-200/80 text-slate-700'
                              }`}
                            >
                              Stock: {availableStock.toLocaleString()} {baseUnit}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {line.product_code} | {line.size || ''}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity, Unit, Price, Discount Inputs */}
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] font-semibold text-slate-500 block">Quantity</label>
                            {isOverStock && (
                              <span className="text-[9px] font-mono font-black text-rose-600">
                                Exceeded!
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={line.quantity}
                            onChange={(e) => updateCartLine(idx, { quantity: Number(e.target.value) || 0 })}
                            className={`w-full px-2 py-1.5 border rounded font-mono font-bold transition-all ${
                              isOverStock
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-800 focus:ring-rose-500 ring-1 ring-rose-500'
                                : 'border-slate-300 text-slate-900 focus:ring-1 focus:ring-orange-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Unit</label>
                          <select
                            value={line.unit}
                            onChange={(e) => updateCartLine(idx, { unit: e.target.value })}
                            className="w-full px-1.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 bg-white"
                          >
                            <option value="kg">kg</option>
                            <option value="piece">piece</option>
                            <option value="bundle">bundle</option>
                            <option value="meter">meter</option>
                            <option value="tonne">tonne</option>
                            <option value="sheet">sheet</option>
                            <option value="packet">packet</option>
                            <option value="box">box</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Rate (Rs)</label>
                          <input
                            type="number"
                            step="any"
                            value={line.unit_price}
                            onChange={(e) => updateCartLine(idx, { unit_price: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Disc %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discount_percent}
                            onChange={(e) => updateCartLine(idx, { discount_percent: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Prominent Over-Stock Warning on Line Item */}
                      {isOverStock && (
                        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-800 text-[11px] font-bold animate-in fade-in">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="truncate">
                              {language === 'np'
                                ? `मौज्दात अपुग! उपलब्ध: ${availableStock.toLocaleString()} ${baseUnit} (माग: ${baseQty.toLocaleString()} ${baseUnit})`
                                : `Insufficient stock! Store has ${availableStock.toLocaleString()} ${baseUnit} (Requested: ${baseQty.toLocaleString()} ${baseUnit})`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              let maxInUnit = availableStock;
                              if (product && line.unit !== baseUnit) {
                                const factor = convertToBaseQty(product, 1, line.unit);
                                if (factor > 0) maxInUnit = Math.floor((availableStock / factor) * 100) / 100;
                              }
                              updateCartLine(idx, { quantity: Math.max(0, maxInUnit) });
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-2xs"
                          >
                            {language === 'np' ? 'अधिकतम राख्नुहोस्' : 'Set to Max'}
                          </button>
                        </div>
                      )}

                    {/* Cut-length Sale Toggle for items sold by length */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={line.is_cut_length === 1}
                          onChange={(e) => updateCartLine(idx, { is_cut_length: e.target.checked ? 1 : 0 })}
                          className="rounded text-orange-600"
                        />
                        <span className="font-medium flex items-center gap-1">
                          <Scissors className="w-3 h-3 text-orange-600" />
                          Cut-length sale (लम्बाइ काटेर)
                        </span>
                      </label>

                      {line.is_cut_length === 1 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Cut:</span>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="meters"
                            value={line.cut_length_meters || ''}
                            onChange={(e) => updateCartLine(idx, { cut_length_meters: Number(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-0.5 border border-orange-300 rounded text-right font-mono"
                          />
                          <span className="text-slate-500">m</span>
                        </div>
                      )}

                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {formatNpr(line.line_total)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            </div>

            {/* Calculations Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatNpr(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxable Sales:</span>
                <span className="font-mono">{formatNpr(taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>13% VAT:</span>
                <span className="font-mono font-medium">{formatNpr(totalVat)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-1">
                <span>Overall Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={overallDiscount || ''}
                  onChange={(e) => setOverallDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 px-2 py-0.5 border border-slate-300 rounded font-mono text-right"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-lg text-orange-600">{formatNpr(grandTotal)}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block uppercase">
                  {language === 'np' ? 'भुक्तानी विधि' : 'Payment Method'}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => {
                      setPaymentMethod('CASH');
                      if (customerPaying === 0) setCustomerPaying(grandTotal);
                    }}
                    className={`p-2 rounded-lg text-center font-bold text-[11px] border transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    नगद Cash
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('BANK_TRANSFER');
                      if (customerPaying === 0) setCustomerPaying(grandTotal);
                    }}
                    className={`p-2 rounded-lg text-center font-bold text-[11px] border transition-all cursor-pointer ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Bank / चेक
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('QR_FONEPAY');
                      if (customerPaying === 0) setCustomerPaying(grandTotal);
                      setQrModalAmount(grandTotal);
                      setShowQrModal(true);
                    }}
                    className={`p-2 rounded-lg text-center font-bold text-[11px] border transition-all cursor-pointer ${
                      paymentMethod === 'QR_FONEPAY'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Fonepay QR
                  </button>
                  <button
                    onClick={() => {
                      if (isWalkIn) {
                        alert('Please select a registered Khata Customer to sell on credit!');
                        return;
                      }
                      setPaymentMethod('CREDIT');
                      setCustomerPaying(0);
                    }}
                    className={`p-2 rounded-lg text-center font-bold text-[11px] border transition-all cursor-pointer ${
                      paymentMethod === 'CREDIT'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    उधारो Khata
                  </button>
                </div>

                {/* Reference Number / Cheque no input */}
                {(paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'QR_FONEPAY') && (
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Transaction ID / Cheque No / Slip No"
                      value={paymentRefNumber}
                      onChange={(e) => setPaymentRefNumber(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                )}

                {/* Customer Paying / Tendered Amount Section */}
                <div className="mt-2.5 p-3 bg-gradient-to-br from-slate-50 to-orange-50/20 border-2 border-orange-200/90 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>{language === 'np' ? 'ग्राहकले तिर्ने रकम (Customer Paying)' : 'Customer Paying Amount'}</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomerPaying(grandTotal)}
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-orange-600 text-white hover:bg-orange-700 transition cursor-pointer shadow-2xs"
                        title="Set to full grand total"
                      >
                        {language === 'np' ? 'पूरा चुक्ता' : 'Full / Exact'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isWalkIn) {
                            alert('Credit is only available for registered Khata Customers.');
                            return;
                          }
                          setCustomerPaying(0);
                          setPaymentMethod('CREDIT');
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                        title="Set to 0 (Full Credit)"
                      >
                        {language === 'np' ? '० (उधारो)' : '0 (Credit)'}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-slate-500 font-mono">Rs.</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={customerPaying === 0 && paymentMethod === 'CREDIT' ? 0 : (customerPaying === 0 ? '' : customerPaying)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCustomerPaying(isNaN(val) ? 0 : val);
                      }}
                      placeholder={paymentMethod === 'CREDIT' ? '0 (Full credit)' : String(grandTotal)}
                      className="w-full pl-9 pr-3 py-2 bg-white border-2 border-orange-300 focus:border-orange-600 rounded-xl text-base font-mono font-black text-slate-900 outline-none shadow-inner transition"
                    />
                  </div>

                  {/* Quick Cash Chips for Fast Change / Tender Calculation */}
                  {paymentMethod === 'CASH' && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5 text-[10px] font-mono font-bold text-slate-700">
                      <span className="text-[10px] font-sans font-semibold text-slate-500 mr-0.5">Quick:</span>
                      {[100, 500, 1000].map((note) => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setCustomerPaying(prev => Number((prev + note).toFixed(2)))}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 hover:border-orange-500 rounded text-slate-700 hover:text-orange-600 transition cursor-pointer shadow-2xs"
                        >
                          +{note}
                        </button>
                      ))}
                      {grandTotal > 0 && Math.ceil(grandTotal / 500) * 500 > grandTotal && (
                        <button
                          type="button"
                          onClick={() => setCustomerPaying(Math.ceil(grandTotal / 500) * 500)}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 hover:border-orange-500 rounded text-slate-700 hover:text-orange-600 transition cursor-pointer shadow-2xs"
                        >
                          Rs. {Math.ceil(grandTotal / 500) * 500}
                        </button>
                      )}
                      {grandTotal > 0 && Math.ceil(grandTotal / 1000) * 1000 > grandTotal && (
                        <button
                          type="button"
                          onClick={() => setCustomerPaying(Math.ceil(grandTotal / 1000) * 1000)}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 hover:border-orange-500 rounded text-slate-700 hover:text-orange-600 transition cursor-pointer shadow-2xs"
                        >
                          Rs. {Math.ceil(grandTotal / 1000) * 1000}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Dynamic Status / Change Due / Unpaid Balance Notification */}
                  {customerPaying > grandTotal ? (
                    <div className="p-2 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900 animate-in fade-in">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{language === 'np' ? 'ग्राहकलाई फिर्ता (Change Return):' : 'Change Due to Customer:'}</span>
                      </span>
                      <span className="font-mono text-sm text-emerald-700 font-black">
                        {formatNpr(customerPaying - grandTotal)}
                      </span>
                    </div>
                  ) : customerPaying < grandTotal && customerPaying > 0 ? (
                    <div className="p-2 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between text-xs font-bold text-amber-950 animate-in fade-in">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{language === 'np' ? 'खातामा बाँकी उधारो (Khata Due):' : 'Remaining Unpaid Khata Due:'}</span>
                      </span>
                      <span className="font-mono text-sm text-amber-800 font-black">
                        {formatNpr(grandTotal - customerPaying)}
                      </span>
                    </div>
                  ) : customerPaying === 0 ? (
                    <div className="p-2 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-center justify-between text-xs font-bold text-rose-900 animate-in fade-in">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{language === 'np' ? 'सम्पूर्ण उधारो बिक्री (Full Credit):' : 'Full Khata Credit Balance:'}</span>
                      </span>
                      <span className="font-mono text-sm text-rose-700 font-black">
                        {formatNpr(grandTotal)}
                      </span>
                    </div>
                  ) : (
                    <div className="p-1.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{language === 'np' ? 'रकम पूरा चुक्ता' : 'Paid in Full (Exact Amount)'}</span>
                      </span>
                      <span className="font-mono text-emerald-700 font-bold">{formatNpr(grandTotal)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Over-Stock Alert Banner preventing checkout */}
              {hasStockError && (
                <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-800 text-xs font-bold flex items-start gap-2 shadow-sm animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-rose-900">
                      {language === 'np' ? 'बिक्री अस्वीकृत: मौज्दात अपुग' : 'Sale Not Allowed: Insufficient Store Stock'}
                    </div>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      {language === 'np'
                        ? 'माग गरिएको परिमाण उपलब्ध मौज्दातभन्दा बढी छ । कृपया उपलब्ध मौज्दात बराबर वा कम परिमाण राख्नुहोस् ।'
                        : 'Requested quantity is greater than the quantity available. Please reduce quantity to proceed.'}
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit & Issue Invoice Button */}
              <button
                disabled={submitting || cart.length === 0 || hasStockError}
                onClick={handleSubmitSale}
                className={`w-full mt-3 font-extrabold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm ${
                  hasStockError
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300 opacity-80'
                    : 'bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white cursor-pointer'
                }`}
                title={hasStockError ? 'Cannot issue bill: Requested quantity is greater than available stock' : ''}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Issuing Tax Invoice...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>
                      {customerPaying <= 0
                        ? `${language === 'np' ? 'उधारो बिल जारी गर्नुहोस्' : 'Issue Khata Credit Bill'} (Due: ${formatNpr(grandTotal)})`
                        : customerPaying < grandTotal
                        ? `${language === 'np' ? 'आंशिक बिल जारी गर्नुहोस्' : 'Issue Partial Bill'} (Paid: ${formatNpr(customerPaying)} | Due: ${formatNpr(grandTotal - customerPaying)})`
                        : `${t('issueInvoice')} (${formatNpr(grandTotal)})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic QR Payment Modal */}
      {showQrModal && (
        <DynamicQrModal
          amount={grandTotal}
          onPaymentConfirmed={(ref) => {
            setPaymentRefNumber(ref);
            setShowQrModal(false);
          }}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Invoice Print Modal for Completed Sale */}
      {createdSale && (
        <InvoicePrintModal
          sale={createdSale}
          onClose={() => setCreatedSale(null)}
        />
      )}
    </div>
  );
};
