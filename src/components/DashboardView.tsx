import React, { useState, useMemo } from 'react';
import { createPdfDocument } from '../utils/pdf-utils';
import { shareOrDownloadBlob, downloadBlob, isMobileDevice, printPdfBlob } from '../utils/share-utils';
import { buildCustomerDailyPdf, type CustomerDailyMonth } from '../utils/customer-daily-pdf';
import { DailyPrintButton } from './DailyPrintButton';
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
  BarChart3,
  CreditCard,
  ReceiptText,
  Boxes,
  ClipboardList,
  UserRound,
  Banknote,
} from 'lucide-react';
import { Sale, Customer, Product, Expense, ExpenseItem, AppSettings, CustomerPayment, CustomerProductPurchaseSummary, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
import { getSaleReturns, formatQuantity } from '../utils/sale-returns';
import { PurchaseCalendar, PurchaseDayTotal } from './PurchaseCalendar';
import { LedgerCalendar, LedgerEvent } from './LedgerCalendar';
import {
  exportToExcel,
  exportSalesToCSV,
  exportCustomerPurchasesToExcel,
  exportCustomerPurchasesToCSV,
} from '../utils/export-utils';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  card: 'Kart',
  transfer: 'Havale / EFT',
  mixed: 'Karışık Ödeme',
  credit: 'Veresiye',
};

const TIME_RANGE_LABELS = {
  today: 'Bugün',
  '7days': 'Son 7 gün',
  month: 'Bu ay',
  year: 'Bu yıl',
  all: 'Tüm zamanlar',
};

const formatDateInput = (value: string) => value.split('-').reverse().join('.');

const getReportCustomerId = (sale: Pick<Sale, 'customerId' | 'customerName'>) => sale.customerId || `anon-${sale.customerName}`;

