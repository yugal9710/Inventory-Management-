import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { Navbar } from './components/Navbar';
import { Sidebar, ScreenId } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NewSale } from './pages/NewSale';
import { Products } from './pages/Products';
import { Purchases } from './pages/Purchases';
import { Inventory } from './pages/Inventory';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Cashbook } from './pages/Cashbook';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import DeveloperControlPanel from './components/Developer/DeveloperControlPanel';
import { LoginPage } from './components/Auth/LoginPage';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeTenantId, switchTenant } = useTenant();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');

  // Strict Authentication Gate: require valid login before accessing any ERP modules
  if (!currentUser) {
    return <LoginPage />;
  }

  const handleSwitchTenant = (tenantId: string) => {
    switchTenant(tenantId);
    setCurrentScreen('dashboard');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={(screen) => setCurrentScreen(screen)} />;
      case 'pos':
        return <NewSale />;
      case 'products':
        return <Products />;
      case 'purchases':
        return <Purchases />;
      case 'inventory':
        return <Inventory />;
      case 'customers':
        return <Customers />;
      case 'suppliers':
        return <Suppliers />;
      case 'cashbook':
        return <Cashbook />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'developer':
        if (currentUser.role !== 'super_admin') {
          return <Dashboard onNavigate={(screen) => setCurrentScreen(screen)} />;
        }
        return <DeveloperControlPanel onSwitchTenant={handleSwitchTenant} />;
      default:
        return <Dashboard onNavigate={(screen) => setCurrentScreen(screen)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onNavigate={setCurrentScreen} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentScreen={currentScreen} onSelectScreen={setCurrentScreen} />
        <main
          key={activeTenantId}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-opacity duration-150"
        >
          {renderScreen()}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TenantProvider>
            <AppContent />
          </TenantProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
