import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Global Fetch Interceptor: Ensures all API requests carry the active Tenant ID
// and Bearer authorization token, providing seamless multi-tenant isolation.
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem('iron_store_token');
  const activeTenant = localStorage.getItem('iron_store_active_tenant') || 'tenant-jagdamba-iron';

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (activeTenant && !headers.has('x-tenant-id')) {
    headers.set('x-tenant-id', activeTenant);
  }

  return originalFetch(input, { ...init, headers });
};

document.title = 'Inventory Management';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
