import React, { useState, useEffect } from 'react';
import AnayaCraftLogo, { AnayaCraftEmblem, AnayaCraftTechDecor } from '../Common/AnayaCraftLogo';
import TenantProfileModal from './TenantProfileModal';
import {
  Building2,
  Users,
  Shield,
  Globe,
  Plus,
  CheckCircle,
  AlertTriangle,
  Server,
  Key,
  CreditCard,
  ArrowLeftRight,
  Activity,
  Search,
  ExternalLink,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
  Edit,
  Check,
  X,
  Eye,
  Receipt,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronDown,
  Trash2,
  Scissors,
  Warehouse,
  QrCode,
  HelpCircle,
  Send
} from 'lucide-react';

interface Props {
  onTenantUpdated?: (updatedTenant: any) => void;
  onSwitchTenant?: (tenantId: string) => void;
}

export default function DeveloperControlPanel({ onTenantUpdated, onSwitchTenant }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'domains' | 'plans' | 'renewals' | 'audit'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [renewalFilter, setRenewalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modals state
  const [receiptToInspect, setReceiptToInspect] = useState<any>(null);
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<any>(null);
  const [rejectModalTarget, setRejectModalTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionInstructions, setRejectionInstructions] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // New Store Provisioning Form State
  const [newStore, setNewStore] = useState({
    name: '',
    slug: '',
    country: 'Nepal',
    currency: 'Rs.',
    timeZone: 'Asia/Kathmandu',
    planId: 'plan-professional',
    billingCycle: 'Yearly',
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalAmountDue: 75000,
    initialPayment: 75000,
    address: 'Biratnagar, Nepal',
    phone: '',
    pan: '',
    contactPerson: '',
    adminUsername: 'admin',
    adminEmail: '',
    adminName: '',
    adminPassword: 'admin123',
    enableCutRemnants: true,
    enableCbmsSync: true,
    enableMultiYard: true,
    enableDynamicQr: true,
    enableCustomerKhata: true,
    enableBulkDiscounts: true
  });

  // Support Access Grant Form State
  const [supportForm, setSupportForm] = useState({
    tenantId: 'tenant-jagdamba-iron',
    reason: 'Database index optimization & IRD CBMS queue check',
    durationMinutes: 60
  });
  const [issuedGrant, setIssuedGrant] = useState<any>(null);

  // Edit Plan Modal State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    priceMonthly: 3500,
    priceYearly: 35000,
    maxBranches: 1,
    maxStaff: 5,
    maxCustomers: 1000,
    storageQuotaMb: 5120,
    modules: {
      cutRemnants: true,
      cbmsSync: true,
      multiYard: false,
      dynamicQr: true,
      customerKhata: true,
      bulkDiscounts: false
    }
  });

  // Software Owner Payment Config Form State
  const [editPaymentConfigModal, setEditPaymentConfigModal] = useState(false);
  const [paymentConfigForm, setPaymentConfigForm] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    branch: '',
    paymentIdentifier: '',
    fonepayMerchantId: '',
    supportPhone: '',
    supportEmail: '',
    instructions: ''
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPlatformData = async () => {
    setLoading(true);
    try {
      const [resOver, resTenants, resDomains, resPlans, resAudit, resRenewals, resPayConfig] = await Promise.all([
        fetch('/api/platform/overview').then(r => r.json()),
        fetch('/api/platform/tenants').then(r => r.json()),
        fetch('/api/platform/domains').then(r => r.json()),
        fetch('/api/platform/subscriptions').then(r => r.json()),
        fetch('/api/platform/audit-logs').then(r => r.json()),
        fetch('/api/platform/renewals').then(r => r.json()).catch(() => []),
        fetch('/api/platform/payment-config').then(r => r.json()).catch(() => null)
      ]);

      setOverview(resOver);
      setTenants(Array.isArray(resTenants) ? resTenants : []);
      setDomains(Array.isArray(resDomains) ? resDomains : []);
      setPlans(resPlans?.plans || []);
      setAuditLogs(Array.isArray(resAudit) ? resAudit : []);
      setRenewals(Array.isArray(resRenewals) ? resRenewals : []);
      if (resPayConfig) {
        setPaymentConfig(resPayConfig);
        setPaymentConfigForm(resPayConfig);
      }
    } catch (err) {
      console.error('Error fetching platform data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleApproveRenewal = async (renewal: any) => {
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/platform/renewals/${renewal.id}/approve`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToastMsg(`✅ Subscription renewal approved! Store "${renewal.tenantName}" status Active and expiry extended.`);
      setApproveConfirmTarget(null);
      fetchPlatformData();
    } catch (err: any) {
      alert(`Approval Error: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRejectRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting the renewal.');
      return;
    }
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/platform/renewals/${rejectModalTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectionReason.trim(),
          instructions: rejectionInstructions.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToastMsg(`⛔ Renewal voucher rejected for "${rejectModalTarget.tenantName}". User notified.`);
      setRejectModalTarget(null);
      setRejectionReason('');
      setRejectionInstructions('');
      fetchPlatformData();
    } catch (err: any) {
      alert(`Rejection Error: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce phone validation: Accept numbers only and require exactly 10 digits
    const cleanPhone = (newStore.phone || '').trim();
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      alert('Contact Phone is required, must contain numbers only, and must be exactly 10 digits.');
      return;
    }

    if (newStore.pan && !/^\d{9}$/.test(newStore.pan.trim())) {
      alert('Nepal PAN / VAT No. must contain numbers only and be 9 digits.');
      return;
    }

    if (!newStore.adminPassword || newStore.adminPassword.trim().length < 4) {
      alert('Assigned Admin Password must be at least 4 characters long.');
      return;
    }

    setActionProcessing(true);
    try {
      const res = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStore)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToastMsg(`✅ Iron Store "${newStore.name}" provisioned successfully with isolated database store!`);
      setCreateModalOpen(false);
      fetchPlatformData();
    } catch (err: any) {
      alert(`Error provisioning store: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleToggleStoreStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status update failed');
      showToastMsg(`Store status updated to ${newStatus}`);
      fetchPlatformData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleModule = async (tenantId: string, moduleName: string) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/toggle-module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToastMsg(`✅ Module [${moduleName}] updated! State: ${data.enabled ? 'ENABLED' : 'DISABLED'}`);
      fetchPlatformData();
      if (onTenantUpdated && data.tenant) onTenantUpdated(data.tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickChangePlan = async (tenantId: string, newPlanId: string) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlanId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToastMsg(`✅ Store subscription plan changed to ${newPlanId}!`);
      fetchPlatformData();
      if (onTenantUpdated && data.tenant) onTenantUpdated(data.tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const res = await fetch('/api/platform/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToastMsg(`✅ Domain verified & active!`);
      fetchPlatformData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const res = await fetch('/api/platform/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentConfigForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToastMsg('✅ Software owner banking & payment details updated!');
      setEditPaymentConfigModal(false);
      fetchPlatformData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleIssueSupportGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const res = await fetch('/api/platform/support-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supportForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIssuedGrant(data.grant);
      showToastMsg('✅ Time-limited audited support access token issued!');
      fetchPlatformData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Filtered tenants list
  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.pan && t.pan.includes(searchQuery)) ||
      (t.contactPerson && t.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || t.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const pendingRenewalsCount = (renewals || []).filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification Alert */}
      {toast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between font-bold text-xs">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Platform Branding & Action Header */}
      <div className="relative overflow-hidden p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl border border-slate-700 shadow-xl">
        <AnayaCraftTechDecor />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <AnayaCraftEmblem size={54} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                  DEVELOPER PLATFORM ADMIN
                </span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>SQLite WAL Engine Online</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Nepal Iron Cloud • Multi-Tenant Developer Console
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                Centralized SaaS provisioning, software licensing fees, multi-store database isolation, IRD CBMS monitoring & subscription renewal verification.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Provision New Store</span>
            </button>
            <button
              onClick={() => {
                setIssuedGrant(null);
                setSupportModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            >
              <Shield className="w-4 h-4 text-orange-400" />
              <span>Support Grant</span>
            </button>
            <button
              onClick={fetchPlatformData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-xl transition"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity },
          { id: 'tenants', label: `Iron Stores (${tenants.length})`, icon: Building2 },
          { id: 'domains', label: `Domains & FQDN (${domains.length})`, icon: Globe },
          { id: 'plans', label: `Subscription Tiers (${plans.length})`, icon: CreditCard },
          { id: 'renewals', label: `Renewals & Receipts (${renewals.length})`, icon: Receipt, hasPending: pendingRenewalsCount > 0 },
          { id: 'audit', label: `Audit Trail & Grants`, icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition relative whitespace-nowrap ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/30'
                  : tab.hasPending
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.hasPending && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SaaS Financial Summary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hardware Stores</span>
              <div className="text-2xl font-black text-slate-900">{overview?.totalTenants || tenants.length}</div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>{overview?.activeTenantsCount || 3} Active & Operational</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs space-y-1 bg-gradient-to-br from-white to-blue-50/40">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Total Software Fees Due</span>
              <div className="text-2xl font-black text-blue-900">
                Rs. {(Number(overview?.totalSoftwareDue) || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-blue-600 font-medium">Cumulative annual contract values</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-1 bg-gradient-to-br from-white to-emerald-50/40">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Software Amount Paid</span>
              <div className="text-2xl font-black text-emerald-800">
                Rs. {(Number(overview?.totalSoftwarePaid) || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold">
                {overview?.totalSoftwareDue > 0
                  ? Math.round((overview.totalSoftwarePaid / overview.totalSoftwareDue) * 100)
                  : 100}% Collected in Bank
              </div>
            </div>

            <div className={`p-4 bg-white rounded-2xl border shadow-xs space-y-1 ${
              (overview?.totalRemainingBalance || 0) > 0
                ? 'border-amber-300 bg-gradient-to-br from-white to-amber-50/50'
                : 'border-slate-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
              <div className={`text-2xl font-black ${(overview?.totalRemainingBalance || 0) > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                Rs. {(Number(overview?.totalRemainingBalance) || 0).toLocaleString()}
              </div>
              <div className="text-[11px] font-bold">
                {(overview?.totalRemainingBalance || 0) > 0 ? (
                  <span className="text-amber-700">Receivables pending collection</span>
                ) : (
                  <span className="text-emerald-600">All store licenses settled</span>
                )}
              </div>
            </div>
          </div>

          {/* Secondary System Telemetry Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Registered Khata Customers</span>
                <span className="text-xl font-black text-slate-900">{overview?.totalCustomers || 15}</span>
                <span className="text-[11px] text-slate-500 block">Builders, contractors & fabricators</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Products Catalogue (Items)</span>
                <span className="text-xl font-black text-slate-900">{overview?.totalProducts || 14}</span>
                <span className="text-[11px] text-slate-500 block">TMT Rebars, MS Pipes, CGI Sheets</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Warehouse className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Security & Compliance</span>
                <span className="text-xl font-black text-emerald-600">100% OK</span>
                <span className="text-[11px] text-emerald-700 block">IRD Sch 5/10 & SQLite WAL Foreign Keys</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Featured Primary Store Highlight */}
          <div className="p-5 bg-gradient-to-r from-orange-50 via-slate-50 to-orange-50 border-2 border-orange-200 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-orange-600 text-white font-mono text-[10px] font-bold rounded-md">
                  Primary Client Store
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">tenant-jagdamba-iron</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Jagdamba Steel & Iron Suppliers Pvt. Ltd.
              </h3>
              <p className="text-xs text-slate-600">
                Proprietor: <strong>Dinesh Sharma</strong> | PAN: <strong>601239841</strong> | Location: <strong>Bhanu Chowk, Biratnagar-9</strong> | Subdomain: <strong>jagdamba-iron.anacraft.com</strong>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedTenantForProfile('tenant-jagdamba-iron')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Store Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TENANTS LIST */}
      {/* ========================================================================= */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Search & Filter Header Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search store name, slug, PAN, owner..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-orange-500 outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              >
                <option value="all">All Statuses ({tenants.length})</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Provision Store</span>
              </button>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Store Identity & PAN</th>
                    <th className="py-3 px-4">Plan Tier</th>
                    <th className="py-3 px-4">Feature Modules</th>
                    <th className="py-3 px-4">Financial Ledger</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                        No stores found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map(t => {
                      const sub = t.subscription || {};
                      const isSuspended = t.status === 'Suspended';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black shrink-0">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{t.name}</span>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                                  <span className="font-mono text-orange-600 font-semibold">{t.slug}.anacraft.com</span>
                                  {t.pan && <span>• PAN: {t.pan}</span>}
                                </div>
                                <span className="text-[10px] text-slate-400 block">{t.address}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={sub.planId || t.planId}
                              onChange={e => handleQuickChangePlan(t.id, e.target.value)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-hidden"
                            >
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {sub.billingCycle || 'Yearly'} • Exp: {sub.expiryDate?.split('T')[0] || '2027'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {[
                                { key: 'cutRemnants', label: 'Cut Remnants' },
                                { key: 'cbmsSync', label: 'IRD CBMS' },
                                { key: 'multiYard', label: 'Multi-Yard' },
                                { key: 'dynamicQr', label: 'Fonepay QR' },
                                { key: 'customerKhata', label: 'Khata Credit' }
                              ].map(m => {
                                const active = !!t.modules?.[m.key];
                                return (
                                  <button
                                    key={m.key}
                                    onClick={() => handleToggleModule(t.id, m.key)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                      active
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                    }`}
                                    title={`Click to toggle ${m.label}`}
                                  >
                                    {m.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-[11px] space-y-0.5">
                              <div>Due: <strong className="text-slate-800">Rs. {(Number(sub.totalAmountDue) || 0).toLocaleString()}</strong></div>
                              <div>Paid: <strong className="text-emerald-700">Rs. {(Number(sub.amountPaid) || 0).toLocaleString()}</strong></div>
                              <div className={Number(sub.remainingBalance) > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                                Bal: Rs. {(Number(sub.remainingBalance) || 0).toLocaleString()}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStoreStatus(t.id, t.status)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center space-x-1 ${
                                isSuspended
                                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              <span>{t.status}</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setSelectedTenantForProfile(t.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition flex items-center space-x-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Profile</span>
                              </button>
                              {onSwitchTenant && (
                                <button
                                  onClick={() => onSwitchTenant(t.id)}
                                  className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg transition"
                                  title="Switch to this store"
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOMAINS & FQDN */}
      {/* ========================================================================= */}
      {activeTab === 'domains' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Managed Hostnames & Custom Domains
              </h3>
              <p className="text-xs text-slate-500">
                SSL automation and DNS verification for multi-tenant retail storefronts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map(d => (
              <div key={d.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="font-mono text-sm font-bold text-slate-900">{d.domain}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    d.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {d.verified ? 'SSL Active (Let\'s Encrypt)' : 'Pending DNS'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>Tenant: <strong className="text-slate-800">{d.tenantId}</strong></div>
                  <div>Type: <span className="font-mono text-slate-500 uppercase">{d.type}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">DNS Target: ingress.anacraft.com</span>
                  {!d.verified && (
                    <button
                      onClick={() => handleVerifyDomain(d.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      Verify DNS
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DNS Configuration Guide Box */}
          <div className="p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider">
              DNS Configuration Instructions for Iron Store Clients
            </h4>
            <p className="text-xs text-slate-300">
              To point a client's custom domain (e.g. <code className="text-orange-300">billing.jagdambairon.com.np</code>) to AnayaCraft Iron Cloud, have the client add a CNAME record at their domain registrar (Mercantile / .np or Cloudflare):
            </p>
            <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 space-y-1">
              <div>Type: <span className="text-emerald-400 font-bold">CNAME</span></div>
              <div>Host / Name: <span className="text-emerald-400 font-bold">billing</span></div>
              <div>Value / Target: <span className="text-emerald-400 font-bold">ingress.anacraft.com</span></div>
              <div>TTL: <span className="text-slate-400">Automatic / 300s</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUBSCRIPTION PLANS */}
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Software Subscription Tier Catalog
              </h3>
              <p className="text-xs text-slate-500">
                Packaging, pricing (NPR), quotas, and feature entitlements per tier.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold uppercase">
                      {p.id}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900">{p.name}</h4>
                    <div className="mt-2 flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-slate-900">Rs. {p.priceYearly?.toLocaleString()}</span>
                      <span className="text-xs text-slate-500">/year</span>
                    </div>
                    <span className="text-xs text-slate-400">or Rs. {p.priceMonthly?.toLocaleString()}/month</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Max Branches / Yards:</span>
                      <strong className="text-slate-800">{p.maxBranches}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Max Staff Accounts:</span>
                      <strong className="text-slate-800">{p.maxStaff}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Customer Khata Limit:</span>
                      <strong className="text-slate-800">{p.maxCustomers?.toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cloud Storage Quota:</span>
                      <strong className="text-slate-800">{Math.round(p.storageQuotaMb / 1024)} GB</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entitled Modules</span>
                    {Object.entries(p.modules || {}).map(([k, val]) => (
                      <div key={k} className="flex items-center space-x-1.5 text-xs">
                        {val ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={val ? 'text-slate-700 font-medium capitalize' : 'text-slate-400 line-through capitalize'}>
                          {k}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <span className="text-[11px] font-semibold text-slate-400">Production Plan Tier</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RENEWALS & RECEIPTS VERIFICATION */}
      {/* ========================================================================= */}
      {activeTab === 'renewals' && (
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Subscription Renewals & Bank Receipts Queue
              </h3>
              <p className="text-xs text-slate-500">
                Verify payment vouchers submitted by clients before extending their subscription.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditPaymentConfigModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1"
              >
                <CreditCard className="w-3.5 h-3.5 text-orange-600" />
                <span>Configure Banking / QR</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2">
            {[
              { id: 'all', label: `All Requests (${renewals.length})` },
              { id: 'pending', label: `Pending Verification (${renewals.filter(r => r.status === 'PENDING').length})` },
              { id: 'approved', label: `Approved (${renewals.filter(r => r.status === 'APPROVED').length})` },
              { id: 'rejected', label: `Rejected (${renewals.filter(r => r.status === 'REJECTED').length})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setRenewalFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  renewalFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Renewals Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renewals
              .filter(r => renewalFilter === 'all' || r.status.toLowerCase() === renewalFilter.toLowerCase())
              .map(r => {
                const isPending = r.status === 'PENDING';
                const isApproved = r.status === 'APPROVED';
                return (
                  <div key={r.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{r.id}</span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 mt-1">{r.tenantName}</h4>
                        <span className="text-xs text-slate-500">Payer Name: <strong className="text-slate-700">{r.payerName}</strong></span>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-700">Rs. {r.amount?.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 block">{r.billingCycle} Plan</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div>Plan: <strong className="text-slate-800">{r.planName}</strong></div>
                      <div>Txn Ref: <code className="bg-slate-200 px-1 py-0.5 rounded-sm font-mono text-slate-800">{r.transactionRef}</code></div>
                      <div>Submitted: <span className="text-slate-500">{new Date(r.submittedAt).toLocaleString()}</span></div>
                      {r.rejectionReason && (
                        <div className="text-rose-700 font-semibold pt-1">Rejection Reason: {r.rejectionReason}</div>
                      )}
                    </div>

                    {/* Receipt Preview & Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setReceiptToInspect(r)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Voucher</span>
                      </button>

                      {isPending && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setRejectModalTarget(r);
                              setRejectionReason('');
                              setRejectionInstructions('Please re-upload a clear voucher screenshot showing the verified Nabil Bank transaction reference number.');
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setApproveConfirmTarget(r)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                          >
                            Approve Renewal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Platform Action & Security Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Immutable chronological log of store provisioning, module toggles, and financial verifications.
              </p>
            </div>
            <button
              onClick={() => {
                setIssuedGrant(null);
                setSupportModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Issue Audited Support Grant</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Store Target</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-orange-600 font-semibold">
                        {log.tenantId || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {log.user}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROVISION NEW STORE WIZARD */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Provision New Iron Store Tenant</h3>
                  <p className="text-xs text-slate-500">Deploys an isolated SQLite store with authentic Nepal steel catalog.</p>
                </div>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Butwal Steel & Hardware Center"
                    value={newStore.name}
                    onChange={e => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-');
                      setNewStore({ ...newStore, name, slug });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Subdomain Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. butwal-steel"
                    value={newStore.slug}
                    onChange={e => setNewStore({ ...newStore, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Subscription Plan Tier</label>
                  <select
                    value={newStore.planId}
                    onChange={e => {
                      const plan = plans.find(p => p.id === e.target.value);
                      const fee = newStore.billingCycle === 'Monthly' ? (plan?.priceMonthly || 3500) : (plan?.priceYearly || 75000);
                      setNewStore({ ...newStore, planId: e.target.value, totalAmountDue: fee, initialPayment: fee });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Nepal PAN / VAT No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 605192841"
                    value={newStore.pan}
                    onChange={e => setNewStore({ ...newStore, pan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Owner / Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Ram Kumar Shrestha"
                    value={newStore.contactPerson}
                    onChange={e => setNewStore({ ...newStore, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Contact Phone *</label>
                    <span className={`text-[10px] font-mono font-bold ${newStore.phone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {newStore.phone.length}/10 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="98XXXXXXXX (10 digits only)"
                    value={newStore.phone}
                    onChange={e => {
                      // Accept numbers only and require exactly 10 digits. Do not allow letters, other characters, or more than 10 digits.
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewStore({ ...newStore, phone: onlyDigits });
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold font-mono focus:bg-white outline-hidden transition ${
                      newStore.phone && newStore.phone.length !== 10
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                        : 'border-slate-300'
                    }`}
                  />
                  {newStore.phone && newStore.phone.length !== 10 && (
                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                      Must be exactly 10 digits (currently {newStore.phone.length})
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Initial License Fee Collected (Rs.)</label>
                  <input
                    type="number"
                    value={newStore.initialPayment}
                    onChange={e => setNewStore({ ...newStore, initialPayment: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-800 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Yard Address / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Traffic Chowk, Butwal, Lumbini Province"
                    value={newStore.address}
                    onChange={e => setNewStore({ ...newStore, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Initial Admin Credentials & Password Assignment */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Initial Store Administrator Account
                  </span>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md border border-orange-200">
                    Assign & Reset Password
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Admin Username</label>
                    <input
                      type="text"
                      placeholder="Admin Username (default: admin)"
                      value={newStore.adminUsername}
                      onChange={e => setNewStore({ ...newStore, adminUsername: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Admin Email</label>
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={newStore.adminEmail}
                      onChange={e => setNewStore({ ...newStore, adminEmail: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-hidden"
                    />
                  </div>
                </div>

                {/* Assign / Reset Password Option */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>Assign Initial Password *</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const generated = 'Iron@' + Math.floor(1000 + Math.random() * 9000);
                          setNewStore({ ...newStore, adminPassword: generated });
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        ⚡ Generate Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStore({ ...newStore, adminPassword: 'admin123' })}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                      >
                        ↺ Reset (admin123)
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Enter assigned password for administrator"
                      value={newStore.adminPassword}
                      onChange={e => setNewStore({ ...newStore, adminPassword: e.target.value })}
                      className="w-full pl-3 pr-20 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Assigned
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    This password will be assigned to the initial admin user to sign into the store.
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {actionProcessing ? 'Provisioning...' : 'Complete Store Deployment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT PAYMENT VOUCHER */}
      {/* ========================================================================= */}
      {receiptToInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Subscription Payment Voucher</h3>
                <p className="text-xs text-slate-500">{receiptToInspect.tenantName} • Ref: {receiptToInspect.transactionRef}</p>
              </div>
              <button onClick={() => setReceiptToInspect(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 p-2 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200">
              <img
                src={receiptToInspect.receiptUrl}
                alt="Bank Voucher Preview"
                className="max-h-80 w-auto object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>Payer Name: <strong className="text-slate-800">{receiptToInspect.payerName}</strong></div>
              <div>Amount: <strong className="text-emerald-700">Rs. {receiptToInspect.amount?.toLocaleString()}</strong></div>
              <div>Plan: <strong className="text-slate-800">{receiptToInspect.planName}</strong></div>
              <div>Timestamp: <span className="text-slate-500">{new Date(receiptToInspect.submittedAt).toLocaleString()}</span></div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceiptToInspect(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPROVE RENEWAL CONFIRMATION */}
      {/* ========================================================================= */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-black text-slate-900">Approve Subscription Renewal</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm bank receipt verification for <strong>"{approveConfirmTarget.tenantName}"</strong>.
              Approving will extend the subscription expiry date by <strong>{approveConfirmTarget.billingCycle === 'Monthly' ? '1 Month' : '1 Year'}</strong>, mark the store Active, and record Rs. {approveConfirmTarget.amount?.toLocaleString()} in the software fee ledger.
            </p>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
              <div>Amount: <strong className="text-emerald-800">Rs. {approveConfirmTarget.amount?.toLocaleString()}</strong></div>
              <div>Ref: <span className="font-mono text-slate-700">{approveConfirmTarget.transactionRef}</span></div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setApproveConfirmTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveRenewal(approveConfirmTarget)}
                disabled={actionProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {actionProcessing ? 'Processing...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT RENEWAL */}
      {/* ========================================================================= */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black text-slate-900">Reject Renewal Voucher</h3>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting renewal for <strong>"{rejectModalTarget.tenantName}"</strong> will notify the store owner with instructions to resubmit.
            </p>

            <form onSubmit={handleRejectRenewal} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Transaction reference does not match Nabil Bank statement."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Resubmission Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please re-upload a clear voucher screenshot showing the verified transaction reference."
                  value={rejectionInstructions}
                  onChange={e => setRejectionInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {actionProcessing ? 'Rejecting...' : 'Reject & Notify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDITED SUPPORT GRANT */}
      {/* ========================================================================= */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black text-slate-900">Issue Audited Support Grant</h3>
              </div>
              <button onClick={() => setSupportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {issuedGrant ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Support Grant Active</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div>Store: <strong className="text-slate-800">{issuedGrant.storeName}</strong></div>
                  <div>Valid For: <strong className="text-slate-800">{issuedGrant.durationMinutes} Minutes</strong></div>
                  <div>Expires: <span className="font-mono text-slate-600">{new Date(issuedGrant.expiresAt).toLocaleTimeString()}</span></div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Time-Limited Access Token</span>
                  <div className="p-2 bg-white rounded-lg border border-emerald-300 font-mono text-[11px] text-slate-800 break-all select-all">
                    {issuedGrant.token}
                  </div>
                </div>
                <button
                  onClick={() => setSupportModalOpen(false)}
                  className="w-full py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssueSupportGrant} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Store Target *</label>
                  <select
                    value={supportForm.tenantId}
                    onChange={e => setSupportForm({ ...supportForm, tenantId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Documented Support Reason *</label>
                  <textarea
                    required
                    rows={2}
                    value={supportForm.reason}
                    onChange={e => setSupportForm({ ...supportForm, reason: e.target.value })}
                    placeholder="e.g. Debugging IRD CBMS tax sync timeout"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Duration (Minutes)</label>
                  <select
                    value={supportForm.durationMinutes}
                    onChange={e => setSupportForm({ ...supportForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes (1 Hour)</option>
                    <option value={120}>120 Minutes (2 Hours)</option>
                    <option value={360}>360 Minutes (6 Hours)</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSupportModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionProcessing}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {actionProcessing ? 'Generating...' : 'Issue Support Token'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURE SOFTWARE OWNER PAYMENT GATEWAY */}
      {/* ========================================================================= */}
      {editPaymentConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black text-slate-900">Software Owner Bank & QR Gateway</h3>
              </div>
              <button onClick={() => setEditPaymentConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentConfig} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Beneficiary Account Name</label>
                  <input
                    type="text"
                    value={paymentConfigForm.accountName}
                    onChange={e => setPaymentConfigForm({ ...paymentConfigForm, accountName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={paymentConfigForm.bankName}
                    onChange={e => setPaymentConfigForm({ ...paymentConfigForm, bankName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Account Number</label>
                  <input
                    type="text"
                    value={paymentConfigForm.accountNumber}
                    onChange={e => setPaymentConfigForm({ ...paymentConfigForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={paymentConfigForm.branch}
                    onChange={e => setPaymentConfigForm({ ...paymentConfigForm, branch: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Fonepay Merchant ID / Phone</label>
                  <input
                    type="text"
                    value={paymentConfigForm.fonepayMerchantId}
                    onChange={e => setPaymentConfigForm({ ...paymentConfigForm, fonepayMerchantId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold font-mono outline-hidden"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Payment Instructions to Clients</label>
                  <textarea
                    rows={2}
                    value={paymentConfigForm.instructions}
                    onChange={e => setPaymentConfigForm({ ...paymentConfigForm, instructions: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditPaymentConfigModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Banking Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STORE / TENANT PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedTenantForProfile && (
        <TenantProfileModal
          isOpen={!!selectedTenantForProfile}
          tenantId={selectedTenantForProfile}
          onClose={() => setSelectedTenantForProfile(null)}
          plans={plans}
          onTenantUpdated={() => fetchPlatformData()}
          onSwitchTenant={onSwitchTenant}
        />
      )}

    </div>
  );
}
