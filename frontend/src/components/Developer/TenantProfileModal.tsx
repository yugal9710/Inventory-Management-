import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Calendar,
  Clock,
  Shield,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Receipt,
  Lock,
  UserPlus,
  CheckCircle2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Scissors,
  ArrowRight,
  Warehouse,
  QrCode
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  tenantId: string | null;
  onClose: () => void;
  plans: any[];
  onTenantUpdated?: (updatedTenant: any) => void;
  onSwitchTenant?: (tenantId: string) => void;
}

export default function TenantProfileModal({
  isOpen,
  tenantId,
  onClose,
  plans = [],
  onTenantUpdated,
  onSwitchTenant
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'payments' | 'users' | 'modules' | 'danger'>('overview');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Edit Store Details Form State
  const [editStoreForm, setEditStoreForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    pan: '',
    contactPerson: '',
    status: 'Active'
  });

  // Subscription Edit / Extension Form State
  const [subForm, setSubForm] = useState({
    planId: 'plan-professional',
    billingCycle: 'Yearly',
    status: 'Active',
    expiryDate: '',
    totalAmountDue: '',
    notes: ''
  });

  // Software Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Fonepay QR',
    transactionRef: '',
    invoiceNo: '',
    billingPeriod: '',
    notes: ''
  });

  // User Accounts Form State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    username: '',
    role: 'cashier',
    phone: '',
    active: true
  });

  // Delete Tenant Confirmation State
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTenantProfile = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch store profile');

      setProfile(data);
      const t = data.tenant;
      setEditStoreForm({
        name: t.name || '',
        slug: t.slug || '',
        address: t.address || '',
        phone: t.phone || '',
        pan: t.pan || '',
        contactPerson: t.contactPerson || '',
        status: t.status || 'Active'
      });

      const sub = t.subscription || {};
      setSubForm({
        planId: sub.planId || t.planId || 'plan-professional',
        billingCycle: sub.billingCycle || 'Yearly',
        status: sub.status || t.status || 'Active',
        expiryDate: sub.expiryDate ? sub.expiryDate.split('T')[0] : '',
        totalAmountDue: sub.totalAmountDue !== undefined ? sub.totalAmountDue : '',
        notes: ''
      });
    } catch (err: any) {
      console.error('Error fetching store profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchTenantProfile();
      setActiveTab('overview');
      setShowPaymentForm(false);
      setShowUserModal(false);
      setEditingUser(null);
      setDeleteConfirmInput('');
    }
  }, [isOpen, tenantId]);

  if (!isOpen || !tenantId) return null;

  const tenant = profile?.tenant;
  const subscription = tenant?.subscription || {};
  const currentPlan = plans.find(p => p.id === (subscription.planId || tenant?.planId)) || {
    name: subscription.planId || 'Standard',
    priceMonthly: 3500,
    priceYearly: 35000
  };

  const handleUpdateStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editStoreForm.phone) {
      const cleanPhone = String(editStoreForm.phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        alert('Store phone number must contain numbers only and be exactly 10 digits.');
        return;
      }
    }

    if (editStoreForm.pan) {
      const cleanPan = String(editStoreForm.pan).replace(/\D/g, '');
      if (cleanPan.length !== 9) {
        alert('Nepal PAN / VAT No. must contain numbers only and be exactly 9 digits.');
        return;
      }
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStoreForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update store');

      showToastMsg('✅ Store business profile updated successfully!');
      fetchTenantProfile();
      if (onTenantUpdated && data.tenant) onTenantUpdated(data.tenant);
    } catch (err: any) {
      alert(`Update Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/subscription/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: subForm.planId,
          billingCycle: subForm.billingCycle,
          status: subForm.status,
          expiryDate: subForm.expiryDate ? new Date(subForm.expiryDate).toISOString() : undefined,
          totalAmountDue: Number(subForm.totalAmountDue)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription');

      showToastMsg('✅ Subscription parameters and expiry date updated!');
      fetchTenantProfile();
      if (onTenantUpdated && data.tenant) onTenantUpdated(data.tenant);
    } catch (err: any) {
      alert(`Subscription Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickExtend = (months: number) => {
    const current = subForm.expiryDate ? new Date(subForm.expiryDate) : new Date();
    const base = current > new Date() ? current : new Date();
    base.setMonth(base.getMonth() + months);
    setSubForm(prev => ({
      ...prev,
      expiryDate: base.toISOString().split('T')[0],
      status: 'Active'
    }));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      showToastMsg(`✅ Payment of Rs. ${Number(paymentForm.amount).toLocaleString()} recorded in software ledger!`);
      setShowPaymentForm(false);
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Fonepay QR',
        transactionRef: '',
        invoiceNo: '',
        billingPeriod: '',
        notes: ''
      });
      fetchTenantProfile();
      if (onTenantUpdated && data.tenant) onTenantUpdated(data.tenant);
    } catch (err: any) {
      alert(`Payment Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (!window.confirm(`Delete payment record of Rs. ${amount.toLocaleString()}? This will recalculate the tenant balance.`)) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/payments/${paymentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete payment');

      showToastMsg('🗑️ Payment entry removed and tenant ledger recalculated.');
      fetchTenantProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleModule = async (moduleKey: string) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/toggle-module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle module');

      showToastMsg(`✅ Module [${moduleKey}] updated! State: ${data.enabled ? 'ENABLED' : 'DISABLED'}`);
      fetchTenantProfile();
      if (onTenantUpdated && data.tenant) onTenantUpdated(data.tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userForm.phone) {
      const cleanPhone = String(userForm.phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        alert('User phone number must contain numbers only and be exactly 10 digits.');
        return;
      }
    }

    setProcessing(true);
    try {
      const url = editingUser
        ? `/api/platform/tenants/${tenantId}/users/${editingUser.id}`
        : `/api/platform/tenants/${tenantId}/users`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user account');

      showToastMsg(editingUser ? '✅ User account updated!' : '✅ New store user account created!');
      setShowUserModal(false);
      setEditingUser(null);
      fetchTenantProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Delete user account "${username}"?`)) return;
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/users/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete user');
      showToastMsg(`User ${username} removed.`);
      fetchTenantProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetUserPassword = async (user: any) => {
    const defaultGen = 'Iron@' + Math.floor(1000 + Math.random() * 9000);
    const newPass = prompt(`Assign / Reset Password for user @${user.username}:`, defaultGen);
    if (!newPass || !newPass.trim()) return;
    if (newPass.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    try {
      setProcessing(true);
      const res = await fetch(`/api/platform/tenants/${tenantId}/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      alert(`✅ Password successfully reset for @${user.username}!\nNew assigned password: ${newPass.trim()}`);
      fetchTenantProfile();
    } catch (err: any) {
      alert(`Error resetting password: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteStorePermanent = async () => {
    if (tenantId === 'tenant-jagdamba-iron') {
      alert('The primary client store (tenant-jagdamba-iron) cannot be deleted.');
      return;
    }
    if (deleteConfirmInput !== tenant?.slug) {
      alert(`Please enter exact slug "${tenant?.slug}" to confirm permanent deletion.`);
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete store');

      alert(`🗑️ Store "${tenant?.name}" permanently deleted.`);
      onClose();
      if (onTenantUpdated) onTenantUpdated(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Toast Alert */}
        {toast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-orange-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-orange-500/30 text-orange-300 font-bold border border-orange-500/40">
                  {tenant?.id || tenantId}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tenant?.status === 'Active' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                }`}>
                  {tenant?.status || 'Active'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
                {tenant?.name || 'Store Tenant Profile'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {onSwitchTenant && (
              <button
                onClick={() => {
                  onSwitchTenant(tenantId);
                  onClose();
                }}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-sm"
              >
                <span>Switch To This Store</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50 overflow-x-auto gap-2 py-2">
          {[
            { id: 'overview', label: 'Store Profile', icon: Building2 },
            { id: 'subscription', label: 'Subscription Plan', icon: Calendar },
            { id: 'payments', label: `Fee Ledger (${profile?.payments?.length || 0})`, icon: DollarSign },
            { id: 'users', label: `Staff Accounts (${profile?.users?.length || 0})`, icon: Users },
            { id: 'modules', label: 'Feature Modules', icon: Scissors },
            { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              Loading Store Profile Data...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <form onSubmit={handleUpdateStoreProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Store / Business Legal Name
                      </label>
                      <input
                        type="text"
                        value={editStoreForm.name}
                        onChange={e => setEditStoreForm({ ...editStoreForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-orange-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Subdomain Slug
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editStoreForm.slug}
                          onChange={e => setEditStoreForm({ ...editStoreForm, slug: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-l-xl text-xs font-semibold focus:bg-white focus:border-orange-500 outline-hidden"
                        />
                        <span className="px-3 py-2 bg-slate-200 border border-l-0 border-slate-300 rounded-r-xl text-xs font-mono text-slate-600">
                          .anacraft.com
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Nepal PAN / VAT Number
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {editStoreForm.pan ? editStoreForm.pan.length : 0}/9 digits
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={9}
                        value={editStoreForm.pan}
                        onChange={e => setEditStoreForm({ ...editStoreForm, pan: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                        placeholder="9 digits (numbers only)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold font-mono focus:bg-white focus:border-orange-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Contact Person / Yard Manager
                      </label>
                      <input
                        type="text"
                        value={editStoreForm.contactPerson}
                        onChange={e => setEditStoreForm({ ...editStoreForm, contactPerson: e.target.value })}
                        placeholder="e.g. Dinesh Sharma"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-orange-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Phone / Mobile
                        </label>
                        <span className={`text-[10px] font-mono font-bold ${editStoreForm.phone && editStoreForm.phone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {editStoreForm.phone ? editStoreForm.phone.length : 0}/10 digits
                        </span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={editStoreForm.phone}
                        onChange={e => setEditStoreForm({ ...editStoreForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="98XXXXXXXX (10 digits only)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold font-mono focus:bg-white focus:border-orange-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Operating Status
                      </label>
                      <select
                        value={editStoreForm.status}
                        onChange={e => setEditStoreForm({ ...editStoreForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-orange-500 outline-hidden"
                      >
                        <option value="Active">Active & Operational</option>
                        <option value="Suspended">Suspended (Service Locked)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Primary Yard / Counter Address
                      </label>
                      <input
                        type="text"
                        value={editStoreForm.address}
                        onChange={e => setEditStoreForm({ ...editStoreForm, address: e.target.value })}
                        placeholder="e.g. Bhanu Chowk, Biratnagar-9, Morang, Koshi Province"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-orange-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {processing ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SUBSCRIPTION */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {/* Financial Overview KPI Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Contract License Fee</span>
                      <span className="text-xl font-black text-blue-900">
                        Rs. {(Number(subscription.totalAmountDue) || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold block">{subscription.billingCycle || 'Yearly'} Plan Tier</span>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Amount Paid To Date</span>
                      <span className="text-xl font-black text-emerald-800">
                        Rs. {(Number(subscription.amountPaid) || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold block">Collected via Bank/Fonepay</span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      (Number(subscription.remainingBalance) || 0) > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Outstanding Balance</span>
                      <span className={`text-xl font-black ${(Number(subscription.remainingBalance) || 0) > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                        Rs. {(Number(subscription.remainingBalance) || 0).toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-semibold block ${(Number(subscription.remainingBalance) || 0) > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                        {(Number(subscription.remainingBalance) || 0) > 0 ? 'Pending Collection' : 'Account Settled in Full'}
                      </span>
                    </div>
                  </div>

                  {/* Subscription Settings Form */}
                  <form onSubmit={handleSaveSubscription} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Subscription Parameters & Expiry Extension
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Current Plan Tier
                        </label>
                        <select
                          value={subForm.planId}
                          onChange={e => {
                            const newPlan = plans.find(p => p.id === e.target.value);
                            const fee = subForm.billingCycle === 'Monthly' ? (newPlan?.priceMonthly || 3500) : (newPlan?.priceYearly || 35000);
                            setSubForm({ ...subForm, planId: e.target.value, totalAmountDue: String(fee) });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden focus:border-orange-500"
                        >
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Rs. {p.priceYearly?.toLocaleString()}/yr)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Billing Cycle
                        </label>
                        <select
                          value={subForm.billingCycle}
                          onChange={e => {
                            const plan = plans.find(p => p.id === subForm.planId);
                            const fee = e.target.value === 'Monthly' ? (plan?.priceMonthly || 3500) : (plan?.priceYearly || 35000);
                            setSubForm({ ...subForm, billingCycle: e.target.value, totalAmountDue: String(fee) });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden focus:border-orange-500"
                        >
                          <option value="Yearly">Yearly (वार्षिक)</option>
                          <option value="Monthly">Monthly (मासिक)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Contract License Fee (Rs.)
                        </label>
                        <input
                          type="number"
                          value={subForm.totalAmountDue}
                          onChange={e => setSubForm({ ...subForm, totalAmountDue: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Expiry Date (BS/AD)
                        </label>
                        <input
                          type="date"
                          value={subForm.expiryDate}
                          onChange={e => setSubForm({ ...subForm, expiryDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Quick Expiry Extenders */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Quick Add Expiry Extension
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickExtend(1)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        >
                          +1 Month (३० दिन)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickExtend(3)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        >
                          +3 Months (त्रैमासिक)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickExtend(6)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        >
                          +6 Months (अर्धवार्षिक)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickExtend(12)}
                          className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold rounded-lg transition"
                        >
                          +1 Full Year (१ वर्ष थप)
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-200">
                      <button
                        type="submit"
                        disabled={processing}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                      >
                        Update Subscription Terms
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: PAYMENTS LEDGER */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Software License Payment Ledger
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Immutable record of software fees collected from this store.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  </div>

                  {showPaymentForm && (
                    <form onSubmit={handleRecordPayment} className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Amount (Rs.) *</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 75000"
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Payment Method</label>
                          <select
                            value={paymentForm.method}
                            onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          >
                            <option value="Fonepay QR">Fonepay QR (फोनपे)</option>
                            <option value="Bank Transfer (connectIPS)">Bank Transfer (connectIPS)</option>
                            <option value="Nabil Bank Deposit">Nabil Bank Cash Deposit</option>
                            <option value="Cheque Deposit">Bank Cheque (चेक)</option>
                            <option value="Direct Cash">Direct Cash at Office</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Transaction Ref / Cheque No.</label>
                          <input
                            type="text"
                            placeholder="e.g. FP-NABIL-99120"
                            value={paymentForm.transactionRef}
                            onChange={e => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Billing Period</label>
                          <input
                            type="text"
                            placeholder="e.g. 2026/27 Annual Subscription"
                            value={paymentForm.billingPeriod}
                            onChange={e => setPaymentForm({ ...paymentForm, billingPeriod: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Audit Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Verified against bank statement"
                            value={paymentForm.notes}
                            onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-emerald-200">
                        <button
                          type="button"
                          onClick={() => setShowPaymentForm(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={processing}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Payment Record
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Payment Records Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Invoice No.</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Method & Reference</th>
                          <th className="py-2.5 px-3">Period & Notes</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {profile?.payments?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                              No software payment entries recorded yet.
                            </td>
                          </tr>
                        ) : (
                          profile?.payments?.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-semibold text-slate-700">{p.date}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{p.invoiceNo || '-'}</td>
                              <td className="py-2.5 px-3 font-black text-emerald-700">Rs. {p.amount.toLocaleString()}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-800 block">{p.method}</span>
                                <span className="text-[10px] font-mono text-slate-500">{p.transactionRef}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="font-semibold block">{p.billingPeriod || '-'}</span>
                                <span className="text-[10px] text-slate-400">{p.notes}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleDeletePayment(p.id, p.amount)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                                  title="Delete payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: USER ACCOUNTS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Staff & User Access Control
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Cashiers, Storekeepers, Accountants & Owners assigned to this store.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ name: '', email: '', username: '', role: 'cashier', phone: '', active: true });
                        setShowUserModal(true);
                      }}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Staff User</span>
                    </button>
                  </div>

                  {showUserModal && (
                    <form onSubmit={handleSaveUser} className="p-4 bg-orange-50/40 border border-orange-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Bikash Tamang"
                            value={userForm.name}
                            onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Username *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. yardkeeper"
                            value={userForm.username}
                            onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Role</label>
                          <select
                            value={userForm.role}
                            onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                          >
                            <option value="admin">Owner / Store Admin</option>
                            <option value="cashier">Cashier (POS & Invoicing)</option>
                            <option value="storekeeper">Storekeeper (Yard & Cutting)</option>
                            <option value="accountant">Accountant (Ledgers & IRD)</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Phone</label>
                            <span className="text-[9px] font-mono text-slate-400">{userForm.phone.length}/10</span>
                          </div>
                          <input
                            type="text"
                            maxLength={10}
                            placeholder="98XXXXXXXX (10 digits)"
                            value={userForm.phone}
                            onChange={e => setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            Assign Password {editingUser ? '(leave blank to keep current)' : '*'}
                          </label>
                          <input
                            type="text"
                            placeholder={editingUser ? "Leave blank to keep current password" : "Enter password (e.g. staff123)"}
                            value={(userForm as any).password || ''}
                            onChange={e => setUserForm({ ...userForm, password: e.target.value } as any)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-orange-200">
                        <button
                          type="button"
                          onClick={() => setShowUserModal(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={processing}
                          className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          {editingUser ? 'Update Account' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Users List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile?.users?.map((u: any) => (
                      <div key={u.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-slate-900">{u.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-bold uppercase">
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                            <span>@{u.username}</span>
                            {u.phone && <span>• {u.phone}</span>}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleResetUserPassword(u)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                            title="Assign / Reset Password"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setUserForm({
                                name: u.name,
                                email: u.email || '',
                                username: u.username,
                                role: u.role,
                                phone: u.phone || '',
                                active: u.active
                              });
                              setShowUserModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: MODULES */}
              {activeTab === 'modules' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Store Feature Module Entitlements
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Instantly toggle granular software capabilities for this specific business without reinstalling.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'cutRemnants', title: 'Cut-Length Remnants Engine', desc: 'Allows cashier to cut rebars & pipes and records offcut remnants or scrap.', icon: Scissors },
                      { key: 'cbmsSync', title: 'IRD Central Billing (CBMS) API', desc: 'Automated real-time tax invoice synchronization to Nepal Tax authority.', icon: Building2 },
                      { key: 'multiYard', title: 'Multi-Yard & Warehouse Transfers', desc: 'Manage stock across Main Yard (गोदाम १), Cutting Shed, and Counters.', icon: Warehouse },
                      { key: 'dynamicQr', title: 'Dynamic NEPALPAY & Fonepay QR', desc: 'Generates instant dynamic customer payment QR with embedded rupee amount.', icon: QrCode },
                      { key: 'customerKhata', title: 'Customer Khata & Credit Control', desc: 'Running balance ledgers, deposit receipt vouchers, and credit limits.', icon: Users },
                      { key: 'bulkDiscounts', title: 'Bulk Project & Contractor Pricing', desc: 'Volume price breaks and landed cost freight allocation engine.', icon: DollarSign }
                    ].map(mod => {
                      const isEnabled = !!tenant?.modules?.[mod.key];
                      const Icon = mod.icon;
                      return (
                        <div key={mod.key} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-xl shrink-0 ${isEnabled ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{mod.title}</span>
                              <span className="text-[11px] text-slate-500 leading-tight block">{mod.desc}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModule(mod.key)}
                            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-hidden ${
                              isEnabled ? 'bg-orange-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white transition-transform block absolute top-1 ${
                                isEnabled ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: DANGER ZONE */}
              {activeTab === 'danger' && (
                <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                        Permanent Store Deletion
                      </h4>
                      <p className="text-xs text-rose-700 mt-1">
                        Deleting this store will permanently wipe its databases, staff access, domain records, and software ledgers.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  {tenantId === 'tenant-jagdamba-iron' ? (
                    <div className="p-3 bg-white rounded-xl border border-rose-300 text-xs font-bold text-slate-700">
                      🛡️ Protected Store: "Jagdamba Steel & Iron Suppliers" is the default primary client store and cannot be deleted.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-semibold text-slate-700">
                        To confirm deletion, please type the store slug <code className="bg-rose-100 px-1 py-0.5 rounded-sm font-mono text-rose-900">{tenant?.slug}</code> below:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmInput}
                        onChange={e => setDeleteConfirmInput(e.target.value)}
                        placeholder={`Type "${tenant?.slug}" to confirm`}
                        className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-mono font-bold outline-hidden focus:border-rose-600"
                      />
                      <button
                        onClick={handleDeleteStorePermanent}
                        disabled={deleteConfirmInput !== tenant?.slug || processing}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-40"
                      >
                        {processing ? 'Deleting Store...' : 'Permanently Delete This Store'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">Store ID: {tenantId}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}
