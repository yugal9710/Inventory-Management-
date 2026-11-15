import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');

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
        return <DeveloperControlPanel onSwitchTenant={() => setCurrentScreen('dashboard')} />;
      default:
        return <Dashboard onNavigate={(screen) => setCurrentScreen(screen)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentScreen={currentScreen} onSelectScreen={setCurrentScreen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
