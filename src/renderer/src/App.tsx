import React, { useState, useEffect } from 'react';
import { useLanguage } from './i18n/LanguageContext';
import { Header } from './components/Header';
import { Sidebar, PageId } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { CustomersView } from './components/CustomersView';
import { MonthlyKhattaView } from './components/MonthlyKhattaView';
import { AllRecordsView } from './components/AllRecordsView';
import { SuppliersView } from './components/SuppliersView';
import { DailyStockView } from './components/DailyStockView';
import { DailySaleView } from './components/DailySaleView';
import { ExpensesView } from './components/ExpensesView';
import { GheeView } from './components/GheeView';
import { ShopperView } from './components/ShopperView';
import { SettingsView } from './components/SettingsView';
import { WhatsAppBillingView } from './components/WhatsAppBillingView';
import { CloseBackupModal } from './components/CloseBackupModal';
import { PlaceholderPageView } from './components/PlaceholderPageView';
import { AddMilkModal } from './components/AddMilkModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { Loader } from './components/Loader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DbInfo, CustomerItem } from './types/electron';

export const App: React.FC = () => {
  const { t, language } = useLanguage();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [pageHistory, setPageHistory] = useState<PageId[]>(['dashboard']);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const navigateTo = (page: PageId) => {
    if (page !== activePage) {
      setPageHistory((prev) => [...prev, page]);
      setActivePage(page);
    }
  };

  const handleBack = () => {
    if (pageHistory.length > 1) {
      const nextHistory = [...pageHistory];
      nextHistory.pop(); // remove current page
      const prevPage = nextHistory[nextHistory.length - 1] || 'dashboard';
      setPageHistory(nextHistory);
      setActivePage(prevPage);
    } else {
      setActivePage('dashboard');
      setPageHistory(['dashboard']);
    }
  };

  // Modals
  const [isAddMilkOpen, setIsAddMilkOpen] = useState<boolean>(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [customerRefreshKey, setCustomerRefreshKey] = useState<number>(0);

  // Database Info from Main process
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);

  // Initial load
  useEffect(() => {
    async function initApp() {
      try {
        if (window.electronAPI) {
          const info = await window.electronAPI.getDbInfo();
          setDbInfo(info);
        } else {
          // Fallback if running directly in web browser without Electron
          setDbInfo({
            success: true,
            isConnected: true,
            dbPath: 'Browser Mock Mode (Run via Electron for native SQLite)',
            userDataPath: 'Local',
            appVersion: '1.0.0',
          });
        }
      } catch (err) {
        console.error('Failed to get database info:', err);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 600);
      }
    }

    initApp();
  }, []);

  const handleLoginSuccess = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 400);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActivePage('dashboard');
    setPageHistory(['dashboard']);
  };

  // Resolve current page title
  const getPageTitle = (): string => {
    switch (activePage) {
      case 'dashboard':
        return t.dashboard;
      case 'monthly-khatta':
        return t.monthlyKhatta;
      case 'customers':
        return t.customers;
      case 'suppliers':
        return t.suppliers;
      case 'daily-sale':
        return t.dailySale;
      case 'all-record':
        return t.allRecord;
      case 'daily-stock':
        return t.dailyStock;
      case 'fleet-expenses':
        return t.fleetExpenses;
      case 'ghee':
        return t.gheeStock;
      case 'shopper':
        return t.shopperStock;
      case 'monthly-bills':
        return t.monthlyBills;
      case 'payments':
        return t.payments;
      case 'settings':
        return t.settings;
      default:
        return t.appName;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        {isLoading && <Loader message={t.loading} />}
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#030712] text-slate-100 flex flex-col font-sans select-none">
      {isLoading && <Loader message={t.loading} />}

      {/* Top Header */}
      <Header
        title={getPageTitle()}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={handleLogout}
        isDbConnected={dbInfo?.isConnected ?? false}
        canGoBack={activePage !== 'dashboard'}
        onBack={handleBack}
      />

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        activePage={activePage}
        onSelectPage={(page) => navigateTo(page)}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto">
        <ErrorBoundary onReset={() => setActivePage('dashboard')}>
        {activePage === 'dashboard' && (
          <DashboardScreen
            onOpenAddMilk={() => navigateTo('daily-sale')}
            onNavigate={(page) => navigateTo(page as PageId)}
            dbInfo={dbInfo}
          />
        )}

        {activePage === 'customers' && (
          <CustomersView
            refreshKey={customerRefreshKey}
            onOpenAddCustomer={() => {
              setEditingCustomer(null);
              setIsAddCustomerOpen(true);
            }}
            onEditCustomer={(c) => {
              setEditingCustomer(c);
              setIsAddCustomerOpen(true);
            }}
          />
        )}

        {activePage === 'monthly-khatta' && <MonthlyKhattaView />}

        {activePage === 'suppliers' && <SuppliersView />}

        {activePage === 'daily-stock' && <DailyStockView onNavigate={(page) => navigateTo(page as PageId)} />}

        {activePage === 'all-record' && <AllRecordsView />}

        {activePage === 'daily-sale' && <DailySaleView />}

        {activePage === 'fleet-expenses' && <ExpensesView />}

        {activePage === 'ghee' && <GheeView />}

        {activePage === 'shopper' && <ShopperView />}

        {activePage === 'monthly-bills' && <WhatsAppBillingView />}

        {activePage === 'settings' && <SettingsView dbInfo={dbInfo} />}

        {activePage !== 'dashboard' &&
          activePage !== 'monthly-khatta' &&
          activePage !== 'suppliers' &&
          activePage !== 'daily-stock' &&
          activePage !== 'customers' &&
          activePage !== 'daily-sale' &&
          activePage !== 'all-record' &&
          activePage !== 'fleet-expenses' &&
          activePage !== 'ghee' &&
          activePage !== 'shopper' &&
          activePage !== 'monthly-bills' &&
          activePage !== 'settings' && (
            <PlaceholderPageView pageId={activePage} dbInfo={dbInfo} />
          )}
        </ErrorBoundary>
      </main>

      {/* Modals */}
      <AddMilkModal
        isOpen={isAddMilkOpen}
        onClose={() => setIsAddMilkOpen(false)}
        onSuccess={() => {
          // Trigger refresh if currently on dashboard
          if (activePage === 'dashboard') {
            setActivePage('dashboard');
          }
        }}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        customer={editingCustomer}
        onClose={() => {
          setIsAddCustomerOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={() => {
          setCustomerRefreshKey((k) => k + 1);
        }}
      />

      {/* Cloud Auto-Backup on Close Dialog */}
      <CloseBackupModal />
    </div>
  );
};
