import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  status: string;
  pan?: string;
  phone?: string;
  address?: string;
  planId?: string;
}

interface TenantContextType {
  activeTenantId: string;
  activeTenant: TenantProfile | null;
  availableTenants: TenantProfile[];
  switchTenant: (tenantId: string) => void;
  reloadTenantMeta: () => Promise<void>;
  loadingTenant: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    return localStorage.getItem('iron_store_active_tenant') || 'tenant-jagdamba-iron';
  });
  const [activeTenant, setActiveTenant] = useState<TenantProfile | null>(null);
  const [availableTenants, setAvailableTenants] = useState<TenantProfile[]>([]);
  const [loadingTenant, setLoadingTenant] = useState<boolean>(false);

  // Sync active tenant with current user's bound tenant if not super_admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin' && (currentUser as any).tenantId) {
      const userTenant = (currentUser as any).tenantId;
      if (userTenant !== activeTenantId) {
        setActiveTenantId(userTenant);
        localStorage.setItem('iron_store_active_tenant', userTenant);
      }
    }
  }, [currentUser]);

  // Keep localStorage in sync
  useEffect(() => {
    localStorage.setItem('iron_store_active_tenant', activeTenantId);
  }, [activeTenantId]);

  // Fetch available tenants and current tenant profile
  const reloadTenantMeta = async () => {
    setLoadingTenant(true);
    try {
      // 1. Fetch all tenants if super_admin or available
      const tenantsRes = await fetch('/api/platform/tenants');
      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        if (Array.isArray(tenantsData)) {
          setAvailableTenants(tenantsData);
          const current = tenantsData.find((t: any) => t.id === activeTenantId);
          if (current) setActiveTenant(current);
        }
      }

      // 2. Fetch active settings for store name
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.success && sData.data) {
          const shopName = sData.data.shop_name_en || sData.data.company_name_en;
          setActiveTenant(prev => ({
            id: activeTenantId,
            name: shopName || prev?.name || 'Iron Store',
            slug: prev?.slug || 'iron-store',
            status: prev?.status || 'Active',
            pan: sData.data.pan_number || sData.data.company_pan || prev?.pan,
            phone: sData.data.phone || sData.data.company_phone || prev?.phone,
            address: sData.data.address_en || sData.data.company_address || prev?.address
          }));
        }
      }
    } catch (e) {
      console.warn('Tenant meta error:', e);
    } finally {
      setLoadingTenant(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      reloadTenantMeta();
    }
  }, [activeTenantId, currentUser]);

  const switchTenant = (tenantId: string) => {
    if (!tenantId || tenantId === activeTenantId) return;
    localStorage.setItem('iron_store_active_tenant', tenantId);
    setActiveTenantId(tenantId);
  };

  return (
    <TenantContext.Provider
      value={{
        activeTenantId,
        activeTenant,
        availableTenants,
        switchTenant,
        reloadTenantMeta,
        loadingTenant
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
};
