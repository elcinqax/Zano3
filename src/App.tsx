import React, { useState, useEffect } from 'react';
import { sqliteStorage } from './db/sqlite-storage';
import { Customer, Product, Sale, AppNotification, AppSettings, DatabaseDump, Expense, ExpenseItem } from './types';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { LockScreen } from './components/LockScreen';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { ProductsView } from './components/ProductsView';
import { CustomersView } from './components/CustomersView';
import { ExpensesView } from './components/ExpensesView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { BackupSecurityView } from './components/BackupSecurityView';
import { StockView } from './components/StockView';
import { ReceiptModal } from './components/ReceiptModal';
import { NotificationModal } from './components/NotificationModal';
import { InstallAppModal } from './components/InstallAppModal';
import { WifiOff, ShieldCheck, BatteryCharging, Signal } from 'lucide-react';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings>(sqliteStorage.getSettings());

  // Navigation & View mode - Starts on 1. Satış as requested
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme_preference') === 'dark' ||
        (!localStorage.getItem('theme_preference') && window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });

  // Security lock state
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Modals
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [openAddProductTrigger, setOpenAddProductTrigger] = useState<boolean>(false);
  const [openAddCustomerTrigger, setOpenAddCustomerTrigger] = useState<boolean>(false);

  // Live time for top status bar
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Initialize SQLite storage and subscribe to changes
  useEffect(() => {
    const loadState = () => {
      setCustomers(sqliteStorage.getCustomers());
      setProducts(sqliteStorage.getProducts());
      setSales(sqliteStorage.getSales());
      setExpenses(sqliteStorage.getExpenses());
      setExpenseItems(sqliteStorage.getExpenseItems());
      setNotifications(sqliteStorage.getNotifications());
      const s = sqliteStorage.getSettings();
      setSettings(s);
      if (s.isPinEnabled) {
        setIsLocked(true);
      }
    };

    sqliteStorage.init().then(() => {
      loadState();
      setIsInitialized(true);
    });

    const unsubscribe = sqliteStorage.subscribe(() => {
      setCustomers(sqliteStorage.getCustomers());
      setProducts(sqliteStorage.getProducts());
      setSales(sqliteStorage.getSales());
      setExpenses(sqliteStorage.getExpenses());
      setExpenseItems(sqliteStorage.getExpenseItems());
      setNotifications(sqliteStorage.getNotifications());
      setSettings(sqliteStorage.getSettings());
    });

    return () => unsubscribe();
  }, []);

  // Handle Dark mode class
  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        localStorage.setItem('theme_preference', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('theme_preference', 'light');
      }
    } catch (e) {
      console.warn('Theme preference storage error:', e);
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Cart count for BottomNav badge
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-400 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold tracking-tight">MobilSatış SQLite Yükleniyor...</p>
        <p className="text-xs text-slate-500 mt-1">Cihaz yerel veritabanı hazırlanıyor</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors ${isMobileFrame ? 'lg:py-8 lg:px-4 flex items-center justify-center' : ''}`}>
      {/* Lock Screen Overlay if PIN locked */}
      {isLocked && settings.isPinEnabled && (
        <LockScreen
          storedPin={settings.pinCode || '1234'}
          isBiometricEnabled={settings.isBiometricEnabled}
          storeName={settings.storeName}
          onUnlock={() => setIsLocked(false)}
        />
      )}

      {/* Main Container: Mobile Frame on Desktop OR Full Viewport */}
      <div
        className={`w-full transition-all duration-300 ${
          isMobileFrame
            ? 'lg:max-w-[420px] lg:h-[860px] lg:rounded-[44px] lg:border-[8px] lg:border-slate-800 lg:shadow-2xl lg:overflow-hidden lg:flex lg:flex-col lg:relative lg:ring-1 lg:ring-slate-700/50 bg-white dark:bg-slate-950'
            : 'min-h-screen flex flex-col'
        }`}
      >
        {/* Sticky Top Header Container (Prevents TopBar from overlapping status bar icons or clock) */}
        <div className="sticky top-0 z-30 w-full shrink-0">
          {/* Android Simulated Status Bar (Visible ONLY in Desktop Mobile Frame preview) */}
          {isMobileFrame && (
            <div className="hidden lg:flex h-7 bg-slate-900 text-slate-200 px-6 items-center justify-between text-[11px] font-semibold border-b border-slate-800 shrink-0 select-none">
              <span>{currentTime}</span>
              {/* Camera cutout */}
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700" />
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Signal className="w-3.5 h-3.5" />
                <span title="Offline SQLite Modu" className="flex items-center">
                  <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          )}

          {/* Top Bar */}
          <TopBar
            storeName={settings.storeName}
            isDark={isDark}
            screenTopPadding={settings.screenTopPadding}
            onToggleTheme={toggleTheme}
            onLockApp={() => setIsLocked(true)}
            isPinEnabled={settings.isPinEnabled}
            notifications={notifications}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            isMobileFrame={isMobileFrame}
            onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Offline indicator banner */}
          <div className="bg-slate-900 dark:bg-emerald-950/40 text-emerald-400 px-4 py-1 text-[11px] font-medium flex items-center justify-between border-b border-emerald-500/20">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>SQLite Yerel Mod · İnternetsiz ve Güvenli</span>
            </div>
            <span className="hidden sm:inline text-slate-400">Veriler cihazınızda saklanır</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-7xl mx-auto w-full pb-24 sm:pb-8">
          {/* 1. Satış (POS) */}
          {activeTab === 'pos' && (
            <POSView
              products={products}
              customers={customers}
              settings={settings}
              sales={sales}
              onCompleteSale={(saleData) => {
                const created = sqliteStorage.createSale(saleData);
                setReceiptSale(created);
              }}
              onQuickAddCustomer={(custData) => {
                return sqliteStorage.addCustomer(custData);
              }}
              onOpenSalesHistory={() => setActiveTab('sales')}
              onSelectSaleForReceipt={setReceiptSale}
              onCancelSale={(saleId) => sqliteStorage.cancelSale(saleId)}
            />
          )}

          {/* 2. Müşteriler */}
          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              settings={settings}
              onAddCustomer={(c) => sqliteStorage.addCustomer(c)}
              onUpdateCustomer={(id, updates) => sqliteStorage.updateCustomer(id, updates)}
              onDeleteCustomer={(id) => sqliteStorage.deleteCustomer(id)}
              onAddPayment={(customerId, amount, paymentMethod, notes) =>
                sqliteStorage.addCustomerPayment(customerId, amount, paymentMethod, notes)
              }
              isOpenAddModalExternal={openAddCustomerTrigger}
              onCloseAddModalExternal={() => setOpenAddCustomerTrigger(false)}
            />
          )}

          {/* 3. Ürünler */}
          {activeTab === 'products' && (
            <ProductsView
              products={products}
              onAddProduct={(p) => sqliteStorage.addProduct(p)}
              onUpdateProduct={(id, updates) => sqliteStorage.updateProduct(id, updates)}
              onDeleteProduct={(id) => sqliteStorage.deleteProduct(id)}
              onAdjustStock={(id, delta) => sqliteStorage.adjustStock(id, delta)}
              isOpenAddModalExternal={openAddProductTrigger}
              onCloseAddModalExternal={() => setOpenAddProductTrigger(false)}
            />
          )}

          {/* 4. Stok */}
          {activeTab === 'stock' && (
            <StockView
              products={products}
              onAdjustStock={(id, delta) => sqliteStorage.adjustStock(id, delta)}
              onUpdateProduct={(id, updates) => sqliteStorage.updateProduct(id, updates)}
              onOpenAddProduct={() => {
                setActiveTab('products');
                setOpenAddProductTrigger(true);
              }}
            />
          )}

          {/* 5. Giderler */}
          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              expenseItems={expenseItems}
              settings={settings}
              onAddExpense={(exp) => sqliteStorage.addExpense(exp)}
              onUpdateExpense={(id, updates) => sqliteStorage.updateExpense(id, updates)}
              onDeleteExpense={(id) => sqliteStorage.deleteExpense(id)}
              onAddExpenseItem={(item) => sqliteStorage.addExpenseItem(item)}
              onUpdateExpenseItem={(id, updates) => sqliteStorage.updateExpenseItem(id, updates)}
              onDeleteExpenseItem={(id) => sqliteStorage.deleteExpenseItem(id)}
            />
          )}

          {/* 6. Raporlar */}
          {(activeTab === 'reports' || activeTab === 'dashboard') && (
            <DashboardView
              sales={sales}
              customers={customers}
              products={products}
              expenses={expenses}
              expenseItems={expenseItems}
              settings={settings}
              onNavigateTab={setActiveTab}
              onSelectSaleForReceipt={setReceiptSale}
              onOpenAddProduct={() => {
                setActiveTab('products');
                setOpenAddProductTrigger(true);
              }}
              onOpenAddCustomer={() => {
                setActiveTab('customers');
                setOpenAddCustomerTrigger(true);
              }}
            />
          )}

          {/* Additional detail views (Invoices & Backup/Settings) */}
          {activeTab === 'sales' && (
            <SalesHistoryView
              sales={sales}
              customers={customers}
              products={products}
              settings={settings}
              onSelectSaleForReceipt={setReceiptSale}
              onCancelSale={(saleId) => sqliteStorage.cancelSale(saleId)}
              onBackToPOS={() => setActiveTab('pos')}
            />
          )}

          {activeTab === 'settings' && (
            <BackupSecurityView
              settings={settings}
              sales={sales}
              customers={customers}
              products={products}
              onUpdateSettings={(updates) => sqliteStorage.updateSettings(updates)}
              onRestoreBackup={(dump) => sqliteStorage.importDump(dump)}
              onResetToSampleData={() => sqliteStorage.resetToSampleData()}
            />
          )}
        </main>

        {/* Mobile Thumb Navigation (Bottom Bar) */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cartItemCount={0}
        />

        {/* Modals */}
        {receiptSale && (
          <ReceiptModal
            sale={receiptSale}
            settings={settings}
            onClose={() => setReceiptSale(null)}
          />
        )}

        {isNotificationsOpen && (
          <NotificationModal
            notifications={notifications}
            onClose={() => setIsNotificationsOpen(false)}
            onMarkRead={(id) => sqliteStorage.markNotificationAsRead(id)}
            onMarkAllRead={() => sqliteStorage.markAllNotificationsAsRead()}
            onClearAll={() => sqliteStorage.clearAllNotifications()}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              setIsNotificationsOpen(false);
            }}
          />
        )}

        <InstallAppModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />
      </div>
    </div>
  );
}
