import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Sale } from '../types';
import { formatNpr } from '../utils/formatters';
import { formatBsDate } from '../utils/nepaliCalendar';

interface Props {
  sale: Sale;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<Props> = ({ sale, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const store = sale.store || {
    shop_name_en: 'Shree Krishna Iron & Construction Materials',
    shop_name_np: 'श्री कृष्ण फलाम तथा निर्माण सामग्री भण्डार',
    pan_number: '304892716',
    ird_reg_no: 'IRD-KTM-2081-4491',
    address_en: 'Imadol Ring Road, Lalitpur, Nepal',
    address_np: 'इमाडोल चक्रपथ, ललितपुर, नेपाल',
    phone: '+977-1-5201982, 9851087654',
    email: 'contact@shreekrishnairon.com.np',
  };

  // Build verification/payment QR payload conforming to Nepal standards
  const qrData = JSON.stringify({
    sellerPan: store.pan_number,
    invoiceNo: sale.invoice_no,
    fiscalYear: sale.fiscal_year,
    dateBs: sale.date_bs,
    total: sale.total_amount,
    vat: sale.tax_amount,
    customerPan: sale.customer_pan || 'WALK-IN',
    cbmsCode: sale.cbms_sync_code || 'PENDING'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar (no-print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-orange-600 rounded-lg">
              <Printer className="w-5 h-5 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-lg">Official IRD Invoice Preview</h3>
              <p className="text-xs text-slate-300">
                Invoice #{sale.invoice_no} | Fiscal Year {sale.fiscal_year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Invoice (A4 / Thermal)
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="overflow-y-auto p-6 md:p-8 flex-1 bg-slate-100 flex justify-center">
          <div
            ref={printAreaRef}
            className="bg-white border border-slate-300 print:border-0 rounded-lg p-8 max-w-3xl w-full text-slate-900 shadow-md print:shadow-none text-xs md:text-sm font-sans"
          >
            {/* Top IRD Classification & Header */}
            <div className="text-center pb-4 border-b border-slate-300">
              <div className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1">
                नेपाल सरकार | आन्तरिक राजस्व विभाग (IRD Approved)
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight">
                {store.shop_name_en}
              </h1>
              <h2 className="text-sm md:text-base font-semibold text-slate-700 mt-0.5">
                {store.shop_name_np}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {store.address_en} ({store.address_np})
              </p>
              <p className="text-xs text-slate-600">
                Phone: {store.phone} | Email: {store.email}
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-xs">
                स्थायी लेखा नं. (PAN / VAT No): <span className="font-mono text-sm tracking-wide">{store.pan_number}</span>
              </div>
            </div>

            {/* Invoice Title & Metadata */}
            <div className="my-4 text-center">
              <span className="inline-block text-base font-extrabold uppercase px-6 py-1 border-2 border-slate-900 rounded tracking-widest bg-slate-50">
                {sale.is_delivery_challan ? 'चलानी / DELIVERY CHALLAN' : (sale.invoice_type === 'TAX_INVOICE' ? 'कर बिजक (TAX INVOICE)' : 'संक्षिप्त कर बिजक (CASH MEMO)')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200 text-xs">
              <div>
                <p><span className="font-semibold text-slate-600">Invoice No:</span> <strong className="font-mono text-slate-900">{sale.invoice_no}</strong></p>
                <p><span className="font-semibold text-slate-600">Fiscal Year (आ.व.):</span> <strong>{sale.fiscal_year}</strong></p>
                <p><span className="font-semibold text-slate-600">Payment Status:</span> <strong className="uppercase">{sale.payment_status}</strong></p>
                <p><span className="font-semibold text-slate-600">Prepared By:</span> {sale.created_by_name || 'Counter Cashier'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold text-slate-600">Date (वि.सं.):</span> <strong className="font-mono">{formatBsDate(sale.date_bs, 'np')} ({sale.date_bs})</strong></p>
                <p><span className="font-semibold text-slate-600">Date (AD):</span> <span className="font-mono">{sale.date_ad}</span></p>
                {sale.cbms_sync_code && (
                  <p className="text-emerald-700 font-medium">
                    <span className="font-semibold">CBMS Sync Code:</span> {sale.cbms_sync_code}
                  </p>
                )}
              </div>
            </div>

            {/* Buyer Details */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 my-3 text-xs">
              <div className="font-bold text-slate-800 uppercase mb-1">Buyer Details (खरिदकर्ताको विवरण):</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p><span className="font-semibold text-slate-600">Customer Name:</span> <strong>{sale.customer_name}</strong></p>
                  <p><span className="font-semibold text-slate-600">Address:</span> {sale.customer_address || 'Local'}</p>
                </div>
                <div>
                  <p><span className="font-semibold text-slate-600">Buyer's PAN (प्यान नं):</span> <strong className="font-mono text-sm">{sale.customer_pan || 'N/A (सामान्य)'}</strong></p>
                  <p><span className="font-semibold text-slate-600">Contact No:</span> {sale.customer_phone || '-'}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300 text-center w-8">SN</th>
                    <th className="p-2 border border-slate-300 text-left">Code</th>
                    <th className="p-2 border border-slate-300 text-left">Description of Goods (विवरण)</th>
                    <th className="p-2 border border-slate-300 text-center">Unit</th>
                    <th className="p-2 border border-slate-300 text-right">Qty</th>
                    <th className="p-2 border border-slate-300 text-right">Rate (Rs)</th>
                    <th className="p-2 border border-slate-300 text-right">Total (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.lines && sale.lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono text-slate-600">{line.product_code}</td>
                      <td className="p-2 border border-slate-300">
                        <div className="font-semibold">{line.product_name}</div>
                        {line.product_name_np && <div className="text-[11px] text-slate-600">{line.product_name_np}</div>}
                        {line.is_cut_length === 1 && (
                          <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] bg-orange-100 text-orange-800 rounded font-medium">
                            Cut Length: {line.cut_length_meters}m
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-300 text-center uppercase">{line.unit}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-medium">{line.quantity}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">{formatNpr(line.unit_price, false)}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-semibold">{formatNpr(line.line_total, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & QR Section */}
            <div className="grid grid-cols-12 gap-4 mt-3 pt-2 border-t border-slate-300">
              {/* Left Side: Amount in Words & Dynamic QR */}
              <div className="col-span-7 flex flex-col justify-between">
                <div>
                  <div className="text-xs mb-2">
                    <span className="font-bold text-slate-700 block">Amount in Words (अक्षरेपी):</span>
                    <p className="italic text-slate-900 font-medium">{sale.amountInWordsNp || 'शून्य रुपैयाँ मात्र'}</p>
                    <p className="italic text-slate-600 text-[11px]">{sale.amountInWordsEn || 'Zero Rupees Only'}</p>
                  </div>

                  {sale.notes && (
                    <div className="text-xs bg-slate-50 border border-slate-200 p-2 rounded mb-2">
                      <span className="font-bold">Remarks:</span> {sale.notes}
                    </div>
                  )}

                  {sale.payments && sale.payments.length > 0 && (
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <span className="font-bold text-slate-700">Payment Breakdown:</span>
                      {sale.payments.map((p, pIdx) => (
                        <div key={pIdx}>
                          • {p.method}: Rs. {formatNpr(p.amount, false)} {p.reference_number ? `(Ref: ${p.reference_number})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* NepalPay / Fonepay verification QR */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
                  <div className="p-1 bg-white border border-slate-300 rounded shadow-sm">
                    <QRCodeSVG value={qrData} size={70} />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    <p className="font-bold text-slate-700">NEPALPAY / IRD Verification QR</p>
                    <p>Scan to verify invoice validity or pay digitally.</p>
                    <p className="font-mono mt-0.5">PAN: {store.pan_number}</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Totals Summary */}
              <div className="col-span-5 bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal (कुल रकम):</span>
                  <span className="font-mono font-medium">{formatNpr(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount (छुट):</span>
                    <span className="font-mono">- {formatNpr(sale.discount)}</span>
                  </div>
                )}
                {sale.non_taxable_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Non-Taxable / Exempt:</span>
                    <span className="font-mono">{formatNpr(sale.non_taxable_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-slate-200 pt-1">
                  <span>Taxable Amount (कर लाग्ने रकम):</span>
                  <span className="font-mono">{formatNpr(sale.taxable_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>13% VAT (मूल्य अभिवृद्धि कर):</span>
                  <span className="font-mono">{formatNpr(sale.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base font-extrabold text-slate-900 border-t-2 border-slate-900 pt-1.5 pb-0.5">
                  <span>Grand Total (जम्मा):</span>
                  <span className="font-mono">{formatNpr(sale.total_amount)}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-700 pt-1 border-t border-dashed border-slate-300">
                  <span>Amount Paid (बुझिलिएको):</span>
                  <span className="font-mono font-semibold text-emerald-700">{formatNpr(sale.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-0.5">
                  <span className="text-slate-700">Balance Due (बाँकी):</span>
                  <span className={`font-mono ${sale.balance_due > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {formatNpr(sale.balance_due)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-600">
              <div className="text-[10px] text-slate-500 mb-6 italic">
                * Note: Goods once cut or sold cannot be returned without original bill. Check material grade and weight before leaving premises.
              </div>

              <div className="grid grid-cols-3 gap-6 text-center pt-8">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                    Prepared By (तयार गर्ने)
                  </div>
                  <div className="text-[10px] text-slate-500">{sale.created_by_name || 'Cashier'}</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                    Received By (बुझिलिने)
                  </div>
                  <div className="text-[10px] text-slate-500">Customer Signature / Stamp</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                    Authorized Signatory (अधिकृत)
                  </div>
                  <div className="text-[10px] text-slate-500">For {store.shop_name_en}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