interface DashboardViewProps {
  sales: Sale[];
  payments: CustomerPayment[];
  customers: Customer[];
  products: Product[];
  expenses?: Expense[];
  expenseItems?: ExpenseItem[];
  settings: AppSettings;
  onNavigateTab?: (tab: string) => void;
  onSelectSaleForReceipt?: (sale: Sale) => void;
  onOpenAddProduct?: () => void;
  onOpenAddCustomer?: () => void;
  onResetAllReports?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  payments,
  customers,
  products,
  expenses = [],
  expenseItems = [],
  settings,
  onNavigateTab,
  onResetAllReports,
}) => {
  // Report View Selection (Sadece raporlar arasında geçiş)
  const [activeReportTab, setActiveSubReportTab] = useState<'customerProducts' | 'financialSummary' | 'topProducts' | 'expenseSummary'>('customerProducts');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

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
  const [expandedDailyMonths, setExpandedDailyMonths] = useState<Record<string, boolean>>({});
  const [dailyYearByCustomer, setDailyYearByCustomer] = useState<Record<string, number | null>>({});
  const [ledgerYear, setLedgerYear] = useState<number | null>(null);
  const [annualReportYear, setAnnualReportYear] = useState<number | null>(null);
  const [printingDailyKey, setPrintingDailyKey] = useState<string | null>(null);

  // Filter sales by selected time range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
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
    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
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
  const debtorCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);

  // Inventory value
  const inventoryCostValue = useMemo(
    () => products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0),
    [products]
  );

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return payments.filter((payment) => {
      const paymentDate = new Date(payment.createdAt);
      if (timeRange === 'today') return paymentDate >= startOfToday;
      if (timeRange === '7days') return paymentDate >= startOf7Days;
      if (timeRange === 'month') return paymentDate >= startOfMonth;
      if (timeRange === 'year') return paymentDate >= startOfYear;
      if (timeRange === 'custom') {
        if (customStartDate && paymentDate < new Date(`${customStartDate}T00:00:00`)) return false;
        if (customEndDate && paymentDate > new Date(`${customEndDate}T23:59:59.999`)) return false;
      }
      return true;
    });
  }, [payments, timeRange, customStartDate, customEndDate]);

  // =========================================================================
  // MAIN FEATURE: HANGİ MÜŞTERİ HANGİ ÜRÜNDEN NE KADAR ALMIŞ (Customer x Product Report)
  // =========================================================================
  const customerProductPurchases = useMemo(() => {
    // Map key: customerId_productId
    const map: Record<string, CustomerProductPurchaseSummary> = {};

    filteredSales.forEach((sale) => {
      const cId = getReportCustomerId(sale);
      const cName = sale.customerName || 'Genel Müşteri';
      const cPhone = sale.customerPhone;

      const entryFor = (productId: string, productName: string) => {
        const key = `${cId}___${productId}`;
        const prod = productById.get(productId);

        if (!map[key]) {
          map[key] = {
            customerId: cId,
            customerName: cName,
            customerPhone: cPhone,
            productId,
            productName,
            category: prod?.category || 'Genel',
            unit: prod?.unit || 'Adet',
            totalQuantity: 0,
            returnedQuantity: 0,
            totalSpent: 0,
            avgPrice: 0,
            totalProfit: 0,
            ordersCount: 0,
            lastPurchaseDate: sale.createdAt,
          };
        }
        if (new Date(sale.createdAt) > new Date(map[key].lastPurchaseDate)) {
          map[key].lastPurchaseDate = sale.createdAt;
        }
        return map[key];
      };

      sale.items.forEach((item) => {
        const entry = entryFor(item.productId, item.productName);
        entry.totalQuantity += item.quantity;
        entry.totalSpent += item.total;
        entry.totalProfit += (item.unitPrice - item.buyPrice) * item.quantity;
        entry.ordersCount += 1;
      });

      getSaleReturns(sale, products).forEach((returned) => {
        entryFor(returned.productId, returned.productName).returnedQuantity += returned.quantity;
      });
    });

    // Calculate average unit prices
    let list = Object.values(map).map((entry) => ({
      ...entry,
      avgPrice: entry.totalQuantity > 0 ? entry.totalSpent / entry.totalQuantity : 0,
    }));

    // Apply Customer Filter
if (selectedCustomerFilter !== 'all') {
  list = list.filter((item) => selectedCustomerFilter === 'general' ? item.customerId.startsWith('anon-') : item.customerId === selectedCustomerFilter || item.customerName === selectedCustomerFilter);
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
  }, [filteredSales, products, productById, selectedCustomerFilter, selectedProductFilter, customerProductSearch]);

  // Total summary of customer product report
  const annualMonthlyProductAverages = useMemo(() => {
    const year = annualReportYear;
    if (year === null) return null;
    type MonthProduct = { productName: string; unit: string; totalQuantity: number; average: number; returnedQuantity: number };
    const months = Array.from({ length: 12 }, (_, month) => ({ month, days: new Date(year, month + 1, 0).getDate(), returnedQuantity: 0, products: [] as MonthProduct[] }));
    const matchesProduct = (productId: string, productName: string) => selectedProductFilter === 'all' || productId === selectedProductFilter || productName === selectedProductFilter;
    sales.forEach((sale) => {
      if (sale.status === 'cancelled' || new Date(sale.createdAt).getFullYear() !== year) return;
      if (selectedCustomerFilter !== 'all' && (selectedCustomerFilter === 'general' ? sale.customerId : sale.customerId !== selectedCustomerFilter && sale.customerName !== selectedCustomerFilter)) return;
      const month = months[new Date(sale.createdAt).getMonth()];
      const productFor = (productId: string, productName: string) => {
        let product = month.products.find((entry) => entry.productName === productName);
        if (!product) {
          product = { productName, unit: productById.get(productId)?.unit || 'Adet', totalQuantity: 0, average: 0, returnedQuantity: 0 };
          month.products.push(product);
        }
        return product;
      };
      sale.items.forEach((item) => {
        if (!matchesProduct(item.productId, item.productName)) return;
        const product = productFor(item.productId, item.productName);
        product.totalQuantity += item.quantity;
        product.average = product.totalQuantity / month.days;
      });
      getSaleReturns(sale, products).forEach((returned) => {
        if (!matchesProduct(returned.productId, returned.productName)) return;
        productFor(returned.productId, returned.productName).returnedQuantity += returned.quantity;
        month.returnedQuantity += returned.quantity;
      });
    });
    return months;
  }, [sales, products, productById, annualReportYear, selectedCustomerFilter, selectedProductFilter]);

  const annualTotalsByUnit = useMemo(() => {
    const year = annualReportYear;
    if (year === null) return null;
    const sold = new Map<string, number>();
    const returned = new Map<string, number>();
    const matchesProduct = (productId: string, productName: string) => selectedProductFilter === 'all' || productId === selectedProductFilter || productName === selectedProductFilter;
    sales.forEach((sale) => {
      if (sale.status === 'cancelled' || new Date(sale.createdAt).getFullYear() !== year) return;
      if (selectedCustomerFilter !== 'all' && (selectedCustomerFilter === 'general' ? sale.customerId : sale.customerId !== selectedCustomerFilter && sale.customerName !== selectedCustomerFilter)) return;
      sale.items.forEach((item) => {
        if (!matchesProduct(item.productId, item.productName)) return;
        const unit = productById.get(item.productId)?.unit || 'Adet';
        sold.set(unit, (sold.get(unit) ?? 0) + item.quantity);
      });
      getSaleReturns(sale, products).forEach((item) => {
        if (!matchesProduct(item.productId, item.productName)) return;
        const unit = productById.get(item.productId)?.unit || item.unit;
        returned.set(unit, (returned.get(unit) ?? 0) + item.quantity);
      });
    });
    const byQuantity = (totals: Map<string, number>) => Array.from(totals, ([unit, quantity]) => ({ unit, quantity })).sort((a, b) => b.quantity - a.quantity);
    return { sold: byQuantity(sold), returned: byQuantity(returned) };
  }, [sales, products, productById, annualReportYear, selectedCustomerFilter, selectedProductFilter]);

  const availableReportYears = useMemo(() => {
    const years = new Set(sales.filter((sale) => sale.status !== 'cancelled').map((sale) => new Date(sale.createdAt).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [sales]);

  const customerProductReportSummary = useMemo(() => {
    const totalQuantity = customerProductPurchases.reduce((s, i) => s + i.totalQuantity, 0);
    const totalReturned = customerProductPurchases.reduce((s, i) => s + i.returnedQuantity, 0);
    const totalSpent = customerProductPurchases.reduce((s, i) => s + i.totalSpent, 0);
    const totalProfit = customerProductPurchases.reduce((s, i) => s + i.totalProfit, 0);
    const uniqueCustomers = new Set(customerProductPurchases.map((i) => i.customerName)).size;
    const uniqueProducts = new Set(customerProductPurchases.map((i) => i.productName)).size;
    return { totalQuantity, totalReturned, totalSpent, totalProfit, uniqueCustomers, uniqueProducts };
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
        totalReturned: number;
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
          totalReturned: 0,
          products: [],
        };
      }
      groups[id].totalSpent += item.totalSpent;
      groups[id].totalQuantity += item.totalQuantity;
      groups[id].totalReturned += item.returnedQuantity;
      groups[id].products.push(item);
    });

    return Object.values(groups).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customerProductPurchases]);

  // Days outside the report's date range (or in the future) are not counted as "no purchase" days.
  const calendarScope = useMemo(() => {
    const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const now = new Date();
    let startKey: string | null = null;
    let endKey = toKey(now);
    if (timeRange === 'today') {
      startKey = endKey;
    } else if (timeRange === '7days') {
      startKey = toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    } else if (timeRange === 'month') {
      startKey = toKey(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (timeRange === 'year') {
      startKey = toKey(new Date(now.getFullYear(), 0, 1));
    } else if (timeRange === 'custom') {
      startKey = customStartDate || null;
      if (customEndDate && customEndDate < endKey) endKey = customEndDate;
    }
    return { startKey, endKey };
  }, [timeRange, customStartDate, customEndDate]);

  const dailyMonthsByCustomer = useMemo(() => {
    type DayTotal = PurchaseDayTotal;
    const totals: Record<string, DayTotal[]> = {};
    const visibleRowKeys = new Set(customerProductPurchases.map((item) => `${item.customerId}___${item.productId}`));
    filteredSales.forEach((sale) => {
      const customerId = getReportCustomerId(sale);
      const isVisible = (productId: string) => visibleRowKeys.has(`${customerId}___${productId}`);
      const matchingItems = sale.items.filter((item) => isVisible(item.productId));
      const returned = getSaleReturns(sale, products).reduce((sum, item) => (isVisible(item.productId) ? sum + item.quantity : sum), 0);
      if (!matchingItems.length && returned === 0) return;
      const date = new Date(sale.createdAt);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const existing = totals[customerId]?.find((entry) => entry.date === dateKey);
      const quantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
      const amount = matchingItems.reduce((sum, item) => sum + item.total, 0);
      if (existing) {
        existing.quantity += quantity;
        existing.amount += amount;
        existing.orders += 1;
        existing.returned += returned;
      } else {
        totals[customerId] = [...(totals[customerId] || []), { date: dateKey, quantity, amount, orders: 1, returned }];
      }
    });
    const months: Record<string, { monthKey: string; quantity: number; amount: number; returned: number; days: DayTotal[] }[]> = {};
    Object.entries(totals).forEach(([customerId, entries]) => {
      entries.sort((a, b) => b.date.localeCompare(a.date));
      months[customerId] = [];
      entries.forEach((entry) => {
        const monthKey = entry.date.slice(0, 7);
        let month = months[customerId].find((item) => item.monthKey === monthKey);
        if (!month) {
          month = { monthKey, quantity: 0, amount: 0, returned: 0, days: [] };
          months[customerId].push(month);
        }
        month.quantity += entry.quantity;
        month.amount += entry.amount;
        month.returned += entry.returned;
        month.days.push(entry);
      });
    });
    return months;
  }, [filteredSales, products, customerProductPurchases]);

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
        totalReturned: number;
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
          totalReturned: 0,
          customers: [],
        };
      }
      groups[id].totalSpent += item.totalSpent;
      groups[id].totalQuantity += item.totalQuantity;
      groups[id].totalReturned += item.returnedQuantity;
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
    const productStats: Record<string, { name: string; quantity: number; returned: number; revenue: number; profit: number; unit: string }> = {};
    const statFor = (productId: string, name: string) => {
      if (!productStats[productId]) {
        const p = products.find((prod) => prod.id === productId);
        productStats[productId] = {
          name,
          quantity: 0,
          returned: 0,
          revenue: 0,
          profit: 0,
          unit: p?.unit || 'Adet',
        };
      }
      return productStats[productId];
    };
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        const stat = statFor(item.productId, item.productName);
        stat.quantity += item.quantity;
        stat.revenue += item.total;
        stat.profit += (item.unitPrice - item.buyPrice) * item.quantity;
      }
      for (const item of getSaleReturns(sale, products)) {
        statFor(item.productId, item.productName).returned += item.quantity;
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

  const reportEvents = useMemo(() => {
    const matchesSelectedCustomer = (customerId?: string) => selectedCustomerFilter === 'all' || (selectedCustomerFilter === 'general' ? !customerId : customerId === selectedCustomerFilter);
    const creditEvents = filteredSales
      .filter((sale) => matchesSelectedCustomer(sale.customerId) && (sale.customerBalanceDelta || 0) > 0)
      .map((sale) => ({ type: 'Veresiye' as const, date: sale.createdAt, customer: sale.customerName, detail: sale.invoiceNo, amount: sale.customerBalanceDelta || 0 }));
    const collectionEvents = filteredPayments
      .filter((payment) => matchesSelectedCustomer(payment.customerId))
      .map((payment) => ({ type: 'Tahsilat' as const, date: payment.createdAt, customer: payment.customerName, detail: PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod, amount: payment.amount }));
    return [...creditEvents, ...collectionEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales, filteredPayments, selectedCustomerFilter]);

  const ledgerMonths = useMemo(() => {
    const months: { monthKey: string; creditTotal: number; collectionTotal: number; events: LedgerEvent[] }[] = [];
    reportEvents.forEach((event) => {
      const date = new Date(event.date);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const monthKey = dateKey.slice(0, 7);
      let month = months.find((item) => item.monthKey === monthKey);
      if (!month) {
        month = { monthKey, creditTotal: 0, collectionTotal: 0, events: [] };
        months.push(month);
      }
      if (event.type === 'Veresiye') month.creditTotal += event.amount;
      else month.collectionTotal += event.amount;
      month.events.push({ ...event, dateKey });
    });
    return months;
  }, [reportEvents]);

  const ledgerYears = useMemo(
    () => Array.from(new Set(ledgerMonths.map((month) => Number(month.monthKey.slice(0, 4))))).sort((a, b) => b - a),
    [ledgerMonths],
  );
  const selectedLedgerYear = ledgerYear !== null && ledgerYears.includes(ledgerYear) ? ledgerYear : null;

  const rangeLabel = timeRange === 'custom'
    ? `${customStartDate ? formatDateInput(customStartDate) : 'Başlangıç'} - ${customEndDate ? formatDateInput(customEndDate) : 'Bugün'}`
    : TIME_RANGE_LABELS[timeRange];

  const getDailyPrintKey = (customerId: string, monthKey?: string): string =>
    monthKey ? `month:${customerId}:${monthKey}` : `year:${customerId}`;

  const handlePrintCustomerDaily = async (
    customer: { customerId: string; customerName: string; customerPhone?: string },
    year: number,
    months: CustomerDailyMonth[],
    monthKey?: string,
  ) => {
    if (printingDailyKey !== null) return;
    setPrintingDailyKey(getDailyPrintKey(customer.customerId, monthKey));
    try {
      const productName = selectedProductFilter === 'all' ? null : productById.get(selectedProductFilter)?.name;
      const blob = await buildCustomerDailyPdf({
        storeName: settings.storeName || 'Mobil Satış',
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        year,
        monthKey,
        months,
        filterLabel: [rangeLabel, productName ?? 'Tüm ürünler'].join(' · '),
        scopeStartKey: calendarScope.startKey,
        scopeEndKey: calendarScope.endKey,
        currency: settings.currency,
      });
      const periodLabel = monthKey
        ? new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(year, Number(monthKey.slice(5, 7)) - 1, 1))
        : String(year);
      const fileName = `${customer.customerName.replace(/[^a-z0-9ğüşöçıəİĞÜŞÖÇƏ]+/gi, '-').replace(/^-|-$/g, '') || 'musteri'}-${monthKey ?? year}-gunluk-dagilim.pdf`;

      if (isMobileDevice() || window.matchMedia('(max-width: 768px)').matches) {
        const outcome = await shareOrDownloadBlob(blob, fileName, {
          title: `${customer.customerName} - ${periodLabel} günlük dağılım`,
          text: 'PDF raporunu yazdırın veya bir uygulamayla paylaşın',
        });
        if (outcome === 'downloaded') {
          window.alert('Bu cihaz paylaşım menüsünü desteklemiyor, PDF indirildi. Dosyalar uygulamasından açıp yazdırabilirsiniz.');
        }
        return;
      }

      await printPdfBlob(blob).catch((error: unknown) => {
        console.error('PDF yazdırma penceresi açılamadı, indirmeye geçiliyor:', error);
        downloadBlob(blob, fileName);
      });
    } catch (error) {
      console.error('Müşteri günlük dağılım PDF raporu oluşturulamadı:', error);
      window.alert('PDF oluşturulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setPrintingDailyKey(null);
    }
  };

  // Print Report Handler
  const handlePrint = async () => {
    const hasNativeShare = Boolean((window as unknown as { AndroidShare?: unknown }).AndroidShare);
    if (!hasNativeShare && !window.matchMedia('(max-width: 768px)').matches) {
      window.print();
      return;
    }

    const doc = await createPdfDocument().catch((error: unknown) => {
      console.error('PDF font could not be loaded:', error);
      window.alert('PDF oluşturulamadı: yazı tipi dosyası yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      return null;
    });
    if (!doc) return;
    doc.setFont('DejaVuSans', 'normal');
    const addLine = (text: string, y: number, size = 10, bold = false) => {
      doc.setFont('DejaVuSans', 'normal');
      doc.setFontSize(size);
      doc.text(text, 14, y);
    };

    let y = 16;
    addLine('Müşteri ve Ürün Raporu', y, 16, true);
    y += 8;
    addLine(`Tarih: ${rangeLabel}`, y, 9);
    y += 8;
    addLine(`Toplam satış: ${formatCurrency(customerProductReportSummary.totalSpent, settings.currency)}`, y, 10, true);
    y += 6;
    addLine(`Toplam miktar: ${customerProductReportSummary.totalQuantity} adet`, y, 10);
    y += 6;
    addLine(`Toplam iade: ${formatQuantity(customerProductReportSummary.totalReturned)} adet`, y, 10);
    y += 10;

    const tableX = [14, 58, 116, 146, 196];
    const drawTableHeader = () => {
      doc.setFillColor(13, 148, 136);
      doc.rect(14, y - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Müşteri', tableX[0] + 2, y);
      doc.text('Ürün', tableX[1] + 2, y);
      doc.text('Miktar', tableX[2] + 2, y);
      doc.text('Toplam', tableX[3] + 2, y);
      doc.setTextColor(0, 0, 0);
      y += 7;
    };

    drawTableHeader();
    groupedByCustomer.forEach((group) => {
      group.products.forEach((product) => {
        const customerLines = doc.splitTextToSize(group.customerName, 40) as string[];
        const productLines = doc.splitTextToSize(product.productName, 52) as string[];
        const rowLines = Math.max(customerLines.length, productLines.length, 1);
        const rowHeight = Math.max(8, rowLines * 4 + 4);

        if (y + rowHeight > 282) {
          doc.addPage();
          y = 16;
          drawTableHeader();
        }

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(14, y - 5, 182, rowHeight);
        doc.setFontSize(7.5);
        customerLines.forEach((line, index) => doc.text(line, tableX[0] + 2, y + index * 4));
        productLines.forEach((line, index) => doc.text(line, tableX[1] + 2, y + index * 4));
        doc.text(`${product.totalQuantity}${product.returnedQuantity > 0 ? ` (İade ${formatQuantity(product.returnedQuantity)})` : ''}`, tableX[2] + 2, y);
        doc.text(formatCurrency(product.totalSpent, settings.currency), tableX[3] + 2, y);
        y += rowHeight;
      });
    });

    y += 5;
    doc.setFontSize(10);
    doc.setFont('DejaVuSans', 'normal');
    doc.text(`Genel toplam: ${formatCurrency(customerProductReportSummary.totalSpent, settings.currency)} / ${customerProductReportSummary.totalQuantity} adet / İade ${formatQuantity(customerProductReportSummary.totalReturned)} adet`, 14, y);

    if (reportEvents.length > 0) {
      y += 10;
      addLine('Veresiye ve tahsilat hareketleri', y, 11, true);
      y += 7;
      doc.setFillColor(71, 85, 105);
      doc.rect(14, y - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Tür', 16, y); doc.text('Tarih', 45, y); doc.text('Müşteri', 78, y); doc.text('Detay', 140, y); doc.text('Tutar', 176, y);
      doc.setTextColor(0, 0, 0);
      y += 7;
      reportEvents.forEach((event) => {
        if (y > 282) { doc.addPage(); y = 16; }
        doc.setFontSize(7.5);
        doc.text(event.type, 16, y);
        doc.text(formatDate(event.date), 45, y);
        doc.text(doc.splitTextToSize(event.customer, 58)[0], 78, y);
        doc.text(String(event.detail), 140, y);
        doc.text(formatCurrency(event.amount, settings.currency), 176, y);
        y += 6;
      });
    }

    const creditTotal = reportEvents
      .filter((event) => event.type === 'Veresiye')
      .reduce((total, event) => total + event.amount, 0);
    const collectionTotal = reportEvents
      .filter((event) => event.type === 'Tahsilat')
      .reduce((total, event) => total + event.amount, 0);
    const remainingDebt = Math.max(0, creditTotal - collectionTotal);

    if (y > 265) {
      doc.addPage();
      y = 18;
    } else {
      y += 10;
    }
    addLine('Rapor toplamları', y, 11, true);
    y += 7;
    addLine(`Toplam satış tutarı: ${formatCurrency(customerProductReportSummary.totalSpent, settings.currency)}`, y, 9);
    y += 5;
    addLine(`Toplam veresiye: ${formatCurrency(creditTotal, settings.currency)}`, y, 9);
    y += 5;
    addLine(`Toplam tahsilat: -${formatCurrency(collectionTotal, settings.currency)}`, y, 9);
    y += 7;
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(14, y - 5, 182, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(10);
    doc.text(`Kalan borç: ${formatCurrency(remainingDebt, settings.currency)}`, 18, y + 3);
    doc.setTextColor(0, 0, 0);

    const filename = `rapor-${new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      const outcome = await shareOrDownloadBlob(doc.output('blob'), filename, {
        title: 'Müşteri ve Ürün Raporu',
      });
      if (outcome === 'downloaded') {
        window.alert('Bu cihaz paylaşım menüsünü desteklemiyor, PDF indirildi. Dosyalar uygulamasından açabilirsiniz.');
      }
    } catch (error) {
      console.error('PDF paylaşımı başarısız oldu, yazdırmaya geçiliyor:', error);
      window.print();
    }
  };

  const reportCatalog = [
    { id: 'customerProducts', title: 'Müşteri & ürün', description: 'Kim, hangi üründen ne kadar aldı?', icon: Users, accent: 'teal', action: () => setActiveSubReportTab('customerProducts') },
    { id: 'topProducts', title: 'Ürün performansı', description: 'En çok satan ve en kârlı ürünler', icon: Package, accent: 'blue', action: () => setActiveSubReportTab('topProducts') },
    { id: 'financialSummary', title: 'Gelir & kâr', description: 'Ciro, maliyet ve net kâr özeti', icon: BarChart3, accent: 'emerald', action: () => setActiveSubReportTab('financialSummary') },
    { id: 'payment', title: 'Ödeme dağılımı', description: 'Nakit, kart ve veresiye analizi', icon: CreditCard, accent: 'violet', action: () => setActiveSubReportTab('financialSummary') },
    { id: 'expenseSummary', title: 'Gider analizi', description: 'Gider kalemleri ve dönem karşılaştırması', icon: ReceiptText, accent: 'amber', action: () => setActiveSubReportTab('financialSummary') },
    { id: 'receivables', title: 'Açık hesaplar', description: 'Bekleyen alacaklar ve borçlu müşteriler', icon: Banknote, accent: 'rose', action: () => onNavigateTab?.('customers') },
    { id: 'salesHistory', title: 'Satış hareketleri', description: 'Tüm satışları tarih ve müşteri bazında incele', icon: ClipboardList, accent: 'indigo', action: () => onNavigateTab?.('sales') },
    { id: 'inventory', title: 'Stok durumu', description: 'Mevcut stok ve kritik ürünler', icon: Boxes, accent: 'cyan', action: () => onNavigateTab?.('stock') },
    { id: 'customerAnalysis', title: 'Müşteri analizi', description: 'Müşteri alışveriş ve sadakat görünümü', icon: UserRound, accent: 'pink', action: () => setActiveSubReportTab('customerProducts') },
    { id: 'salesOverview', title: 'Satış özeti', description: 'Dönemsel satış adedi ve toplam ciro', icon: TrendingUp, accent: 'lime', action: () => setActiveSubReportTab('financialSummary') },
  ] as const;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* REPORT TAB 1: MÜŞTERİ & ÜRÜN SATIN ALMA RAPORU (Hangi müşteri hangi üründen ne kadar almış) */}
      {activeReportTab === 'customerProducts' && (
        <div className="report-print-content space-y-4">
          <div className="print-only mb-4 border-b border-slate-300 pb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Müşteri raporu</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">{selectedCustomerFilter === 'all' ? 'Tüm müşteriler' : (customers.find((customer) => customer.id === selectedCustomerFilter)?.name || selectedCustomerFilter)}</h1>
          </div>

          {/* Controls: Search, Customer Filter, Product Filter, Grouping Mode */}
          <div className="hidden print-hide p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
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

          </div>

          <section className="mb-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Yıllık müşteri ürün ortalaması</h2>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Seçili müşterinin ay içinde aldığı ürünlerin günlük ortalamasını gösterir.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Yıl</span>
                  <select value={annualReportYear ?? ''} onChange={(event) => setAnnualReportYear(event.target.value === '' ? null : Number(event.target.value))} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 dark:border-emerald-900 dark:bg-slate-900 dark:text-slate-100">
                    <option value="">-</option>
                    {availableReportYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
                {annualTotalsByUnit !== null && (
                  <p aria-live="polite" className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black tabular-nums text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Yıl toplamı</span>
                    {annualTotalsByUnit.sold.length === 0 ? <span>0</span> : annualTotalsByUnit.sold.map((total) => <span key={total.unit}>{formatQuantity(total.quantity)} {total.unit}</span>)}
                    <span className="text-amber-700 dark:text-amber-300">İade {annualTotalsByUnit.returned.length === 0 ? '0' : annualTotalsByUnit.returned.map((total) => `${formatQuantity(total.quantity)} ${total.unit}`).join(', ')}</span>
                  </p>
                )}
              </div>
            </div>
            {annualMonthlyProductAverages === null && (
              <p className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-white/70 px-3 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-emerald-900/60 dark:bg-slate-900/60 dark:text-slate-400">Ayları görmek için bir yıl seçin.</p>
            )}
            <div className="mt-3 space-y-2">
              {annualReportYear !== null && annualMonthlyProductAverages?.map((month) => {
                const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(new Date(annualReportYear, month.month, 1));
                return (
                  <details key={month.month} open={month.products.length > 0} className="overflow-hidden rounded-xl border border-emerald-100 bg-white/80 dark:border-emerald-900/50 dark:bg-slate-900/70">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-black capitalize text-slate-800 dark:text-slate-100">
                      <span>{monthName}</span>
                      <span className="flex items-center gap-2 text-[10px] font-semibold normal-case text-slate-400">
                        {month.returnedQuantity > 0 && <span className="font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(month.returnedQuantity)}</span>}
                        <span>{month.products.length} ürün</span>
                      </span>
                    </summary>
                    <div className="border-t border-emerald-100/70 px-3 py-2 dark:border-emerald-900/40">
                      {month.products.length === 0 ? <p className="py-1 text-[11px] text-slate-400">Bu ay ürün satışı bulunamadı.</p> : <div className="space-y-1.5">{[...month.products].sort((a, b) => b.average - a.average).map((product) => <div key={product.productName} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs dark:bg-slate-950"><span className="min-w-0 truncate font-bold text-slate-700 dark:text-slate-300">{product.productName}</span><span className="flex shrink-0 items-center gap-2 tabular-nums">{product.returnedQuantity > 0 && <span className="font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(product.returnedQuantity)}</span>}<span className="font-black text-emerald-700 dark:text-emerald-300">{product.average.toFixed(2)} {product.unit}/gün</span></span></div>)}</div>}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          {/* REPORT VIEW 1: GROUPED BY CUSTOMER (Müşteri ve Aldığı Ürünler) */}
          {groupingMode === 'customer' && (
            <div className="space-y-3">
              {groupedByCustomer.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
                  Bu filtrelerle eşleşen müşteri satın alma kaydı bulunamadı.
                </div>
              ) : (
                groupedByCustomer.map((group) => {
                  const isExpanded = expandedCustomerIds[group.customerId] === true;
                  const dailyMonths = dailyMonthsByCustomer[group.customerId] || [];
                  const dailyYears = Array.from(new Set(dailyMonths.map((month) => Number(month.monthKey.slice(0, 4))))).sort((a, b) => b - a);
                  const storedDailyYear = dailyYearByCustomer[group.customerId] ?? null;
                  const selectedDailyYear = storedDailyYear !== null && dailyYears.includes(storedDailyYear) ? storedDailyYear : null;
                  const selectedDailyYearMonths = selectedDailyYear === null ? null : dailyMonths.filter((month) => Number(month.monthKey.slice(0, 4)) === selectedDailyYear);
                  const selectedDailyYearTotal = selectedDailyYearMonths === null ? null : selectedDailyYearMonths.reduce((sum, month) => sum + month.quantity, 0);
                  const selectedDailyYearReturned = selectedDailyYearMonths === null ? 0 : selectedDailyYearMonths.reduce((sum, month) => sum + month.returned, 0);
                  return (
                    <div
                      key={group.customerId}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      {/* Customer Card Header */}
                      <button
                        type="button"
                        onClick={() => toggleCustomerAccordion(group.customerId)}
                        aria-expanded={isExpanded}
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
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {group.products.length} farklı ürün aldı
                              </span>
                              <span>·</span>
                              <span>Toplam {group.totalQuantity} adet</span>
                              {group.totalReturned > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(group.totalReturned)} adet</span>
                                </>
                              )}
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

                      {/* Products purchased by this customer. Collapsed sections stay in the DOM so desktop window.print() still prints every customer. */}
                        <div className={`${isExpanded ? '' : 'hidden print:block '}px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800`}>
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
                                      {p.returnedQuantity > 0 && (
                                        <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(p.returnedQuantity)}</span>
                                      )}
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
                          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-3 dark:border-teal-900/60 dark:bg-teal-950/20">
                            <div className="mb-2 flex flex-col gap-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-col">
                                  <span className="text-xs font-black text-teal-900 dark:text-teal-200">Günlük dağılım</span>
                                  <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">Filtrelenmiş satışlar</span>
                                </div>
                                {dailyYears.length > 0 && (
                                  <label className="print:hidden flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <span>Yıl</span>
                                    <select
                                      value={selectedDailyYear ?? ''}
                                      onChange={(event) => setDailyYearByCustomer((prev) => ({ ...prev, [group.customerId]: event.target.value === '' ? null : Number(event.target.value) }))}
                                      className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 dark:border-teal-900 dark:bg-slate-900 dark:text-slate-100"
                                    >
                                      <option value="">-</option>
                                      {dailyYears.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                  </label>
                                )}
                              </div>
                              {selectedDailyYear !== null && selectedDailyYearMonths !== null && selectedDailyYearTotal !== null && (
                                <div className="print:hidden flex items-center justify-between gap-2">
                                  <p aria-live="polite" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-black tabular-nums text-teal-700 dark:border-teal-900 dark:bg-slate-900 dark:text-teal-300">
                                    <span className="font-bold text-slate-500 dark:text-slate-400">Yıl toplamı</span>
                                    <span>{formatQuantity(selectedDailyYearTotal)} adet</span>
                                    <span className="text-amber-700 dark:text-amber-300">İade {formatQuantity(selectedDailyYearReturned)} adet</span>
                                  </p>
                                  <DailyPrintButton
                                    label={`${group.customerName} ${selectedDailyYear} yılı günlük dağılımını yazdır veya PDF olarak paylaş`}
                                    isBusy={printingDailyKey === getDailyPrintKey(group.customerId)}
                                    disabled={printingDailyKey !== null}
                                    onClick={() => handlePrintCustomerDaily(group, selectedDailyYear, selectedDailyYearMonths)}
                                  />
                                </div>
                              )}
                            </div>
                            {dailyYears.length > 0 && selectedDailyYear === null && (
                              <p className="print:hidden rounded-xl border border-dashed border-teal-200 bg-white/70 px-3 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-teal-900/60 dark:bg-slate-900/60 dark:text-slate-400">Ayları görmek için bir yıl seçin.</p>
                            )}
                            <div className="flex flex-col gap-1.5">
                              {dailyMonths.map((month) => {
                                const monthId = `${group.customerId}-${month.monthKey}`;
                                const isMonthOpen = expandedDailyMonths[monthId] === true;
                                const [monthYear, monthNumber] = month.monthKey.split('-').map(Number);
                                const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(monthYear, monthNumber - 1, 1));
                                return (
                                  <div key={month.monthKey} className={`${monthYear === selectedDailyYear ? '' : 'hidden print:block '}overflow-hidden rounded-xl bg-white/80 dark:bg-slate-900/70`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2 p-2">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedDailyMonths((prev) => ({ ...prev, [monthId]: !prev[monthId] }))}
                                        aria-expanded={isMonthOpen}
                                        className="flex min-h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-left text-white shadow-sm transition-colors hover:bg-teal-800 active:bg-teal-900"
                                      >
                                        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                                        <span className="text-xs font-black capitalize">{monthLabel}</span>
                                        {isMonthOpen ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
                                      </button>
                                      {isMonthOpen && (
                                        <DailyPrintButton
                                          label={`${group.customerName} ${monthLabel} günlük dağılımını yazdır veya PDF olarak paylaş`}
                                          isBusy={printingDailyKey === getDailyPrintKey(group.customerId, month.monthKey)}
                                          disabled={printingDailyKey !== null}
                                          onClick={() => handlePrintCustomerDaily(group, monthYear, [month], month.monthKey)}
                                          className="sm:order-last"
                                        />
                                      )}
                                      <span className={`${isMonthOpen ? 'basis-full justify-end sm:ml-auto sm:basis-auto ' : ''}flex shrink-0 items-center gap-2 pr-1 text-xs font-black tabular-nums text-slate-900 dark:text-slate-100`}>
                                        <span>{month.quantity} adet</span>
                                        {month.returned > 0 && <span className="text-amber-700 dark:text-amber-300">İade {formatQuantity(month.returned)}</span>}
                                        <span className="text-teal-700 dark:text-teal-300">{formatCurrency(month.amount, settings.currency)}</span>
                                      </span>
                                    </div>
                                    <div className={`${isMonthOpen ? '' : 'hidden print:block '}border-t border-teal-100 p-2 dark:border-teal-900/40`}>
                                      <PurchaseCalendar
                                        monthKey={month.monthKey}
                                        days={month.days}
                                        scopeStartKey={calendarScope.startKey}
                                        scopeEndKey={calendarScope.endKey}
                                        currency={settings.currency}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                              {dailyMonths.length === 0 && <span className="text-[11px] text-slate-500">Günlük satış bulunamadı.</span>}
                            </div>
                          </div>
                        </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {reportEvents.length > 0 && (
            <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="min-w-0 text-sm font-black text-slate-800 dark:text-slate-100">Veresiye ve tahsilat günleri</h3>
                <label className="print:hidden flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Yıl</span>
                  <select
                    value={selectedLedgerYear ?? ''}
                    onChange={(event) => setLedgerYear(event.target.value === '' ? null : Number(event.target.value))}
                    className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 dark:border-teal-900 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">-</option>
                    {ledgerYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
              </div>
              {selectedLedgerYear === null && (
                <p className="print:hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">Ayları görmek için bir yıl seçin.</p>
              )}
              <div className="flex flex-col gap-1.5">
                {ledgerMonths.map((month) => {
                  const monthId = `ledger-${month.monthKey}`;
                  const isMonthOpen = expandedDailyMonths[monthId] === true;
                  const [monthYear, monthNumber] = month.monthKey.split('-').map(Number);
                  const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(monthYear, monthNumber - 1, 1));
                  return (
                    <div key={month.monthKey} className={`${monthYear === selectedLedgerYear ? '' : 'hidden print:block '}overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950/60`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setExpandedDailyMonths((prev) => ({ ...prev, [monthId]: !prev[monthId] }))}
                          aria-expanded={isMonthOpen}
                          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-left text-white shadow-sm transition-colors hover:bg-teal-800 active:bg-teal-900"
                        >
                          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="text-xs font-black capitalize">{monthLabel}</span>
                          {isMonthOpen ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        </button>
                        <span className="flex shrink-0 flex-col items-end gap-0.5 pr-1 text-[11px] font-black tabular-nums">
                          <span className="text-amber-700 dark:text-amber-300">Veresiye {formatCurrency(month.creditTotal, settings.currency)}</span>
                          <span className="text-emerald-700 dark:text-emerald-300">Tahsilat {formatCurrency(month.collectionTotal, settings.currency)}</span>
                        </span>
                      </div>
                      <div className={`${isMonthOpen ? '' : 'hidden print:block '}border-t border-slate-200/80 p-2 dark:border-slate-800`}>
                        <LedgerCalendar monthKey={month.monthKey} events={month.events} currency={settings.currency} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Summary Banner for Customer Purchases */}
          <div className="print-hide grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"><span className="text-xs font-semibold text-slate-500">Raporlanan Satış Tutarı</span><div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{formatCurrency(customerProductReportSummary.totalSpent, settings.currency)}</div><span className="text-[11px] text-slate-400 mt-0.5 block">Toplam Harcama / Ciro</span></div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"><span className="text-xs font-semibold text-slate-500">Satılan Toplam Miktar</span><div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{customerProductReportSummary.totalQuantity} Adet/Birim</div><span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-0.5 block tabular-nums">İade: {formatQuantity(customerProductReportSummary.totalReturned)} adet</span></div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"><span className="text-xs font-semibold text-slate-500">Alışveriş Yapan Müşteri</span><div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">{customerProductReportSummary.uniqueCustomers} Müşteri</div><span className="text-[11px] text-slate-400 mt-0.5 block">Farklı müşteri kaydı</span></div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"><span className="text-xs font-semibold text-slate-500">Satın Alınan Ürün Çeşidi</span><div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">{customerProductReportSummary.uniqueProducts} Çeşit Ürün</div><span className="text-[11px] text-slate-400 mt-0.5 block">Hareket gören ürünler</span></div>
          </div>

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
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {group.customers.length} farklı müşteri satın aldı
                              </span>
                              <span>·</span>
                              <span>Toplam {group.totalQuantity} {group.unit} satıldı</span>
                              {group.totalReturned > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(group.totalReturned)} {group.unit}</span>
                                </>
                              )}
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
                                      {c.returnedQuantity > 0 && (
                                        <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(c.returnedQuantity)}</span>
                                      )}
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
                            {r.returnedQuantity > 0 && (
                              <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-300">İade {formatQuantity(r.returnedQuantity)}</span>
                            )}
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div>
                    <span className="text-slate-500 font-semibold mr-1">Toplam Satılan:</span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">
                      {customerProductReportSummary.totalQuantity} Adet/Birim
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold mr-1">Toplam İade:</span>
                    <span className="font-black text-amber-700 dark:text-amber-300 tabular-nums">
                      {formatQuantity(customerProductReportSummary.totalReturned)} Adet/Birim
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

      {/* REPORT TAB 2: FİNANSAL GELİR-GİDER ÖZETİ (Ciro, Maliyet, Giderler, Net Kâr) */}
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

      {/* REPORT TAB 3: EN ÇOK SATAN ÜRÜNLER RAPORU */}
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
                      {prod.returned > 0 && (
                        <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">İade: {formatQuantity(prod.returned)} {prod.unit}</span>
                      )}
                      <span>%{((prod.revenue / (totalRevenue || 1)) * 100).toFixed(1)} pay</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pure Report Header (below the report content) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Raporlar & Analizler</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Mü������teri satın alma raporları, ürün satış dağılımları ve finansal özet
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

      {/* Report center */}
      <section aria-labelledby="report-center-title" className="rounded-3xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 sm:p-4">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Rapor merkezi</p>
            <h2 id="report-center-title" className="mt-1 text-base font-black tracking-tight text-slate-900 dark:text-slate-100">İhtiyacın olan raporu seç</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{reportCatalog.length} rapor</span>
        </div>
        {(() => {
          const selectedReport = reportCatalog.find((report) => report.id === expandedReportId) || reportCatalog.find((report) => report.id === activeReportTab) || reportCatalog[0];
          const SelectedIcon = selectedReport.icon;
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/80">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white"><SelectedIcon className="size-4" /></span>
                <select
                  aria-label="Rapor seç"
                  value={selectedReport.id}
                  onChange={(event) => {
                    const nextReport = reportCatalog.find((report) => report.id === event.target.value);
                    if (nextReport) {
                      setExpandedReportId(nextReport.id);
                      nextReport.action();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-black text-slate-800 outline-none dark:text-slate-100"
                >
                  {reportCatalog.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
                </select>
                <span className="shrink-0 px-2 text-[10px] font-bold text-slate-400">{reportCatalog.length} seçenek</span>
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3 dark:border-teal-900 dark:bg-teal-950/20">
                <p className="mb-3 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{selectedReport.description}</p>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <label className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-bold text-slate-500">Müşteri:</span>
                    <select value={selectedCustomerFilter} onChange={(e) => setSelectedCustomerFilter(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                      <option value="all">Tüm Müşteriler ({customers.length})</option>
                      <option value="general">Genel Müşteri</option>
                      {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </select>
                  </label>
                  <label className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-bold text-slate-500">Ürün:</span>
                    <select value={selectedProductFilter} onChange={(e) => setSelectedProductFilter(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                      <option value="all">Tüm Ürünler ({products.length})</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                  </label>
                  <label className="flex min-w-0 items-center gap-2 sm:col-span-2">
                    <span className="shrink-0 font-bold text-slate-500">Tarih:</span>
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as typeof timeRange)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                      <option value="today">Bugün</option><option value="7days">Son 7 Gün</option><option value="month">Bu Ay</option><option value="year">Bu Yıl</option><option value="all">Tüm Zamanlar</option><option value="custom">Özel Tarih Aralığı</option>
                    </select>
                    <button type="button" onClick={handlePrint} className="shrink-0 rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white" title="Filtrelenmiş rapor fişini PDF olarak paylaş"><Download className="inline-block size-3.5" /> PDF paylaş</button>
                  </label>
                </div>
                {timeRange === 'custom' && (
                  <div className="mt-2 grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500">Aralık:</span>
                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2 font-semibold dark:border-slate-700 dark:bg-slate-950" />
                    <span className="text-slate-400">-</span>
                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2 font-semibold dark:border-slate-700 dark:bg-slate-950" />
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Report detail navigation and time filters */}
      <div className="hidden p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
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
    </div>
  );
};
