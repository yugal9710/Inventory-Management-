import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Unlock,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CashSession, CashTransaction } from '../types';
import { formatNpr } from '../utils/formatters';

export const Cashbook: React.FC = () => {
  const { t, language } = useLanguage();
  const [session, setSession] = useState<CashSession | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Open Drawer Modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(25000);
  const [openNotes, setOpenNotes] = useState('');

  // Close Drawer Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCashCount, setActualCashCount] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Record Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseData, setExpenseData] = useState({
    type: 'EXPENSE',
    category: 'TEA_KHAJA',
    amount: '',
    description: '',
    payee: ''
  });

  const loadCashData = async () => {
    setLoading(true);
    try {
      const [sessRes, txRes] = await Promise.all([
        fetch('/api/cashbook/current-session'),
        fetch('/api/cashbook/transactions')
      ]);
      const sessData = await sessRes.json();
      const txData = await txRes.json();

      if (sessData.success) {
        setSession(sessData.data);
        if (sessData.data) {
          const exp = sessData.data.opening_cash + sessData.data.cash_sales + sessData.data.cash_receipts - sessData.data.cash_expenses - sessData.data.cash_supplier_payments;
          setActualCashCount(exp);
        }
      }
      if (txData.success) setTransactions(txData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashData();
  }, []);

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cashbook/open-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingCash: openingFloat,
          cashierId: 2,
          notes: openNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowOpenModal(false);
        loadCashData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const res = await fetch('/api/cashbook/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          actualClosingCash: actualCashCount,
          notes: closeNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCloseModal(false);
        loadCashData();
        alert(`Session closed. Difference: Rs. ${data.data.difference}`);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cashbook/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          amount: Number(expenseData.amount)
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowExpenseModal(false);
        setExpenseData({
          type: 'EXPENSE',
          category: 'TEA_KHAJA',
          amount: '',
          description: '',
          payee: ''
        });
        loadCashData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentExpectedCash = session
    ? session.opening_cash + session.cash_sales + session.cash_receipts - session.cash_expenses - session.cash_supplier_payments
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'दैनिक नगद बही तथा दराज हिसाब (Cash Register)' : 'Daily Cashbook & Drawer Reconciliation'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track daily cash sales, petty expenses (खाजा/भाडा), customer receipts, and closing discrepancy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 text-orange-400" />
                <span>Record Expense (खर्च)</span>
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>Close Cash Drawer</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Unlock className="w-4 h-4" />
              <span>Open Cash Drawer (बिहानी खाता)</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Cash Drawer Dashboard */}
      {session ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Opening Float (सुरुवाती नगद)
            </span>
            <div className="text-xl font-black text-slate-800 font-mono mt-1">
              {formatNpr(session.opening_cash)}
            </div>
            <span className="text-[10px] text-slate-400">Shift opening balance</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              2. Cash Sales (नगद बिक्री)
            </span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-1">
              +{formatNpr(session.cash_sales)}
            </div>
            <span className="text-[10px] text-slate-400">Counter sales today</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              3. Customer Receipts (खाता जम्मा)
            </span>
            <div className="text-xl font-black text-blue-700 font-mono mt-1">
              +{formatNpr(session.cash_receipts)}
            </div>
            <span className="text-[10px] text-slate-400">Khata collections</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">
              4. Petty Expenses (दैनिक खर्च)
            </span>
            <div className="text-xl font-black text-red-700 font-mono mt-1">
              -{formatNpr(session.cash_expenses)}
            </div>
            <span className="text-[10px] text-slate-400">Tea, transport, labour</span>
          </div>

          <div className="bg-orange-50 border border-orange-300 p-4 rounded-xl shadow-sm">
            <span className="text-[11px] font-bold text-orange-900 uppercase tracking-wider block">
              Current Expected in Drawer
            </span>
            <div className="text-xl font-black text-orange-700 font-mono mt-1">
              {formatNpr(currentExpectedCash)}
            </div>
            <span className="text-[10px] text-orange-800 font-medium">Physical count target</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center text-xs text-amber-800">
          <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <strong className="text-sm block">Cash Register is currently CLOSED.</strong>
          Click "Open Cash Drawer" above to record the morning opening float and enable sales tracking.
        </div>
      )}

      {/* Daily Cash Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Daily Petty Cash & Expense Log (दैनिक खर्च बही)
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {transactions.length} entries recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date (BS)</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Payee / Recipient</th>
                <th className="px-4 py-3 text-right">Amount (Rs)</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No petty cash expenses logged today.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-600">{t.date_bs}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        t.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.category}</td>
                    <td className="px-4 py-3 text-slate-600">{t.description || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.payee || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatNpr(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.created_by_name || 'Staff'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Drawer Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-600" />
                <span>Open Morning Cash Drawer</span>
              </h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleOpenDrawer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Opening Cash Float (सुरुवाती मौज्दात रु) *</label>
                <input
                  type="number"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-emerald-700 text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Shift Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Morning counter shift Dinesh"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow"
                >
                  Confirm & Open Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Drawer & Reconciliation Modal */}
      {showCloseModal && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" />
                <span>Close Cash Drawer & Reconciliation</span>
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCloseDrawer} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Closing Cash:</span>
                  <span className="font-mono font-bold text-slate-900">{formatNpr(currentExpectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Actual Physical Cash Counted (दराजमा गनिएको नगद रु) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-slate-900 text-base"
                />
              </div>

              {/* Difference Indicator */}
              <div className={`p-3 rounded-lg border flex items-center justify-between font-bold ${
                actualCashCount - currentExpectedCash === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <span>Difference (फरक):</span>
                <span className="font-mono text-sm">
                  {formatNpr(actualCashCount - currentExpectedCash)}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Closing Notes / Reason for Difference</label>
                <input
                  type="text"
                  placeholder="e.g. Verified and counted drawer"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow"
                >
                  Confirm Close & Lock Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Record Daily Shop Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category *</label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="TEA_KHAJA">Tea / Khaja (खाजा/चिया खर्च)</option>
                  <option value="TRANSPORT_FREIGHT">Local Transport / भाडा</option>
                  <option value="WAGES_LABOUR">Daily Wages / मजदुरी ज्याला</option>
                  <option value="OFFICE_SUPPLIES">Stationery / बिल प्याड</option>
                  <option value="MAINTENANCE">Shop & Machine Maintenance</option>
                  <option value="UTILITIES">Electricity / Water / Internet</option>
                  <option value="OTHER">Other Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount (Rs) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-red-600 text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paid To (Payee)</label>
                <input
                  type="text"
                  placeholder="e.g. Local Hotel / Driver Ramu"
                  value={expenseData.payee}
                  onChange={(e) => setExpenseData({ ...expenseData, payee: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Afternoon tea and samosa for 4 yard staff"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow"
                >
                  Deduct from Cash Drawer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
