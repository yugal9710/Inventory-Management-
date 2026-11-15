import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Warehouse,
  Users,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatNpr } from '../utils/formatters';

export const Reports: React.FC = () => {
  const { t, language } = useLanguage();
  const [reportType, setReportType] = useState<'vat_sales' | 'vat_purchases' | 'valuation' | 'margins' | 'aging'>('vat_sales');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/reports/vat-sales';
      if (reportType === 'vat_purchases') endpoint = '/api/reports/vat-purchases';
      if (reportType === 'valuation') endpoint = '/api/reports/stock-valuation';
      if (reportType === 'margins') endpoint = '/api/reports/profit-margin';
      if (reportType === 'aging') endpoint = '/api/reports/customer-aging';

      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const exportCsv = () => {
    // Generate CSV export from current report
    if (!data) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'vat_sales' && data.records) {
      csvContent += 'Date BS,Invoice No,Fiscal Year,Customer Name,Customer PAN,Total Sales,Exempt Amount,Taxable Amount,13% VAT,CBMS Status\n';
      data.records.forEach((r: any) => {
        csvContent += `"${r.date_bs}","${r.invoice_no}","${r.fiscal_year}","${r.customer_name}","${r.customer_pan || ''}",${r.total_amount},${r.exempt_amount},${r.taxable_amount},${r.vat_amount},"${r.cbms_sync_status}"\n`;
      });
    } else if (reportType === 'vat_purchases' && data.records) {
      csvContent += 'Date BS,Supplier Invoice No,Fiscal Year,Supplier Name,Supplier PAN,Total Amount,Taxable Amount,13% VAT,Freight\n';
      data.records.forEach((r: any) => {
        csvContent += `"${r.date_bs}","${r.supplier_invoice_no}","${r.fiscal_year}","${r.supplier_name}","${r.supplier_pan || ''}",${r.total_amount},${r.taxable_amount},${r.vat_amount},${r.freight_amount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'नेपाल कर तथा लेखा प्रतिवेदन (IRD Reports)' : 'Nepal Tax & Financial Reports'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescribed IRD VAT Sales Book (Schedule 10), Purchase Book (Schedule 9), Stock Valuation & Margins.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel / CSV</span>
        </button>
      </div>

      {/* Report Switcher Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setReportType('vat_sales')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            reportType === 'vat_sales' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          कर बिक्री खाता (VAT Sales Book - Sch 10)
        </button>

        <button
          onClick={() => setReportType('vat_purchases')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            reportType === 'vat_purchases' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          कर खरिद खाता (VAT Purchase Book - Sch 9)
        </button>

        <button
          onClick={() => setReportType('valuation')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            reportType === 'valuation' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          मौज्दात मूल्यांकन (Stock Valuation)
        </button>

        <button
          onClick={() => setReportType('margins')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            reportType === 'margins' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          नाफा तथा मार्जिन (Profit & Margins)
        </button>

        <button
          onClick={() => setReportType('aging')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            reportType === 'aging' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          उधारो खाता विश्लेषण (Khata Aging)
        </button>
      </div>

      {/* Report Body */}
      {loading ? (
        <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-xl border">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
          Loading report calculations...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* VAT Sales Register Schedule 10 */}
          {reportType === 'vat_sales' && data && (
            <div>
              <div className="p-4 bg-slate-50 border-b text-xs flex justify-between items-center font-semibold text-slate-700">
                <span>नेपाल सरकार, आन्तरिक राजस्व विभाग | अनुसूची १० (नियम २३ को उपनियम (१) सँग सम्बन्धित) - बिक्री खाता</span>
                <span className="font-mono text-orange-700 font-bold">Total Sales: {formatNpr(data.totals?.total_amount)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Date (BS)</th>
                      <th className="p-2.5">Invoice No</th>
                      <th className="p-2.5">Buyer Name</th>
                      <th className="p-2.5">Buyer PAN</th>
                      <th className="p-2.5 text-right">Total Sales</th>
                      <th className="p-2.5 text-right">Tax-Exempt</th>
                      <th className="p-2.5 text-right">Taxable Sales</th>
                      <th className="p-2.5 text-right">13% VAT</th>
                      <th className="p-2.5 text-center">CBMS Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.records?.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono">{r.date_bs}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{r.invoice_no}</td>
                        <td className="p-2.5 font-medium">{r.customer_name}</td>
                        <td className="p-2.5 font-mono text-slate-500">{r.customer_pan || 'N/A'}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatNpr(r.total_amount)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{formatNpr(r.exempt_amount)}</td>
                        <td className="p-2.5 text-right font-mono">{formatNpr(r.taxable_amount)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-orange-600">{formatNpr(r.vat_amount)}</td>
                        <td className="p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {r.cbms_sync_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-extrabold text-xs">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">जम्मा (Total):</td>
                      <td className="p-3 text-right font-mono">{formatNpr(data.totals?.total_amount)}</td>
                      <td className="p-3 text-right font-mono">{formatNpr(data.totals?.exempt_amount)}</td>
                      <td className="p-3 text-right font-mono">{formatNpr(data.totals?.taxable_amount)}</td>
                      <td className="p-3 text-right font-mono text-orange-600">{formatNpr(data.totals?.vat_amount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* VAT Purchase Register Schedule 9 */}
          {reportType === 'vat_purchases' && data && (
            <div>
              <div className="p-4 bg-slate-50 border-b text-xs flex justify-between items-center font-semibold text-slate-700">
                <span>नेपाल सरकार, आन्तरिक राजस्व विभाग | अनुसूची ९ (नियम २३ को उपनियम (१) सँग सम्बन्धित) - खरिद खाता</span>
                <span className="font-mono text-orange-700 font-bold">Total Purchases: {formatNpr(data.totals?.total_amount)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Date (BS)</th>
                      <th className="p-2.5">Supplier Inv No</th>
                      <th className="p-2.5">Supplier Name</th>
                      <th className="p-2.5">Supplier PAN</th>
                      <th className="p-2.5 text-right">Total Purchase</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">13% VAT</th>
                      <th className="p-2.5 text-right">Freight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.records?.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono">{r.date_bs}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{r.supplier_invoice_no}</td>
                        <td className="p-2.5 font-medium">{r.supplier_name}</td>
                        <td className="p-2.5 font-mono text-slate-500">{r.supplier_pan || 'N/A'}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatNpr(r.total_amount)}</td>
                        <td className="p-2.5 text-right font-mono">{formatNpr(r.taxable_amount)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-orange-600">{formatNpr(r.vat_amount)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{formatNpr(r.freight_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stock Valuation */}
          {reportType === 'valuation' && data && (
            <div>
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Total Stock Items: {data.summary?.total_items}</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  Total Valuation: {formatNpr(data.summary?.total_cost_valuation)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Product Code</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Stock Qty</th>
                      <th className="p-2.5 text-right">Avg Unit Cost</th>
                      <th className="p-2.5 text-right">Total Cost Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold">{item.code}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{item.name_en}</td>
                        <td className="p-2.5 text-slate-600">{item.category}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{item.current_stock} {item.base_unit}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{formatNpr(item.cost_price)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatNpr(item.total_cost_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Margins */}
          {reportType === 'margins' && data && (
            <div>
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Total Profit: {formatNpr(data.summary?.total_profit)}</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  Overall Margin: {data.summary?.overall_margin_pct}%
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Qty Sold</th>
                      <th className="p-2.5 text-right">Revenue</th>
                      <th className="p-2.5 text-right">COGS</th>
                      <th className="p-2.5 text-right">Gross Profit</th>
                      <th className="p-2.5 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items?.map((item: any) => (
                      <tr key={item.product_id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{item.name_en}</td>
                        <td className="p-2.5 text-slate-600">{item.category}</td>
                        <td className="p-2.5 text-right font-mono">{item.sold_quantity} {item.base_unit}</td>
                        <td className="p-2.5 text-right font-mono">{formatNpr(item.total_revenue)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{formatNpr(item.total_cogs)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{formatNpr(item.gross_profit)}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{item.margin_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Khata Aging */}
          {reportType === 'aging' && data && (
            <div>
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Total Receivables: {formatNpr(data.totalReceivable)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">PAN No</th>
                      <th className="p-2.5 text-right">Credit Limit</th>
                      <th className="p-2.5 text-right">Balance Due</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.customers?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{c.name}</td>
                        <td className="p-2.5 text-slate-600">{c.phone || '-'}</td>
                        <td className="p-2.5 font-mono text-slate-500">{c.pan_vat || '-'}</td>
                        <td className="p-2.5 text-right font-mono">{formatNpr(c.credit_limit)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-600">{formatNpr(c.balance_due)}</td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.is_overdue ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.is_overdue ? 'OVERDUE' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
