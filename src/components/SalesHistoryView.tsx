import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  XCircle,
  Eye,
  Calendar,
  CreditCard,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowLeft,
  CalendarRange,
  RotateCcw,
  Package,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Sale, Customer, Product, AppSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportToExcel, exportSalesToCSV } from '../utils/export-utils';

export type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last1year' | 'custom' | 'all';

interface SalesHistoryViewProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  settings: AppSettings;
  onSelectSaleForReceipt: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onBackToPOS?: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  customers,
  products,
  settings,
  onSelectSaleForReceipt,
  onCancelSale,
  onBackToPOS,
}) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [viewMode, setViewMode] = useState<'invoices' | 'customers'>('invoices');

  // Tarih Filtresi: Bugün, Dün, Son 7 Gün, Son 30 Gün, Son 1 Yıl, Özel Aralık, Tümü
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Tarih periyotlarına göre toplam satış adetleri
  const countsByPeriod = useMemo(() => {
    const now = new Date();
    const sToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const eToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const sYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const eYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    const s7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const s30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    const s1y = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let today = 0;
    let yesterday = 0;
    let last7days = 0;
    let last30days = 0;
    let last1year = 0;

    sales.forEach((s) => {
      const d = new Date(s.createdAt);
      if (d >= sToday && d <= eToday) today++;
      if (d >= sYest && d <= eYest) yesterday++;
      if (d >= s7 && d <= eToday) last7days++;
      if (d >= s30 && d <= eToday) last30days++;
      if (d >= s1y && d <= eToday) last1year++;
    });

    return { today, yesterday, last7days, last30days, last1year, all: sales.length };
  }, [sales]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const startOf30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    const startOf1Year = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return sales.filter((s) => {
      // 1. Tarih Filtresi
      const saleDate = new Date(s.createdAt);
      let matchDate = true;

      if (dateFilter === 'today') {
        matchDate = saleDate >= startOfToday && saleDate <= endOfToday;
      } else if (dateFilter === 'yesterday') {
        matchDate = saleDate >= startOfYesterday && saleDate <= endOfYesterday;
      } else if (dateFilter === 'last7days') {
        matchDate = saleDate >= startOf7Days && saleDate <= endOfToday;
      } else if (dateFilter === 'last30days') {
        matchDate = saleDate >= startOf30Days && saleDate <= endOfToday;
      } else if (dateFilter === 'last1year') {
        matchDate = saleDate >= startOf1Year && saleDate <= endOfToday;
      } else if (dateFilter === 'custom') {
        if (customStartDate) {
          const [sy, sm, sd] = customStartDate.split('-').map(Number);
          const cStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          if (saleDate < cStart) matchDate = false;
        }
        if (customEndDate) {
          const [ey, em, ed] = customEndDate.split('-').map(Number);
          const cEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          if (saleDate > cEnd) matchDate = false;
        }
      } else if (dateFilter === 'all') {
        matchDate = true;
      }

      // 2. Ödeme Yöntemi Filtresi
      const matchMethod = methodFilter === 'all' || s.paymentMethod === methodFilter;

      // 3. Durum Filtresi
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;

      // 4. Arama Sorgusu
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q));

      return matchDate && matchMethod && matchStatus && matchQuery;
    });
  }, [sales, dateFilter, customStartDate, customEndDate, methodFilter, statusFilter, search]);

  const totalFilteredAmount = useMemo(
    () => filteredSales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.total, 0),
    [filteredSales]
  );
  const totalFilteredProfit = useMemo(
    () => filteredSales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.profit, 0),
    [filteredSales]
  );

  // Satılan Ürün Adet Sayısı
  const totalFilteredItemCount = useMemo(
    () =>
      filteredSales
        .filter((s) => s.status === 'completed')
        .reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0),
    [filteredSales]
  );

  // Müşteri Bazında Alınan Ürün Adetleri (Hangi Müşteri Kaç Tane Almış)
  const customerPurchases = useMemo(() => {
    const map = new Map<
      string,
      {
        customerId?: string;
        customerName: string;
        customerPhone?: string;
        totalQuantity: number;
        totalAmount: number;
        invoiceCount: number;
        itemsMap: Map<string, { productName: string; quantity: number; unitPrice: number; total: number }>;
      }
    >();

    filteredSales
      .filter((s) => s.status === 'completed')
      .forEach((sale) => {
        const key = sale.customerId || sale.customerName || 'Genel Müşteri';
        const existing = map.get(key) || {
          customerId: sale.customerId,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          totalQuantity: 0,
          totalAmount: 0,
          invoiceCount: 0,
          itemsMap: new Map(),
        };

        existing.invoiceCount += 1;

        sale.items.forEach((item) => {
          existing.totalQuantity += item.quantity;
          existing.totalAmount += item.total;
          const currentItem = existing.itemsMap.get(item.productName) || {
            productName: item.productName,
            quantity: 0,
            unitPrice: item.unitPrice,
            total: 0,
          };
          currentItem.quantity += item.quantity;
          currentItem.total += item.total;
          existing.itemsMap.set(item.productName, currentItem);
        });

        map.set(key, existing);
      });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredSales]);

  const dateFilterButtons: { id: DateFilterType; label: string; count?: number }[] = [
    { id: 'today', label: 'Bugün', count: countsByPeriod.today },
    { id: 'yesterday', label: 'Dün', count: countsByPeriod.yesterday },
    { id: 'last7days', label: 'Son 7 gün', count: countsByPeriod.last7days },
    { id: 'last30days', label: 'Son 30 gün', count: countsByPeriod.last30days },
    { id: 'last1year', label: 'Son 1 yıl', count: countsByPeriod.last1year },
    { id: 'custom', label: 'Özel aralık' },
    { id: 'all', label: 'Tümü', count: countsByPeriod.all },
  ];

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* 1. ÜST SIRA: BUGÜN, DÜN, SON 7 GÜN, SON 30 GÜN, SON 1 YIL, ÖZEL ARALIK TUŞLARI */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tarih Filtresi
            </span>
          </div>

          {onBackToPOS && (
            <button
              type="button"
              onClick={onBackToPOS}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Satış Ekranına Dön</span>
            </button>
          )}
        </div>

        {/* Üst Sıradaki Butonlar (Yatay Kaydırılabilir ve Kolay Dokunmatik) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {dateFilterButtons.map((btn) => {
            const isSelected = dateFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilter(btn.id)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <span>{btn.label}</span>
                {btn.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums leading-none ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {btn.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Özel Aralık Seçimi Açıldığında Gösterilecek Tarih Kutuları */}
        {dateFilter === 'custom' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-950/50 p-3 rounded-xl border">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Satış Geçmişi & Faturalar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tamamlanan ve iptal edilen tüm perakende satış makbuzları
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportToExcel(filteredSales, customers, products, settings.storeName)}
            className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => exportSalesToCSV(filteredSales)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV İndir</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 dark:text-slate-400">
        <span>Filtrelenen Satış: <strong className="text-slate-900 dark:text-white tabular-nums">{filteredSales.length}</strong></span>
        <span aria-hidden="true">·</span>
        <span>Satılan Ürün: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{totalFilteredItemCount} adet</strong></span>
        <span aria-hidden="true">·</span>
        <span>Toplam Ciro: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(totalFilteredAmount)}</strong></span>
        <span aria-hidden="true">·</span>
        <span>Toplam Kâr: <strong className="text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(totalFilteredProfit)}</strong></span>
      </div>

      {/* Tab Switcher: Faturalar vs Müşteri Bazında Alınan Ürünler */}
      <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start">
        <button
          type="button"
          onClick={() => setViewMode('invoices')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            viewMode === 'invoices'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Faturalar ({filteredSales.length})
        </button>
        <button
          type="button"
          onClick={() => setViewMode('customers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            viewMode === 'customers'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Müşteri Ürün Dağılımı ({customerPurchases.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fatura No, Müşteri Adı veya ürün ile ara..."
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Method filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl overflow-x-auto self-start sm:self-auto">
          {[
            { id: 'all', label: 'Tüm Ödemeler' },
            { id: 'cash', label: 'Nakit' },
            { id: 'mixed', label: 'Karışık' },
            { id: 'credit', label: 'Veresiye' },
            { id: 'transfer', label: 'Havale' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethodFilter(m.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                methodFilter === m.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales List Table (Invoices view) */}
      {viewMode === 'invoices' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSales.map((sale) => {
              const isCancelled = sale.status === 'cancelled';
              const saleItemCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);

              return (
                <div
                  key={sale.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCancelled
                      ? 'opacity-50 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {sale.invoiceNo}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        · {sale.customerName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
                        {saleItemCount} Adet Ürün
                      </span>
                      {isCancelled && (
                        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                          İptal Edildi
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {sale.items.map((i) => `${i.productName} (${i.quantity} adet)`).join(', ')}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>{formatDateTime(sale.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize font-medium text-slate-600 dark:text-slate-300">
                        {sale.paymentMethod === 'cash'
                          ? 'Nakit'
                          : sale.paymentMethod === 'mixed'
                          ? 'Karışık Ödeme'
                          : sale.paymentMethod === 'credit'
                          ? 'Açık Hesap (Veresiye)'
                          : sale.paymentMethod === 'transfer'
                          ? 'Havale'
                          : 'Kart'}
                      </span>
                      {sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta !== 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          sale.customerBalanceDelta > 0
                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                        }`}>
                          {sale.customerBalanceDelta > 0
                            ? `+${formatCurrency(sale.customerBalanceDelta)} Borca Eklendi`
                            : `${formatCurrency(Math.abs(sale.customerBalanceDelta))} Avans Aktarıldı`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Amounts & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums block">
                        {formatCurrency(sale.total)}
                      </span>
                      {!isCancelled && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums font-bold">
                          +{formatCurrency(sale.profit)} kâr
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectSaleForReceipt(sale)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Fişi Görüntüle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Fiş</span>
                      </button>

                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => onCancelSale(sale.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Satışı İptal Et & İade Al"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSales.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-xs">
                Kayıtlı satış işlemi bulunamadı.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Purchases Breakdown View */}
      {viewMode === 'customers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Müşteri Bazında Alınan Ürün Adetleri</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hangi müşterinin toplam kaç adet ve hangi ürünleri satın aldığı raporu
              </p>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              Toplam {totalFilteredItemCount} Adet Satış
            </span>
          </div>

          {customerPurchases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Seçili zaman aralığında müşteri bazlı ürün alımı bulunamadı.
            </div>
          ) : (
            <div className="space-y-2.5">
              {customerPurchases.map((cust, idx) => {
                const itemsList = Array.from(cust.itemsMap.values());

                return (
                  <div
                    key={cust.customerId || cust.customerName + idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {cust.customerName}
                        </h4>
                        {cust.customerPhone && (
                          <span className="text-xs text-slate-400 font-mono">
                            {cust.customerPhone}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black font-mono shadow-xs">
                          Toplam {cust.totalQuantity} Adet Aldı
                        </span>
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                          Tutar: {formatCurrency(cust.totalAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Aldığı Ürünler ve Adetleri:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {itemsList.map((item, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1.5"
                          >
                            <span>{item.productName}</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                              ({item.quantity} adet)
                            </strong>
                          </span>
                        ))}
                      </div>
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
