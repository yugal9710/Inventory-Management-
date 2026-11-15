import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Check, Copy } from 'lucide-react';
import { formatNpr } from '../utils/formatters';

interface Props {
  amount: number;
  invoiceNo?: string;
  storeName?: string;
  onPaymentConfirmed: (refNumber: string) => void;
  onClose: () => void;
}

export const DynamicQrModal: React.FC<Props> = ({
  amount,
  invoiceNo,
  storeName = 'Shree Krishna Iron Store',
  onPaymentConfirmed,
  onClose
}) => {
  const [refNumber, setRefNumber] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  // Payload for NepalPay / Fonepay EMV standard QR
  const qrPayload = `nepalpay://pay?merchant=GLOBAL-NEPALPAY-8821&amount=${amount}&invoice=${invoiceNo || 'COUNTER'}&desc=IronStorePayment`;

  const handleConfirm = () => {
    onPaymentConfirmed(refNumber || `QR-${Date.now().toString().slice(-6)}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(amount.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 rounded-full bg-orange-100 text-orange-600 mb-3">
          <QrCode className="w-7 h-7" />
        </div>

        <h3 className="font-bold text-lg text-slate-900">NEPALPAY / Fonepay QR</h3>
        <p className="text-xs text-slate-500 mt-0.5">{storeName}</p>

        {/* QR Code Container */}
        <div className="bg-white p-4 border-2 border-orange-200 rounded-xl shadow-inner inline-block my-4">
          <QRCodeSVG value={qrPayload} size={180} level="H" includeMargin />
        </div>

        {/* Amount Pill */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
          <span className="text-xs text-slate-500 block">Total Amount to Pay</span>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {formatNpr(amount)}
            </span>
            <button
              onClick={handleCopy}
              title="Copy amount"
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Accepts: Global IME, eSewa, Khalti, IME Pay, connectIPS & all Nepali banking apps.
          </p>
        </div>

        {/* Reference Number Input */}
        <div className="text-left mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Transaction Ref / Approval Code (Optional)
          </label>
          <input
            type="text"
            value={refNumber}
            onChange={(e) => setRefNumber(e.target.value)}
            placeholder="e.g. 9841828192 or FONEPAY-992"
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
          />
        </div>

        <button
          onClick={handleConfirm}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Check className="w-4 h-4" />
          Confirm QR Payment Received
        </button>
      </div>
    </div>
  );
};
