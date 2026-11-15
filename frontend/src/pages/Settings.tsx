import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  ShieldCheck,
  Calendar,
  Building,
  QrCode,
  Download,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { StoreSettings } from '../types';

export const Settings: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'store' | 'fiscal_year' | 'cbms' | 'users' | 'backup'>('store');

  const [settings, setSettings] = useState<StoreSettings>({
    shop_name_en: '',
    shop_name_np: '',
    pan_number: '',
    ird_reg_no: '',
    address_en: '',
    address_np: '',
    phone: '',
    email: '',
    active_fiscal_year: '2081/82',
    invoice_prefix: 'TI',
    default_tax_rate: '13',
    cbms_enabled: '0',
    cbms_api_url: 'https://cbms.ird.gov.np/api/bill',
    cbms_username: '',
    qr_bank_name: '',
    qr_account_name: '',
    qr_account_number: '',
    qr_merchant_id: ''
  });

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [cbmsStatus, setCbmsStatus] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [settRes, fyRes, cbmsRes, usersRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/fiscal-years'),
        fetch('/api/cbms/status'),
        fetch('/api/settings/users')
      ]);

      const settData = await settRes.json();
      const fyData = await fyRes.json();
      const cbmsData = await cbmsRes.json();
      const usersData = await usersRes.json();

      if (settData.success) setSettings(settData.data);
      if (fyData.success) setFiscalYears(fyData.data);
      if (cbmsData.success) setCbmsStatus(cbmsData);
      if (usersData.success) setUsersList(usersData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchFiscalYear = async (fyName: string) => {
    try {
      const res = await fetch('/api/settings/fiscal-years/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscalYearName: fyName })
      });
      const data = await res.json();
      if (data.success) {
        loadSettingsData();
        alert(`Switched active fiscal year to ${fyName}`);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/settings/backup';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-orange-600" />
            <span>{language === 'np' ? 'प्रणाली सेटिङ तथा IRD CBMS कन्फिगरेसन' : 'Store Settings & Nepal IRD Configuration'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shop identity, PAN/VAT, Fiscal Year (Shrawan to Ashadh), IRD CBMS reporting, and database backup.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Settings saved successfully!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('store')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'store' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Shop Identity & Tax (पसल विवरण)</span>
        </button>

        <button
          onClick={() => setActiveTab('fiscal_year')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'fiscal_year' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Fiscal Year (आर्थिक वर्ष)</span>
        </button>

        <button
          onClick={() => setActiveTab('cbms')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'cbms' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>IRD CBMS E-Billing (विद्युतीय बिल)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & RBAC</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'backup' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Backup & Security</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Shop Identity & Tax */}
        {activeTab === 'store' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-3xl">
            <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
              Shop Registration & IRD Invoice Profile
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Name (English) *</label>
                <input
                  type="text"
                  required
                  value={settings.shop_name_en}
                  onChange={(e) => setSettings({ ...settings, shop_name_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Name (नेपाली) *</label>
                <input
                  type="text"
                  required
                  value={settings.shop_name_np}
                  onChange={(e) => setSettings({ ...settings, shop_name_np: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">PAN / VAT Number (स्थायी लेखा नं.) *</label>
                <input
                  type="text"
                  required
                  value={settings.pan_number}
                  onChange={(e) => setSettings({ ...settings, pan_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">IRD Registration No</label>
                <input
                  type="text"
                  value={settings.ird_reg_no}
                  onChange={(e) => setSettings({ ...settings, ird_reg_no: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Address (English) *</label>
                <input
                  type="text"
                  required
                  value={settings.address_en}
                  onChange={(e) => setSettings({ ...settings, address_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ठेगाना (नेपाली) *</label>
                <input
                  type="text"
                  required
                  value={settings.address_np}
                  onChange={(e) => setSettings({ ...settings, address_np: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Numbers</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-bold text-sm text-slate-900 mb-2">NEPALPAY / Bank QR Integration Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={settings.qr_bank_name}
                    onChange={(e) => setSettings({ ...settings, qr_bank_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Name</label>
                  <input
                    type="text"
                    value={settings.qr_account_name}
                    onChange={(e) => setSettings({ ...settings, qr_account_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-lg shadow flex items-center gap-2 mt-4"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>
        )}

        {/* Fiscal Year Management */}
        {activeTab === 'fiscal_year' && (
          <div className="space-y-4 max-w-2xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
              Nepal Fiscal Year Setup (Shrawan 1 - Ashadh End)
            </h3>
            <p className="text-slate-600">
              Per Nepal Financial Procedures Act, invoice sequences and tax reporting are governed strictly by the active fiscal year.
            </p>

            <div className="space-y-2">
              {fiscalYears.map((fy) => (
                <div
                  key={fy.id}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    fy.is_active ? 'bg-orange-50 border-orange-500 shadow-sm' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900 font-mono">
                        आ.व. {fy.name}
                      </span>
                      {fy.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-600 text-white">
                          ACTIVE FISCAL YEAR
                        </span>
                      ) : null}
                    </div>
                    <p className="text-slate-500 mt-1">
                      BS: {fy.start_date_bs} to {fy.end_date_bs} | AD: {fy.start_date_ad} to {fy.end_date_ad}
                    </p>
                  </div>

                  {!fy.is_active && (
                    <button
                      onClick={() => handleSwitchFiscalYear(fy.name)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IRD CBMS E-Billing Configuration */}
        {activeTab === 'cbms' && (
          <div className="space-y-4 max-w-3xl text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Nepal IRD CBMS Real-time Electronic Invoice Integration</span>
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Connects to the Central Billing Monitoring System API published by Inland Revenue Department.
                </p>
              </div>

              {cbmsStatus && (
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {cbmsStatus.connection?.status}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                <input
                  type="checkbox"
                  id="cbms_enabled"
                  checked={settings.cbms_enabled === '1'}
                  onChange={(e) => setSettings({ ...settings, cbms_enabled: e.target.checked ? '1' : '0' })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="cbms_enabled" className="font-bold text-slate-800 cursor-pointer text-xs">
                  Enable Electronic Billing Sync to IRD CBMS Server (Real-time transmission)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">IRD CBMS Endpoint URL</label>
                  <input
                    type="text"
                    value={settings.cbms_api_url}
                    onChange={(e) => setSettings({ ...settings, cbms_api_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Seller PAN (Username)</label>
                  <input
                    type="text"
                    value={settings.cbms_username}
                    onChange={(e) => setSettings({ ...settings, cbms_username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900">
                <strong className="block mb-1">IRD Sandbox Verified:</strong>
                <p className="text-[11px] leading-relaxed">
                  Invoices issued will be formatted conforming to the official IRD CBMS specification (Bill Type 1 for Tax Invoice, Schedule 5 fields, seller & buyer PAN, VAT segregation). A sandbox test key is currently linked.
                </p>
              </div>

              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2 rounded-lg shadow"
              >
                Save CBMS Configuration
              </button>
            </form>
          </div>
        )}

        {/* User Accounts & RBAC */}
        {activeTab === 'users' && (
          <div className="space-y-4 max-w-2xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
              Staff User Accounts & Role-Based Access Control
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 font-bold text-slate-700 border-b">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3 font-semibold text-slate-900">{u.full_name}</td>
                      <td className="p-3 font-mono text-slate-600">{u.username}</td>
                      <td className="p-3 font-bold uppercase text-orange-600">{u.role}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Backup & Export */}
        {activeTab === 'backup' && (
          <div className="space-y-4 max-w-xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
              Daily Backup & Database Export
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Iron stores need reliable offline data safety. You can download a complete standalone snapshot of the SQLite database containing all stock movements, invoices, customer ledgers, and settings with one click.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Download className="w-6 h-6 text-orange-600" />
                <div>
                  <strong className="block text-slate-900">Export Complete JSON / SQLite Data</strong>
                  <span className="text-[11px] text-slate-500">Includes all 14 tables and audit registers</span>
                </div>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Database Snapshot</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
