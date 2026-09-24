import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Package,
  Layers,
  CheckCircle2,
  ChevronDown,
  Building,
  CreditCard,
  DollarSign,
  Wallet,
  Clock,
  ArrowUpDown,
  Tag,
  X,
} from 'lucide-react';
import { Expense, ExpenseItem, AppSettings, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
import { exportExpensesToExcel, exportExpensesToCSV } from '../utils/export-utils';

interface ExpensesViewProps {
  expenses: Expense[];
  expenseItems: ExpenseItem[];
  settings: AppSettings;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
  onAddExpenseItem: (item: Omit<ExpenseItem, 'id' | 'createdAt'>) => ExpenseItem;
  onUpdateExpenseItem: (id: string, updates: Partial<ExpenseItem>) => void;
  onDeleteExpenseItem: (id: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  expenseItems,
  settings,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpenseItem,
  onUpdateExpenseItem,
  onDeleteExpenseItem,
}) => {
  // Navigation sub-tab inside Expenses
  const [activeSubTab, setActiveSubTab] = useState<'byProduct' | 'allExpenses'>('byProduct');

  // Filters
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ExpenseItem | null>(null);

  // Form states for Expense
  const [formExpenseItemId, setFormExpenseItemId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('İstehsalat & Xammal');
  const [formQuantity, setFormQuantity] = useState<string>('1');
  const [formUnit, setFormUnit] = useState<string>('Adet');
  const [formUnitPrice, setFormUnitPrice] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Form states for ExpenseItem
  const [itemFormName, setItemFormName] = useState<string>('');
  const [itemFormCategory, setItemFormCategory] = useState<string>('İstehsalat & Xammal');
  const [itemFormUnit, setItemFormUnit] = useState<string>('Kisə');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    return expenses.filter((exp) => {
      const expDate = new Date(exp.date || exp.createdAt);

      // Time Range Filter
      if (timeRange === 'today') {
        if (expDate < startOfToday || expDate > endOfToday) return false;
      } else if (timeRange === 'week') {
        if (expDate < startOfWeek) return false;
      } else if (timeRange === 'month') {
        if (expDate < startOfMonth) return false;
      } else if (timeRange === 'year') {
        if (expDate < startOfYear) return false;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const [sy, sm, sd] = customStartDate.split('-').map(Number);
          const cDateStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          if (expDate < cDateStart) return false;
        }
        if (customEndDate) {
          const [ey, em, ed] = customEndDate.split('-').map(Number);
          const cDateEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          if (expDate > cDateEnd) return false;
        }
      }

      // Product filter
      if (selectedProductFilter !== 'all') {
        if (exp.expenseItemId !== selectedProductFilter && exp.title !== selectedProductFilter) {
          return false;
        }
      }

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        if (exp.category !== selectedCategoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchSupplier = (exp.supplier || '').toLowerCase().includes(q);
        const matchNotes = (exp.notes || '').toLowerCase().includes(q);
        const matchCat = exp.category.toLowerCase().includes(q);
        if (!matchTitle && !matchSupplier && !matchNotes && !matchCat) return false;
      }

      return true;
    });
  }, [expenses, timeRange, customStartDate, customEndDate, selectedProductFilter, selectedCategoryFilter, searchQuery]);

  // Total amount spent in selected period
  const totalPeriodExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Breakdown by Expense Product / Item (Her ürüne ne kadar para harcandı)
  const productExpenseBreakdown = useMemo(() => {
    // Map of product id / title to metrics
    const map: Record<
      string,
      {
        id: string;
        name: string;
        category: string;
        unit: string;
        totalAmount: number;
        totalQuantity: number;
        entriesCount: number;
        lastExpenseDate: string;
      }
    > = {};

    // First initialize from known expenseItems
    expenseItems.forEach((item) => {
      map[item.id] = {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.defaultUnit || 'Adet',
        totalAmount: 0,
        totalQuantity: 0,
        entriesCount: 0,
        lastExpenseDate: '',
      };
    });

    // Aggregate filtered expenses
    filteredExpenses.forEach((exp) => {
      const key = exp.expenseItemId || exp.title;
      if (!map[key]) {
        map[key] = {
          id: exp.expenseItemId || `custom-${exp.title}`,
          name: exp.title,
          category: exp.category,
          unit: exp.unit || 'Adet',
          totalAmount: 0,
          totalQuantity: 0,
          entriesCount: 0,
          lastExpenseDate: '',
        };
      }
      map[key].totalAmount += exp.amount;
      map[key].totalQuantity += exp.quantity || 1;
      map[key].entriesCount += 1;
      if (!map[key].lastExpenseDate || new Date(exp.date || exp.createdAt) > new Date(map[key].lastExpenseDate)) {
        map[key].lastExpenseDate = exp.date || exp.createdAt;
      }
    });

    // Convert to sorted array (highest spending first)
    return Object.values(map)
      .map((item) => {
        const avgUnitPrice = item.totalQuantity > 0 ? item.totalAmount / item.totalQuantity : 0;
        const percentage = totalPeriodExpenses > 0 ? (item.totalAmount / totalPeriodExpenses) * 100 : 0;
        return {
          ...item,
          avgUnitPrice,
          percentage,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenseItems, filteredExpenses, totalPeriodExpenses]);

  // Top spending product
  const topSpendingProduct = useMemo(() => {
    return productExpenseBreakdown.find((p) => p.totalAmount > 0) || null;
  }, [productExpenseBreakdown]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    expenseItems.forEach((i) => cats.add(i.category));
    expenses.forEach((e) => cats.add(e.category));
    return Array.from(cats);
  }, [expenseItems, expenses]);

  // Open add expense modal
  const handleOpenAddExpense = (preselectedItemId?: string) => {
    setEditingExpense(null);
    if (preselectedItemId) {
      const item = expenseItems.find((i) => i.id === preselectedItemId);
      if (item) {
        setFormExpenseItemId(item.id);
        setFormTitle(item.name);
        setFormCategory(item.category);
        setFormUnit(item.defaultUnit || 'Adet');
      }
    } else if (expenseItems.length > 0) {
      const item = expenseItems[0];
      setFormExpenseItemId(item.id);
      setFormTitle(item.name);
      setFormCategory(item.category);
      setFormUnit(item.defaultUnit || 'Adet');
    } else {
      setFormExpenseItemId('');
      setFormTitle('');
      setFormCategory('İstehsalat & Xammal');
      setFormUnit('Adet');
    }
    setFormQuantity('1');
    setFormUnitPrice('');
    setFormAmount('');
    setFormPaymentMethod('cash');
    setFormSupplier('');
    setFormNotes('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setIsAddExpenseOpen(true);
  };

  // Open edit expense modal
  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormExpenseItemId(expense.expenseItemId || '');
    setFormTitle(expense.title);
    setFormCategory(expense.category);
    setFormQuantity(expense.quantity?.toString() || '1');
    setFormUnit(expense.unit || 'Adet');
    setFormUnitPrice(expense.unitPrice?.toString() || '');
    setFormAmount(expense.amount.toString());
    setFormPaymentMethod(expense.paymentMethod);
    setFormSupplier(expense.supplier || '');
    setFormNotes(expense.notes || '');
    setFormDate(expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIsAddExpenseOpen(true);
  };

  // Save Expense form
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(formQuantity) || 1;
    const unitPrice = parseFloat(formUnitPrice) || 0;
    let finalAmount = parseFloat(formAmount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      if (unitPrice > 0 && qty > 0) {
        finalAmount = qty * unitPrice;
      } else {
        alert('Lütfen geçerli bir harcama tutarı girin.');
        return;
      }
    }

    if (!formTitle.trim()) {
      alert('Lütfen gider ürününü veya açıklamasını belirtin.');
      return;
    }

    const expensePayload = {
      expenseItemId: formExpenseItemId || undefined,
      title: formTitle.trim(),
      category: formCategory,
      quantity: qty,
      unit: formUnit,
      unitPrice: unitPrice > 0 ? unitPrice : Number((finalAmount / qty).toFixed(2)),
      amount: Number(finalAmount.toFixed(2)),
      paymentMethod: formPaymentMethod,
      supplier: formSupplier.trim() || undefined,
      notes: formNotes.trim() || undefined,
      date: new Date(formDate).toISOString(),
    };

    if (editingExpense) {
      onUpdateExpense(editingExpense.id, expensePayload);
    } else {
      onAddExpense(expensePayload);
    }

    setIsAddExpenseOpen(false);
  };

  // Handle auto calculation when quantity or unit price changes
  const handleQtyChange = (val: string) => {
    setFormQuantity(val);
    const q = parseFloat(val);
    const p = parseFloat(formUnitPrice);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
      setFormAmount((q * p).toFixed(2));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setFormUnitPrice(val);
    const p = parseFloat(val);
    const q = parseFloat(formQuantity);
    if (!isNaN(p) && !isNaN(q) && p > 0 && q > 0) {
      setFormAmount((q * p).toFixed(2));
    }
  };

  // Open Add Expense Item Modal
  const handleOpenAddProduct = (itemToEdit?: ExpenseItem) => {
    if (itemToEdit) {
      setEditingProduct(itemToEdit);
      setItemFormName(itemToEdit.name);
      setItemFormCategory(itemToEdit.category);
      setItemFormUnit(itemToEdit.defaultUnit || 'Kisə');
    } else {
      setEditingProduct(null);
      setItemFormName('');
      setItemFormCategory('İstehsalat & Xammal');
      setItemFormUnit('Kisə');
    }
    setIsAddProductOpen(true);
  };

  // Save Expense Item Form
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormName.trim()) {
      alert('Lütfen gider ürünü adını yazın.');
      return;
    }

    if (editingProduct) {
      onUpdateExpenseItem(editingProduct.id, {
        name: itemFormName.trim(),
        category: itemFormCategory,
        defaultUnit: itemFormUnit,
      });
    } else {
      onAddExpenseItem({
        name: itemFormName.trim(),
        category: itemFormCategory,
        defaultUnit: itemFormUnit,
      });
    }
    setIsAddProductOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Giderler & Harcama Yönetimi
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gider ürünleri takibi, kalem bazlı harcama raporları ve kasa çıkışları
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenAddProduct()}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Package className="w-4 h-4 text-rose-500" />
            <span>+ Gider Ürünü Tanımla</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddExpense()}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Yeni Gider / Harcama Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Toplam Gider */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {timeRange === 'today'
                ? 'Bugünkü Toplam Gider'
                : timeRange === 'week'
                ? 'Bu Haftaki Toplam Gider'
                : timeRange === 'month'
                ? 'Bu Ayki Toplam Gider'
                : timeRange === 'year'
                ? 'Bu Yılki Toplam Gider'
                : 'Toplam Gider'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              {formatCurrency(totalPeriodExpenses, settings.currency)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">{filteredExpenses.length}</span>
              <span>harcama işlemi yapıldı</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tanımlı Gider Ürünü Çeşidi */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gider Ürünü / Kalemi
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {expenseItems.length} Çeşit
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Un, odun, maya, elektrik vb.</span>
            </div>
          </div>
        </div>

        {/* KPI 3: En Çok Harcanan Ürün */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              En Çok Harcanan Ürün
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
              {topSpendingProduct ? topSpendingProduct.name : 'Henüz Yok'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {topSpendingProduct ? formatCurrency(topSpendingProduct.totalAmount, settings.currency) : '-'}
              </span>
              {topSpendingProduct && (
                <span className="font-medium text-slate-500">%{topSpendingProduct.percentage.toFixed(0)} pay</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 4: Ortalama İşlem Başına Gider */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Ortalama Harcama / Fiş
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {filteredExpenses.length > 0
                ? formatCurrency(totalPeriodExpenses / filteredExpenses.length, settings.currency)
                : formatCurrency(0, settings.currency)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Seçili dönem bazlı</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Period Selection */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sub-tab view toggle (Ürün Bazında Harcama vs Detaylı Liste) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveSubTab('byProduct')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeSubTab === 'byProduct'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📊 Ürün Bazında Harcama Raporu
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('allExpenses')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeSubTab === 'allExpenses'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📑 Tüm Gider Kayıtları Listesi ({filteredExpenses.length})
            </button>
          </div>

          {/* Excel / CSV Export */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => exportExpensesToExcel(filteredExpenses, productExpenseBreakdown, settings.storeName)}
              className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Giderleri Excel olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Giderler Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => exportExpensesToCSV(filteredExpenses)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Date Ranges and Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Time range pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {[
              { id: 'today', label: 'Bugün' },
              { id: 'week', label: 'Son 7 Gün' },
              { id: 'month', label: 'Bu Ay' },
              { id: 'year', label: 'Bu Yıl' },
              { id: 'all', label: 'Tüm Zamanlar' },
              { id: 'custom', label: 'Özel Tarih' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  timeRange === t.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-semibold focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-semibold focus:outline-none"
              />
            </div>
          )}

          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Gider, ürün, tedarikçi ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. SUB-TAB 1: ÜRÜN BAZINDA HARCAMA RAPORU (Her Ürüne Ne Kadar Para Harcandı) */}
      {activeSubTab === 'byProduct' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Her Bir Gider Ürününe Harcanan Tutar</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold">
                {productExpenseBreakdown.length} Ürün Kalemi
              </span>
            </h2>
            <span className="text-xs text-slate-500">En çok harcanandan en aza doğru sıralı</span>
          </div>

          {productExpenseBreakdown.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Henüz gider ürünü tanımlanmamış</p>
              <p className="text-xs text-slate-500 mt-1">Un, odun, maya, elektrik gibi gider kalemlerinizi ekleyin.</p>
              <button
                type="button"
                onClick={() => handleOpenAddProduct()}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                + İlk Gider Ürününü Tanımla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productExpenseBreakdown.map((item) => {
                const isItemInKnownList = expenseItems.some((ei) => ei.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Top Bar: Name & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mb-1.5">
                            {item.category}
                          </span>
                          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                            {item.name}
                          </h3>
                        </div>

                        {/* Edit / Delete product definition buttons */}
                        {isItemInKnownList && (
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                const matched = expenseItems.find((ei) => ei.id === item.id);
                                if (matched) handleOpenAddProduct(matched);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Gider Ürününü Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`"${item.name}" gider ürününü silmek istediğinize emin misiniz?`)) {
                                  onDeleteExpenseItem(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Gider Ürününü Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Main Big Metric: Her ürüne ne kadar para harcandı */}
                      <div className="my-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                          Bu Ürüne Harcanan Toplam Para
                        </span>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                          {formatCurrency(item.totalAmount, settings.currency)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-rose-800/80 dark:text-rose-300/80 mt-1 font-semibold">
                          <span>Alınan Miktar: {item.totalQuantity} {item.unit}</span>
                          <span>Ort: {formatCurrency(item.avgUnitPrice, settings.currency)}/{item.unit}</span>
                        </div>
                      </div>

                      {/* Percentage of Total Expenses Progress Bar */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span>Toplam Gider İçindeki Payı</span>
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            %{item.percentage.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(item.totalAmount > 0 ? 4 : 0, item.percentage))}%` }}
                            className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>{item.entriesCount} kez harcama yapıldı</span>
                        <span>
                          {item.lastExpenseDate ? `Son: ${formatDate(item.lastExpenseDate)}` : 'Harcama yok'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Button to Record Expense for this product */}
                    <div className="mt-4 pt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddExpense(item.id)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-rose-500" />
                        <span>Harcama Ekle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductFilter(item.id);
                          setActiveSubTab('allExpenses');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                        title="Bu ürünün tüm harcama geçmişini gör"
                      >
                        Detaylar ({item.entriesCount})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-TAB 2: DETAYLI GİDER KAYITLARI LİSTESİ */}
      {activeSubTab === 'allExpenses' && (
        <div className="space-y-4">
          {/* Active Filter Indicators */}
          {(selectedProductFilter !== 'all' || selectedCategoryFilter !== 'all') && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
              <span>Filtrelenmiş Görünüm:</span>
              {selectedProductFilter !== 'all' && (
                <span className="bg-rose-100 dark:bg-rose-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                  Ürün: {productExpenseBreakdown.find((p) => p.id === selectedProductFilter)?.name || selectedProductFilter}
                  <button type="button" onClick={() => setSelectedProductFilter('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategoryFilter !== 'all' && (
                <span className="bg-rose-100 dark:bg-rose-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                  Kategori: {selectedCategoryFilter}
                  <button type="button" onClick={() => setSelectedCategoryFilter('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedProductFilter('all');
                  setSelectedCategoryFilter('all');
                }}
                className="underline ml-auto"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">Gider Ürünü / Kalemi</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Miktar & Birim</th>
                    <th className="py-3 px-4 text-right">Birim Fiyat</th>
                    <th className="py-3 px-4 text-right font-black">Toplam Harcama</th>
                    <th className="py-3 px-4">Ödeme Türü</th>
                    <th className="py-3 px-4">Tedarikçi / Not</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Bu aralıkta kayıtlı harcama bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                          {formatDateTime(exp.date || exp.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {exp.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {exp.quantity || 1} {exp.unit || 'Adet'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                          {exp.unitPrice ? formatCurrency(exp.unitPrice, settings.currency) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base tabular-nums">
                          {formatCurrency(exp.amount, settings.currency)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              exp.paymentMethod === 'cash'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : exp.paymentMethod === 'credit'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            }`}
                          >
                            {exp.paymentMethod === 'cash'
                              ? 'Nakit'
                              : exp.paymentMethod === 'credit'
                              ? 'Veresiye / Borç'
                              : 'Banka / Kart'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {exp.supplier || '-'}
                          </div>
                          {exp.notes && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{exp.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Harcamayı Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`"${exp.title}" harcamasını silmek istediğinize emin misiniz?`)) {
                                  onDeleteExpense(exp.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Harcamayı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                Filtrelenen Toplam {filteredExpenses.length} Harcama Kaydı
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Toplam Harcama Tutarı:</span>
                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCurrency(totalPeriodExpenses, settings.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Gider / Harcama Ekle & Düzenle */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingExpense ? 'Gider Kaydını Düzenle' : 'Yeni Gider / Harcama Kaydı'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Select Expense Item or Custom Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gider Kalemi / Ürün Seçin *
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formExpenseItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setFormExpenseItemId(id);
                      const matched = expenseItems.find((i) => i.id === id);
                      if (matched) {
                        setFormTitle(matched.name);
                        setFormCategory(matched.category);
                        setFormUnit(matched.defaultUnit || 'Adet');
                      }
                    }}
                    className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">-- Listeden Seçin veya Özel Girin --</option>
                    {expenseItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleOpenAddProduct()}
                    className="px-3 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    + Yeni Ürün
                  </button>
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Harcama Başlığı / Ürün Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn: Un 50kg, Odun, Maya vb."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gider Kategorisi
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="İstehsalat & Xammal">İstehsalat & Xammal (Un, Maya, Duz vb.)</option>
                  <option value="İstehsalat & Yanacaq">İstehsalat & Yanacaq (Odun, Kömür vb.)</option>
                  <option value="Qablaşdırma & Sərfi">Qablaşdırma & Sərfi (Çörək torbası, poşet)</option>
                  <option value="Kommunal & Əməliyyat">Kommunal & Əməliyyat (İşıq, Qaz, Su)</option>
                  <option value="Əməliyyat & İcarə">Əməliyyat & İcarə Haqqı</option>
                  <option value="Nəqliyyat & Çatdırılma">Nəqliyyat & Çatdırılma (Benzin, Yol)</option>
                  <option value="Maaş & İşçilik">Maaş & İşçilik Xərcləri</option>
                  <option value="Digər Xərclər">Digər Xərclər</option>
                </select>
              </div>

              {/* Quantity, Unit, Unit Price Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Miktar
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="1"
                    value={formQuantity}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Birim
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full h-11 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Kisə">Kisə / Çuval</option>
                    <option value="Kg">Kg</option>
                    <option value="Ədəd">Ədəd / Adet</option>
                    <option value="Paket">Paket</option>
                    <option value="Maşın">Maşın (Odun vb.)</option>
                    <option value="Litr">Litr</option>
                    <option value="Ay">Ay (İcarə, İşıq)</option>
                    <option value="Qutu">Qutu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Birim Fiyat ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="25.00"
                    value={formUnitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Total Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Toplam Harcanan Tutar ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border-2 border-rose-500/60 bg-rose-50/50 dark:bg-rose-950/20 text-base font-black text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Harcama Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Payment Method & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ödeme Şekli
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="cash">Nakit Ödendi</option>
                    <option value="transfer">Banka Havalesi / Kart</option>
                    <option value="credit">Veresiye / Borç Alındı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tedarikçi / Satıcı Adı
                  </label>
                  <input
                    type="text"
                    placeholder="örn: Dəyirman, Azərişıq vb."
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  placeholder="İsteğe bağlı not veya fatura bilgisi"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all"
                >
                  {editingExpense ? 'Değişiklikleri Kaydet' : 'Gideri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Gider Ürünü Tanımla / Düzenle */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingProduct ? 'Gider Ürününü Düzenle' : 'Yeni Gider Ürünü Tanımla'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gider Ürünü / Kalemi Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn: Un (50 kg Kisə), Odun, Maya, Çörək Torbası"
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kategori
                </label>
                <select
                  value={itemFormCategory}
                  onChange={(e) => setItemFormCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="İstehsalat & Xammal">İstehsalat & Xammal (Un, Maya, Duz)</option>
                  <option value="İstehsalat & Yanacaq">İstehsalat & Yanacaq (Odun, Qaz)</option>
                  <option value="Qablaşdırma & Sərfi">Qablaşdırma & Sərfi (Torba, Poşet)</option>
                  <option value="Kommunal & Əməliyyat">Kommunal & Əməliyyat (İşıq, Su)</option>
                  <option value="Əməliyyat & İcarə">Əməliyyat & İcarə</option>
                  <option value="Nəqliyyat & Çatdırılma">Nəqliyyat & Yanacaq</option>
                  <option value="Maaş & İşçilik">Maaş & İşçilik</option>
                  <option value="Digər">Digər</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Varsayılan Ölçü Birimi
                </label>
                <select
                  value={itemFormUnit}
                  onChange={(e) => setItemFormUnit(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Kisə">Kisə / Çuval</option>
                  <option value="Kg">Kg</option>
                  <option value="Ədəd">Ədəd / Adet</option>
                  <option value="Paket">Paket</option>
                  <option value="Maşın">Maşın (Odun)</option>
                  <option value="Litr">Litr</option>
                  <option value="Ay">Ay</option>
                  <option value="Qutu">Qutu</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                  {editingProduct ? 'Güncelle' : 'Ürünü Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
