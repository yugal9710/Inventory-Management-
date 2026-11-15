import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Banknote,
  AlertTriangle,
  Users,
  ShoppingCart,
  Truck,
  Scissors,
  Printer,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatNpr } from '../utils/formatters';
import { formatBsDate } from '../utils/nepaliCalendar';
import { Sale } from '../types';
import { InvoicePrintModal } from '../components/InvoicePrintModal';

interface Props {
  onNavigate: (screen: any) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, salesRes] = await Promise.all([
        fetch('/api/reports/dashboard'),
        fetch('/api/sales')
      ]);
      const summaryData = await summaryRes.json();
      const salesData = await salesRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (salesData.success) setRecentSales(salesData.data.slice(0, 8));
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-600" />
          <span>Loading Nepal Iron Store Dashboard...</span>
        </div>
      </div>
    );
  }

  const today = summary?.todaySales || { total_sales: 0, invoice_count: 0, cash_collected: 0, credit_issued: 0 };
  const session = summary?.activeSession;
  const currentCash = session
    ? session.opening_cash + session.cash_sales + session.cash_receipts - session.cash_expenses - session.cash_supplier_payments
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {language === 'np' ? 'दैनिक बिक्री तथा मौज्दात ड्यासबोर्ड' : 'Iron Store Operations Overview'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'np' ? 'मिति:' : 'Active Date:'}{' '}
            <span className="font-semibold text-slate-700">
              {formatBsDate(summary?.todayBs, language === 'np' ? 'np' : 'en')} ({summary?.todayBs} BS)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t('posBilling')}</span>
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors"
          >
            <Truck className="w-4 h-4" />
            <span>{language === 'np' ? 'स्टक दाखिला' : 'Receive Goods'}</span>
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'np' ? 'आजको कुल बिक्री' : "Today's Gross Sales"}
            </span>
            <span className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatNpr(today.total_sales)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{today.invoice_count} Invoices Issued</span>
              <span className="text-emerald-600 font-medium font-mono">{formatNpr(today.cash_collected)} cash</span>
            </div>
          </div>
        </div>

        {/* Drawer Cash in Hand */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'np' ? 'काउन्टर नगद (दराज)' : 'Drawer Cash (Float)'}
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatNpr(currentCash)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Status: {session ? 'OPEN' : 'CLOSED'}</span>
              <span className="text-slate-600 font-medium">
                Float: {formatNpr(session?.opening_cash || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Khata Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'np' ? 'उधारो खाता बाँकी' : 'Customer Receivables'}
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-900 font-mono">
              {formatNpr(summary?.totalKhataReceivable)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Khata Balances</span>
              <button
                onClick={() => onNavigate('customers')}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                View Ledgers →
              </button>
            </div>
          </div>
        </div>

        {/* Low Stock & Remnants Alert */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'np' ? 'न्यून मौज्दात / टुक्रा' : 'Low Stock / Cut Pieces'}
            </span>
            <span className={`p-2 rounded-lg ${summary?.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${summary?.lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {summary?.lowStockCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">items low</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1 text-orange-600 font-medium">
                <Scissors className="w-3 h-3" />
                {summary?.remnantsCount || 0} Cut Remnants
              </span>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-slate-600 hover:text-slate-900 font-semibold"
              >
                Inspect →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Cut Remnants Quick Views */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'np' ? 'पछिल्ला जारी कर विजकहरू' : 'Recent Sales Invoices (IRD Bills)'}
              </h3>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                Live
              </span>
            </div>
            <button
              onClick={() => onNavigate('pos')}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>+ Create Sale</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Date (BS)</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No invoices issued yet today. Click "New Sale" to begin billing.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {sale.invoice_no}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {sale.date_bs}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]">
                          {sale.customer_name}
                        </div>
                        {sale.customer_pan && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            PAN: {sale.customer_pan}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatNpr(sale.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.payment_status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sale.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/sales/${sale.id}`);
                              const data = await res.json();
                              if (data.success) setSelectedSale(data.data);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors"
                          title="Print / View Invoice"
                        >
                          <Printer className="w-4 h-4 text-orange-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nepal Iron Store Workflows & Remnants Snapshot (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-orange-600" />
                <span>{language === 'np' ? 'उपलब्ध कटिङ टुक्रा (Remnants)' : 'Available Cut Remnants'}</span>
              </h3>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                All →
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-3">
              Sell remnant lengths directly to customers before cutting full 12m standard bars to minimize scrap.
            </p>

            <div className="space-y-2">
              <div className="p-3 bg-orange-50/50 border border-orange-200/60 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">12mm TMT Bar (Panchakanya)</div>
                  <div className="text-[11px] text-slate-500">Cutting Shed | Usable Remnant</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-orange-700">4.8 Meters</div>
                  <div className="text-[10px] text-slate-500">2 pcs available</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">16mm TMT Bar (Panchakanya)</div>
                  <div className="text-[11px] text-slate-500">Cutting Shed | Usable Remnant</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-slate-800">5.5 Meters</div>
                  <div className="text-[10px] text-slate-500">1 pc available</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">2.0" GI Pipe (Hulas)</div>
                  <div className="text-[11px] text-slate-500">Main Yard | Cut Length</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-slate-800">2.4 Meters</div>
                  <div className="text-[10px] text-slate-500">1 pc available</div>
                </div>
              </div>
            </div>
          </div>

          {/* IRD CBMS Status Banner */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold">IRD CBMS Staging:</span> Ready
                <p className="text-[10px] text-emerald-700">Tax invoices formatted per Nepal VAT Schedule 5.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {selectedSale && (
        <InvoicePrintModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};
