import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Search,
  Filter,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Printer,
  ShoppingBag,
  ArrowUpDown,
  Tag,
  Receipt,
  X,
} from 'lucide-react';
import { Sale, Customer, Product, Expense, ExpenseItem, AppSettings, CustomerProductPurchaseSummary } from '../types';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
import {
  exportToExcel,
  exportSalesToCSV,
  exportCustomerPurchasesToExcel,
  exportCustomerPurchasesToCSV,
} from '../utils/export-utils';

interface DashboardViewProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  expenses?: Expense[];
  expenseItems?: ExpenseItem[];
  settings: AppSettings;
  onNavigateTab?: (tab: string) => void;
  onSelectSaleForReceipt?: (sale: Sale) => void;
  onOpenAddProduct?: () => void;
  onOpenAddCustomer?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  customers,
  products,
  expenses = [],
  expenseItems = [],
  settings,
}) => {
  // Report View Selection (Sadece raporlar arasında geçiş)
  const [activeReportTab, setActiveSubReportTab] = useState<'customerProducts' | 'financialSummary' | 'topProducts' | 'expenseSummary'>('customerProducts');

  // Time Range Filter
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Customer & Product Report Specific Filters
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [customerProductSearch, setCustomerProductSearch] = useState<string>('');
  const [groupingMode, setGroupingMode] = useState<'customer' | 'product' | 'flat'>('customer');
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Filter sales by selected time range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOf7Days = new Date(now);
    startOf7Days.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    return sales.filter((s) => {
      if (s.status === 'cancelled') return false;
      const saleDate = new Date(s.createdAt);

      if (timeRange === 'today') {
        if (saleDate < startOfToday || saleDate > endOfToday) return false;
      } else if (timeRange === '7days') {
        if (saleDate < startOf7Days) return false;
      } else if (timeRange === 'month') {
        if (saleDate < startOfMonth) return false;
      } else if (timeRange === 'year') {
        if (saleDate < startOfYear) return false;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const [sy, sm, sd] = customStartDate.split('-').map(Number);
          const cStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          if (saleDate < cStart) return false;
        }
        if (customEndDate) {
          const [ey, em, ed] = customEndDate.split('-').map(Number);
          const cEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          if (saleDate > cEnd) return false;
        }
      }
      return true;
    });
  }, [sales, timeRange, customStartDate, customEndDate]);

  // Filter expenses by time range for financial comparison
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOf7Days = new Date(now);
    startOf7Days.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    return expenses.filter((e) => {
      const expDate = new Date(e.date || e.createdAt);
      if (timeRange === 'today') {
        if (expDate < startOfToday || expDate > endOfToday) return false;
      } else if (timeRange === '7days') {
        if (expDate < startOf7Days) return false;
      } else if (timeRange === 'month') {
        if (expDate < startOfMonth) return false;
      } else if (timeRange === 'year') {
        if (expDate < startOfYear) return false;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const [sy, sm, sd] = customStartDate.split('-').map(Number);
          if (expDate < new Date(sy, sm - 1, sd, 0, 0, 0, 0)) return false;
        }
        if (customEndDate) {
          const [ey, em, ed] = customEndDate.split('-').map(Number);
          if (expDate > new Date(ey, em - 1, ed, 23, 59, 59, 999)) return false;
        }
      }
      return true;
    });
  }, [expenses, timeRange, customStartDate, customEndDate]);

  // Aggregate financial metrics
  const totalRevenue = useMemo(() => filteredSales.reduce((acc, s) => acc + s.total, 0), [filteredSales]);
  const totalCost = useMemo(() => filteredSales.reduce((acc, s) => acc + s.costTotal, 0), [filteredSales]);
  const totalGrossProfit = useMemo(() => filteredSales.reduce((acc, s) => acc + s.profit, 0), [filteredSales]);
  const totalExpensesAmount = useMemo(() => filteredExpenses.reduce((acc, e) => acc + e.amount, 0), [filteredExpenses]);
  const netNetProfit = totalGrossProfit - totalExpensesAmount;

  // Receivables (Veresiye)
  const totalDebtReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0),
    [customers]
  );
  const debtorCount = customers.filter((c) => c.balance > 0).length;

  // Inventory value
  const inventoryCostValue = useMemo(
    () => products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0),
    [products]
  );

  // =========================================================================
  // MAIN FEATURE: HANGİ MÜŞTERİ HANGİ ÜRÜNDEN NE KADAR ALMIŞ (Customer x Product Report)
  // =========================================================================
  const customerProductPurchases = useMemo(() => {
    // Map key: customerId_productId
    const map: Record<string, CustomerProductPurchaseSummary> = {};

    filteredSales.forEach((sale) => {
      const cId = sale.customerId || 'anon-' + sale.customerName;
      const cName = sale.customerName || 'Genel Müşteri';
      const cPhone = sale.customerPhone;

      sale.items.forEach((item) => {
        const key = `${cId}___${item.productId}`;
        const prod = products.find((p) => p.id === item.productId);
        const unit = prod?.unit || 'Adet';
        const category = prod?.category || 'Genel';

        if (!map[key]) {
          map[key] = {
            customerId: cId,
            customerName: cName,
            customerPhone: cPhone,
            productId: item.productId,
            productName: item.productName,
            category,
            unit,
            totalQuantity: 0,
            totalSpent: 0,
            avgPrice: 0,
            totalProfit: 0,
            ordersCount: 0,
            lastPurchaseDate: sale.createdAt,
          };
        }

        map[key].totalQuantity += item.quantity;
        map[key].totalSpent += item.total;
        map[key].totalProfit += (item.unitPrice - item.buyPrice) * item.quantity;
        map[key].ordersCount += 1;
        if (new Date(sale.createdAt) > new Date(map[key].lastPurchaseDate)) {
          map[key].lastPurchaseDate = sale.createdAt;
        }
      });
    });

    // Calculate average unit prices
    let list = Object.values(map).map((entry) => ({
      ...entry,
      avgPrice: entry.totalQuantity > 0 ? entry.totalSpent / entry.totalQuantity : 0,
    }));

    // Apply Customer Filter
    if (selectedCustomerFilter !== 'all') {
      list = list.filter((item) => item.customerId === selectedCustomerFilter || item.customerName === selectedCustomerFilter);
    }

    // Apply Product Filter
    if (selectedProductFilter !== 'all') {
      list = list.filter((item) => item.productId === selectedProductFilter || item.productName === selectedProductFilter);
    }

    // Apply Text Search (Müşteri veya Ürün)
    if (customerProductSearch.trim()) {
      const q = customerProductSearch.toLowerCase();
      list = list.filter(
        (item) =>
          item.customerName.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          (item.customerPhone || '').toLowerCase().includes(q)
      );
    }

    // Sort by total spent descending
    return list.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredSales, products, selectedCustomerFilter, selectedProductFilter, customerProductSearch]);

  // Total summary of customer product report
  const customerProductReportSummary = useMemo(() => {
    const totalQuantity = customerProductPurchases.reduce((s, i) => s + i.totalQuantity, 0);
    const totalSpent = customerProductPurchases.reduce((s, i) => s + i.totalSpent, 0);
    const totalProfit = customerProductPurchases.reduce((s, i) => s + i.totalProfit, 0);
    const uniqueCustomers = new Set(customerProductPurchases.map((i) => i.customerName)).size;
    const uniqueProducts = new Set(customerProductPurchases.map((i) => i.productName)).size;
    return { totalQuantity, totalSpent, totalProfit, uniqueCustomers, uniqueProducts };
  }, [customerProductPurchases]);

  // Grouped by Customer data structure for accordion view
  const groupedByCustomer = useMemo(() => {
    const groups: Record<
      string,
      {
        customerId: string;
        customerName: string;
        customerPhone?: string;
        totalSpent: number;
        totalQuantity: number;
        products: CustomerProductPurchaseSummary[];
      }
    > = {};

    customerProductPurchases.forEach((item) => {
      const id = item.customerId;
      if (!groups[id]) {
        groups[id] = {
          customerId: id,
          customerName: item.customerName,
          customerPhone: item.customerPhone,
          totalSpent: 0,
          totalQuantity: 0,
          products: [],
        };
      }
      groups[id].totalSpent += item.totalSpent;
      groups[id].totalQuantity += item.totalQuantity;
      groups[id].products.push(item);
    });

    return Object.values(groups).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customerProductPurchases]);

  // Grouped by Product data structure
  const groupedByProduct = useMemo(() => {
    const groups: Record<
      string,
      {
        productId: string;
        productName: string;
        category: string;
        unit: string;
        totalSpent: number;
        totalQuantity: number;
        customers: CustomerProductPurchaseSummary[];
      }
    > = {};

    customerProductPurchases.forEach((item) => {
      const id = item.productId;
      if (!groups[id]) {
        groups[id] = {
          productId: id,
          productName: item.productName,
          category: item.category || 'Genel',
          unit: item.unit,
          totalSpent: 0,
          totalQuantity: 0,
          customers: [],
        };
      }
      groups[id].totalSpent += item.totalSpent;
      groups[id].totalQuantity += item.totalQuantity;
      groups[id].customers.push(item);
    });

    return Object.values(groups).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customerProductPurchases]);

  // Toggle Customer Accordion
  const toggleCustomerAccordion = (id: string) => {
    setExpandedCustomerIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle Product Accordion
  const toggleProductAccordion = (id: string) => {
    setExpandedProductIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Top Selling Products report
  const topProducts = useMemo(() => {
    const productStats: Record<string, { name: string; quantity: number; revenue: number; profit: number; unit: string }> = {};
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        if (!productStats[item.productId]) {
          const p = products.find((prod) => prod.id === item.productId);
          productStats[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
            unit: p?.unit || 'Adet',
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += item.total;
        productStats[item.productId].profit += (item.unitPrice - item.buyPrice) * item.quantity;
      }
    }
    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  const maxProductRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue), 1) : 1;

  // Payment Breakdown report
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = { cash: 0, mixed: 0, credit: 0, transfer: 0 };
    filteredSales.forEach((s) => {
      const key = s.paymentMethod === 'card' ? 'mixed' : s.paymentMethod;
      breakdown[key] = (breakdown[key] || 0) + s.total;
    });
    return breakdown;
  }, [filteredSales]);

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Pure Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Raporlar & Analizler</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Müşteri satın alma raporları, ürün satış dağılımları ve finansal özet
          </p>
        </div>

        {/* Global Export & Print Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Raporu Yazdır"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Yazdır</span>
          </button>

          <button
            type="button"
            onClick={() => exportCustomerPurchasesToExcel(customerProductPurchases, settings.storeName)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Müşteri-Ürün Satın Alma Raporunu Excel Olarak İndir"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx) İndir</span>
          </button>

          <button
            type="button"
            onClick={() => exportCustomerPurchasesToCSV(customerProductPurchases)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Pure Report Navigation Tabs (Sadece Raporlar Arasında Geçiş - Başka Menü Yok) */}
      <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubReportTab('customerProducts')}
            className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'customerProducts'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Müşteri & Ürün Satış Raporu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubReportTab('financialSummary')}
            className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'financialSummary'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Finansal Gelir-Gider Özeti</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubReportTab('topProducts')}
            className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'topProducts'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>En Çok Satan Ürünler</span>
          </button>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          {[
            { id: 'today', label: 'Bugün' },
            { id: '7days', label: 'Son 7 Gün' },
            { id: 'month', label: 'Bu Ay' },
            { id: 'year', label: 'Bu Yıl' },
            { id: 'all', label: 'Tüm Zamanlar' },
            { id: 'custom', label: 'Özel Tarih' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id as any)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                timeRange === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Filter Input */}
      {timeRange === 'custom' && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-600 dark:text-slate-400">Tarih Aralığı:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-semibold"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-semibold"
          />
        </div>
      )}

      {/* 3. REPORT TAB 1: MÜŞTERİ & ÜRÜN SATIN ALMA RAPORU (Hangi müşteri hangi üründen ne kadar almış) */}
      {activeReportTab === 'customerProducts' && (
        <div className="space-y-4">
          {/* Summary Banner for Customer Purchases */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Raporlanan Satış Tutarı</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {formatCurrency(customerProductReportSummary.totalSpent, settings.currency)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Toplam Harcama / Ciro</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Satılan Toplam Miktar</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                {customerProductReportSummary.totalQuantity} Adet/Birim
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Ürün teslimatı yapıldı</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Alışveriş Yapan Müşteri</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
                {customerProductReportSummary.uniqueCustomers} Müşteri
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Farklı müşteri kaydı</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Satın Alınan Ürün Çeşidi</span>
              <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
                {customerProductReportSummary.uniqueProducts} Çeşit Ürün
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Hareket gören ürünler</span>
            </div>
          </div>

          {/* Controls: Search, Customer Filter, Product Filter, Grouping Mode */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Grouping mode pills */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
                <button
                  type="button"
                  onClick={() => setGroupingMode('customer')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    groupingMode === 'customer'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  👤 Müşteri Bazında Grupla
                </button>
                <button
                  type="button"
                  onClick={() => setGroupingMode('product')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    groupingMode === 'product'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  📦 Ürün Bazında Grupla
                </button>
                <button
                  type="button"
                  onClick={() => setGroupingMode('flat')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    groupingMode === 'flat'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  📑 Detaylı Tablo
                </button>
              </div>

              {/* Live Search */}
              <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Müşteri veya ürün adı ara..."
                  value={customerProductSearch}
                  onChange={(e) => setCustomerProductSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {customerProductSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown Filters for specific Customer or specific Product */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 shrink-0">Müşteri Filtresi:</span>
                <select
                  value={selectedCustomerFilter}
                  onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Tüm Müşteriler ({customers.length})</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 shrink-0">Ürün Filtresi:</span>
                <select
                  value={selectedProductFilter}
                  onChange={(e) => setSelectedProductFilter(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Tüm Ürünler ({products.length})</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* REPORT VIEW 1: GROUPED BY CUSTOMER (Müşteri ve Aldığı Ürünler) */}
          {groupingMode === 'customer' && (
            <div className="space-y-3">
              {groupedByCustomer.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
                  Bu filtrelerle eşleşen müşteri satın alma kaydı bulunamadı.
                </div>
              ) : (
                groupedByCustomer.map((group) => {
                  const isExpanded = expandedCustomerIds[group.customerId] !== false; // expanded by default
                  return (
                    <div
                      key={group.customerId}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      {/* Customer Card Header */}
                      <button
                        type="button"
                        onClick={() => toggleCustomerAccordion(group.customerId)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                            {group.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{group.customerName}</span>
                              {group.customerPhone && (
                                <span className="text-xs font-normal text-slate-400">({group.customerPhone})</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {group.products.length} farklı ürün aldı
                              </span>
                              <span>·</span>
                              <span>Toplam {group.totalQuantity} adet</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block font-medium">Toplam Harcama</span>
                            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(group.totalSpent, settings.currency)}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </button>

                      {/* Products purchased by this customer */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                  <th className="py-2 text-left">Satın Alınan Ürün</th>
                                  <th className="py-2 text-right">Alınan Miktar</th>
                                  <th className="py-2 text-right">Ort. Fiyat</th>
                                  <th className="py-2 text-right font-black">Toplam Tutar</th>
                                  <th className="py-2 text-right">İşlem Sayısı</th>
                                  <th className="py-2 text-right">Son Satın Alma</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                                {group.products.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                      {p.productName}
                                    </td>
                                    <td className="py-2.5 text-right font-black text-slate-900 dark:text-white tabular-nums">
                                      {p.totalQuantity} {p.unit}
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500 tabular-nums">
                                      {formatCurrency(p.avgPrice, settings.currency)}
                                    </td>
                                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                                      {formatCurrency(p.totalSpent, settings.currency)}
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500 tabular-nums">
                                      {p.ordersCount} kez
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500 whitespace-nowrap">
                                      {formatDate(p.lastPurchaseDate)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* REPORT VIEW 2: GROUPED BY PRODUCT (Ürün ve Alan Müşteriler) */}
          {groupingMode === 'product' && (
            <div className="space-y-3">
              {groupedByProduct.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
                  Bu filtrelerle eşleşen ürün satış kaydı bulunamadı.
                </div>
              ) : (
                groupedByProduct.map((group) => {
                  const isExpanded = expandedProductIds[group.productId] !== false;
                  return (
                    <div
                      key={group.productId}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleProductAccordion(group.productId)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                              {group.productName}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {group.customers.length} farklı müşteri satın aldı
                              </span>
                              <span>·</span>
                              <span>Toplam {group.totalQuantity} {group.unit} satıldı</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block font-medium">Toplam Ürün Cirosu</span>
                            <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                              {formatCurrency(group.totalSpent, settings.currency)}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                  <th className="py-2 text-left">Satın Alan Müşteri</th>
                                  <th className="py-2 text-right">Aldığı Miktar</th>
                                  <th className="py-2 text-right">Ort. Fiyat</th>
                                  <th className="py-2 text-right font-black">Harcadığı Tutar</th>
                                  <th className="py-2 text-right">İşlem Sayısı</th>
                                  <th className="py-2 text-right">Son Alış Tarihi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                                {group.customers.map((c, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                      {c.customerName} {c.customerPhone ? `(${c.customerPhone})` : ''}
                                    </td>
                                    <td className="py-2.5 text-right font-black text-slate-900 dark:text-white tabular-nums">
                                      {c.totalQuantity} {c.unit}
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500 tabular-nums">
                                      {formatCurrency(c.avgPrice, settings.currency)}
                                    </td>
                                    <td className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums text-sm">
                                      {formatCurrency(c.totalSpent, settings.currency)}
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500 tabular-nums">
                                      {c.ordersCount} kez
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500 whitespace-nowrap">
                                      {formatDate(c.lastPurchaseDate)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* REPORT VIEW 3: FLAT MASTER TABLE (Tüm Müşteri - Ürün Satırları) */}
          {groupingMode === 'flat' && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Müşteri</th>
                      <th className="py-3 px-4">Satın Alınan Ürün</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Toplam Alınan Miktar</th>
                      <th className="py-3 px-4 text-right">Ort. Birim Fiyat</th>
                      <th className="py-3 px-4 text-right font-black">Toplam Harcama (Ciro)</th>
                      <th className="py-3 px-4 text-right">Toplam Kâr Katkısı</th>
                      <th className="py-3 px-4 text-right">İşlem Sayısı</th>
                      <th className="py-3 px-4 text-right">Son Satın Alma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customerProductPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          Kayıtlı müşteri ürün alışverişi bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      customerProductPurchases.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div>{r.customerName}</div>
                            {r.customerPhone && (
                              <div className="text-[11px] text-slate-400 font-normal">{r.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-black text-slate-800 dark:text-slate-200">
                            {r.productName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                              {r.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white tabular-nums">
                            {r.totalQuantity} {r.unit}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                            {formatCurrency(r.avgPrice, settings.currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm sm:text-base">
                            {formatCurrency(r.totalSpent, settings.currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            +{formatCurrency(r.totalProfit, settings.currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                            {r.ordersCount} sipariş
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                            {formatDateTime(r.lastPurchaseDate)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Totals */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-bold">
                <span className="text-slate-600 dark:text-slate-300">
                  Toplam {customerProductPurchases.length} Müşteri - Ürün Satır Kaydı
                </span>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500 font-semibold mr-1">Toplam Satılan:</span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">
                      {customerProductReportSummary.totalQuantity} Adet/Birim
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold mr-1">Toplam Tutar:</span>
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(customerProductReportSummary.totalSpent, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. REPORT TAB 2: FİNANSAL GELİR-GİDER ÖZETİ (Ciro, Maliyet, Giderler, Net Kâr) */}
      {activeReportTab === 'financialSummary' && (
        <div className="space-y-6">
          {/* Financial Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Ciro */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Toplam Satış Cirosu</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {formatCurrency(totalRevenue, settings.currency)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                {filteredSales.length} satış işleminden
              </span>
            </div>

            {/* Ürün Maliyeti */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Satılan Mal Maliyeti</span>
              <div className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 tabular-nums">
                {formatCurrency(totalCost, settings.currency)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                Alış fiyatları toplamı
              </span>
            </div>

            {/* İşletme Giderleri */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">İşletme Giderleri</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                {formatCurrency(totalExpensesAmount, settings.currency)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                Un, odun, elektrik, icarə vb. ({filteredExpenses.length} işlem)
              </span>
            </div>

            {/* Net Net Kâr (Ciro - Maliyet - Giderler) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-sm">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Gerçek Net Kâr
              </span>
              <div
                className={`text-xl sm:text-2xl font-black mt-1 tabular-nums ${
                  netNetProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netNetProfit, settings.currency)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block font-semibold">
                (Brüt Kâr: {formatCurrency(totalGrossProfit, settings.currency)} - Giderler)
              </span>
            </div>
          </div>

          {/* Payment Method Breakdown & Receivables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ödeme Yöntemi Tahsilat Raporu
                </h3>
                <p className="text-xs text-slate-500">Nakit, Banka ve Veresiye dağılımı</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Nakit Tahsilat', val: paymentBreakdown.cash, color: 'bg-emerald-500' },
                  { label: 'Karışık / Kart', val: paymentBreakdown.mixed, color: 'bg-indigo-500' },
                  { label: 'Veresiye (Borç Yazılan)', val: paymentBreakdown.credit, color: 'bg-amber-500' },
                  { label: 'Banka / Havale', val: paymentBreakdown.transfer, color: 'bg-purple-500' },
                ].map((item, idx) => {
                  const pct = totalRevenue > 0 ? (item.val / totalRevenue) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 tabular-nums">%{pct.toFixed(0)}</span>
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(item.val, settings.currency)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full ${item.color} rounded-full transition-all duration-300`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Fiili Tahsil Edilen Tutar:</span>
                <span className="font-black text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(totalRevenue - paymentBreakdown.credit, settings.currency)}
                </span>
              </div>
            </div>

            {/* Receivables & Balance Overview */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Açık Hesap (Veresiye) & Bakiye Raporu
                </h3>
                <p className="text-xs text-slate-500">Müşterilerden bekleyen toplam alacaklar</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                  Toplam Bekleyen Veresiye Alacağı
                </span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                  {formatCurrency(totalDebtReceivables, settings.currency)}
                </div>
                <span className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 block font-semibold">
                  Toplam {debtorCount} müşterinin açık hesap borcu bulunmaktadır.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Depodaki Toplam Stok Maliyet Değeri:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(inventoryCostValue, settings.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. REPORT TAB 3: EN ÇOK SATAN ÜRÜNLER RAPORU */}
      {activeReportTab === 'topProducts' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ürün Satış Performans Sıralaması
              </h2>
              <p className="text-xs text-slate-500">Ciro, satış adedi ve kâr katkısına göre sıralı</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {topProducts.length} Satılan Ürün
            </span>
          </div>

          {topProducts.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-400">
              Bu dönemde kayıtlı ürün satışı bulunmuyor.
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((prod, idx) => {
                const widthPct = (prod.revenue / maxProductRevenue) * 100;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-[11px]">
                          {idx + 1}
                        </span>
                        <span>{prod.name}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-semibold tabular-nums">
                          {prod.quantity} {prod.unit}
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(prod.revenue, settings.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200/70 dark:bg-slate-700/70 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Kâr Katkısı: +{formatCurrency(prod.profit, settings.currency)}</span>
                      <span>%{((prod.revenue / (totalRevenue || 1)) * 100).toFixed(1)} pay</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
