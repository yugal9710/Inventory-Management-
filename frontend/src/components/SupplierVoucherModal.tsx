import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, ShieldCheck, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { formatNpr, numberToWordsNpr } from '../utils/formatters';

export interface SupplierVoucherData {
  voucher_no: string;
  payment_id: number;
  date_bs: string;
  date_ad?: string;
  method: string;
  amount: number;
  reference_number?: string | null;
  invoice_no?: string | null;
  notes?: string | null;
  paid_by_name?: string | null;
  is_reversal?: number;
  previous_balance?: number;
  current_balance?: number;
  supplier: {
    id: number;
    supplier_code?: string;
    name: string;
    company_name?: string | null;
    phone?: string | null;
    address?: string | null;
    pan_vat?: string | null;
    current_balance?: number;
  };
  store?: {
    shop_name_en?: string;
    shop_name_np?: string;
    pan_number?: string;
    ird_reg_no?: string;
    address_en?: string;
    address_np?: string;
    phone?: string;
    email?: string;
  };
}

interface Props {
  voucher: SupplierVoucherData;
  onClose: () => void;
}

export const SupplierVoucherModal: React.FC<Props> = ({ voucher, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const store = voucher.store || {
    shop_name_en: 'Shree Krishna Iron & Construction Materials',
    shop_name_np: 'श्री कृष्ण फलाम तथा निर्माण सामग्री भण्डार',
    pan_number: '304892716',
    ird_reg_no: 'IRD-KTM-2081-4491',
    address_en: 'Imadol Ring Road, Lalitpur, Nepal',
    address_np: 'इमाडोल चक्रपथ, ललितपुर, नेपाल',
    phone: '+977-1-5201982, 9851087654',
    email: 'contact@shreekrishnairon.com.np',
  };

  const supplier = voucher.supplier;
  const isAdjustment = (voucher.amount < 0) || (voucher.is_reversal === 1);
  const displayAmount = Math.abs(voucher.amount);

  const methodLabel = (m: string) => {
    switch (m) {
      case 'CASH':
        return 'Cash (नगद भुक्तानी)';
      case 'BANK_TRANSFER':
        return 'Bank Transfer / RTGS (बैंक दाखिला)';
      case 'CHEQUE':
        return 'Account Payee Cheque (चेक)';
      case 'QR_FONEPAY':
      case 'QR_NEPALPAY':
        return 'QR / Digital (डिजिटल भुक्तानी)';
      default:
        return m;
    }
  };

  const qrData = JSON.stringify({
    voucherNo: voucher.voucher_no,
    voucherId: voucher.payment_id,
    dateBs: voucher.date_bs,
    supplier: supplier.name,
    supplierPan: supplier.pan_vat || 'N/A',
    amount: displayAmount,
    payerPan: store.pan_number,
    method: voucher.method
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (no-print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-orange-600 rounded-xl">
              <Printer className="w-5 h-5 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-base text-white">
                Supplier Payment Voucher (खर्च / आपूर्तिकर्ता भुक्तानी भौचर)
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Voucher #{voucher.voucher_no} • {voucher.date_bs} BS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher (A4 / Thermal)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-slate-100 flex justify-center">
          <div
            ref={printAreaRef}
            className="bg-white border border-slate-300 print:border-0 rounded-xl p-6 md:p-8 max-w-2xl w-full text-slate-900 shadow-md print:shadow-none text-xs font-sans leading-relaxed"
          >
            {/* Header: Store Identity */}
            <div className="text-center pb-4 border-b-2 border-slate-900">
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
                नेपाल सरकार • आन्तरिक राजस्व विभाग (IRD Official Accounts Disbursement)
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {store.shop_name_en}
              </h1>
              <h2 className="text-sm md:text-base font-bold text-slate-700 mt-0.5">
                {store.shop_name_np}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {store.address_en} ({store.address_np})
              </p>
              <p className="text-xs text-slate-600">
                Phone: {store.phone} | Email: {store.email}
              </p>
              <div className="inline-flex items-center gap-3 mt-2 px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold">
                <span>स्थायी लेखा नं. (PAN): <strong className="font-mono text-slate-900">{store.pan_number}</strong></span>
                {store.ird_reg_no && <span>• IRD Reg: <strong className="font-mono text-slate-900">{store.ird_reg_no}</strong></span>}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="my-4 text-center">
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs md:text-sm font-extrabold uppercase tracking-wide border ${
                isAdjustment
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-orange-50 text-orange-950 border-orange-300'
              }`}>
                {isAdjustment ? 'SUPPLIER PAYMENT REVERSAL / ADJUSTMENT VOUCHER' : 'OFFICIAL PAYMENT & DEBIT VOUCHER / खर्च भुक्तानी भौचर'}
              </span>
            </div>

            {/* Metadata & QR Grid */}
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200">
              <div className="col-span-2 space-y-1">
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 w-32 shrink-0">Voucher No (भौचर नं.):</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{voucher.voucher_no}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 w-32 shrink-0">Date (वि.सं. मिति):</span>
                  <span className="font-mono font-bold text-slate-900">{voucher.date_bs} BS</span>
                </div>
                {voucher.date_ad && (
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-600 w-32 shrink-0">Date (ई.सं. मिति):</span>
                    <span className="font-mono text-slate-700">{voucher.date_ad} AD</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 w-32 shrink-0">Payment Mode (माध्यम):</span>
                  <span className="font-bold text-slate-800">{methodLabel(voucher.method)}</span>
                </div>
              </div>

              {/* QR Verification */}
              <div className="flex flex-col items-center justify-center border border-slate-200 rounded-xl p-2 bg-slate-50">
                <QRCodeSVG value={qrData} size={70} level="M" />
                <span className="text-[9px] text-slate-400 font-mono mt-1">Scan to Verify</span>
              </div>
            </div>

            {/* Supplier / Payee Details Box */}
            <div className="my-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                Paid To Supplier / Mill (भुक्तानी पाउने आपूर्तिकर्ताको विवरण):
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-sm text-slate-900 uppercase">
                    {supplier.name}
                  </h3>
                  {supplier.company_name && (
                    <div className="text-xs text-slate-600 font-semibold">
                      {supplier.company_name}
                    </div>
                  )}
                  {supplier.supplier_code && (
                    <div className="text-[11px] font-mono font-semibold text-slate-500">
                      Supplier ID / कोड: {supplier.supplier_code}
                    </div>
                  )}
                </div>
                {supplier.pan_vat && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white border border-slate-300 rounded">
                    PAN: {supplier.pan_vat}
                  </span>
                )}
              </div>
              {supplier.phone && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">सम्पर्क (Phone):</span> {supplier.phone}
                </div>
              )}
              {supplier.address && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">ठेगाना (Address):</span> {supplier.address}
                </div>
              )}
            </div>

            {/* Transaction Particulars Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5">विवरण (Particulars & Account Head)</th>
                    <th className="p-2.5 text-right w-40">रकम Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">
                        {isAdjustment ? 'Supplier Payment Reversal / Audit Adjustment' : 'Payment against Purchase Invoices / Mill Khata Account'}
                      </div>
                      {voucher.invoice_no && (
                        <div className="text-xs text-slate-600 font-mono mt-0.5">
                          Allocated PO(s): <strong className="text-orange-700">{voucher.invoice_no}</strong>
                        </div>
                      )}
                      {voucher.reference_number && (
                        <div className="text-xs text-slate-600 font-mono mt-0.5">
                          Cheque / Bank Ref No: <strong>{voucher.reference_number}</strong>
                        </div>
                      )}
                      {voucher.notes && (
                        <div className="text-xs text-slate-500 italic mt-0.5">
                          कैफियत (Notes): {voucher.notes}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-base text-orange-700">
                      {formatNpr(displayAmount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-900 font-bold">
                  <tr>
                    <td className="p-2.5 text-right font-bold text-slate-700">
                      कुल भुक्तानी रकम (Total Amount Paid):
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-base text-slate-900">
                      {formatNpr(displayAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* In Words Section */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                अक्षरेपी (Amount in Words):
              </div>
              <div className="font-bold text-xs md:text-sm text-slate-900 capitalize mt-0.5 font-sans">
                {numberToWordsNpr(displayAmount)}
              </div>
            </div>

            {/* Supplier Khata Balance Status */}
            {(voucher.previous_balance !== undefined || supplier.current_balance !== undefined) && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Supplier Payable Balance Snapshot (खाता बाँकी स्थिति)
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {voucher.previous_balance !== undefined && (
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Previous Payable</span>
                      <strong className="font-mono text-slate-800">{formatNpr(voucher.previous_balance)}</strong>
                    </div>
                  )}
                  <div className="bg-white p-2 rounded-lg border border-orange-200">
                    <span className="text-orange-700 block text-[10px]">Amount Paid</span>
                    <strong className="font-mono text-orange-700">-{formatNpr(displayAmount)}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Remaining Balance Payable</span>
                    <strong className="font-mono text-red-600">
                      {formatNpr(
                        voucher.current_balance !== undefined
                          ? voucher.current_balance
                          : supplier.current_balance
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-300">
              <div className="grid grid-cols-4 gap-3 text-center pt-8">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Prepared By
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono font-semibold">
                    {voucher.paid_by_name || 'Cashier'}
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Checked By
                  </div>
                  <div className="text-[10px] text-slate-500">Accountant / लेखापाल</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Authorized Signatory
                  </div>
                  <div className="text-[10px] text-slate-500">For {store.shop_name_en}</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Payee / Receiver
                  </div>
                  <div className="text-[10px] text-slate-500">बुझिलिनेको सही / छाप</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6 pt-3 border-t border-dashed border-slate-200">
                * This voucher is computer-generated and serves as official proof of payment in Nepal Iron Store ERP 2.0.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
