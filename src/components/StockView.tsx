import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Edit3,
  X,
  TrendingDown,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { exportProductsToCSV } from '../utils/export-utils';

interface StockViewProps {
  products: Product[];
  onAdjustStock: (id: string, delta: number) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onOpenAddProduct: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  onAdjustStock,
  onUpdateProduct,
  onOpenAddProduct,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'out_of_stock' | 'healthy'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'stock_asc' | 'stock_desc' | 'name' | 'value'>('stock_asc');

  // Stock Adjustment Modal
  const [editingStockProduct, setEditingStockProduct] = useState<Product | null>(null);
  const [manualStockCount, setManualStockCount] = useState<string>('');
  const [minStockValue, setMinStockValue] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Sayım Düzeltmesi');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Overall Stock Analytics
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalCostValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.buyPrice || 0), 0);
    const totalSaleValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.sellPrice || 0), 0);
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const criticalTotal = outOfStockCount + lowStockCount;

    return {
      totalItems,
      totalUnits,
      totalCostValue,
      totalSaleValue,
      outOfStockCount,
      lowStockCount,
      criticalTotal,
    };
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

        if (!matchesSearch) return false;

        if (categoryFilter !== 'all' && p.category !== categoryFilter) {
          return false;
        }

        if (statusFilter === 'critical') {
          return p.stock > 0 && p.stock <= p.minStock;
        }
        if (statusFilter === 'out_of_stock') {
          return p.stock <= 0;
        }
        if (statusFilter === 'healthy') {
          return p.stock > p.minStock;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        if (sortBy === 'stock_desc') return b.stock - a.stock;
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'tr');
        if (sortBy === 'value') return b.stock * b.buyPrice - a.stock * a.buyPrice;
        return 0;
      });
  }, [products, search, categoryFilter, statusFilter, sortBy]);

  const handleOpenEditModal = (p: Product) => {
    setEditingStockProduct(p);
    setManualStockCount(p.stock.toString());
    setMinStockValue(p.minStock.toString());
    setAdjustmentReason('Sayım Düzeltmesi');
  };

  const handleSaveStockModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockProduct) return;

    const newStock = Math.max(0, parseInt(manualStockCount, 10) || 0);
    const newMin = Math.max(1, parseInt(minStockValue, 10) || 5);

    onUpdateProduct(editingStockProduct.id, {
      stock: newStock,
      minStock: newMin,
    });

    setEditingStockProduct(null);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Stok & Envanter Takibi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Anlık stok miktarlarını inceleyin, hızlı giriş/çıkış ve sayım düzeltmelerini yapın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportProductsToCSV(products)}
            className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
            title="Stok Listesini Dışa Aktar"
          >
            <Download className="w-4 h-4" />
            <span>CSV Dışa Aktar</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stock Units */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Toplam Stok Adedi
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {formatNumber(stats.totalUnits)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {stats.totalItems} farklı ürün çeşidi
          </span>
        </div>

        {/* Cost Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Stok Maliyet Değeri
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(stats.totalCostValue)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Alış fiyatı üzerinden toplam
          </span>
        </div>

        {/* Sale Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Potansiyel Satış Değeri
          </span>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {formatCurrency(stats.totalSaleValue)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Satış fiyatı üzerinden ciro
          </span>
        </div>

        {/* Critical Alerts */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          stats.criticalTotal > 0
            ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
              Kritik & Biten Stok
            </span>
            {stats.criticalTotal > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1 tabular-nums">
            {stats.criticalTotal} ürün
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 block">
            {stats.outOfStockCount} tükendi, {stats.lowStockCount} kritik seviyede
          </span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün adı veya kategori ara..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="stock_asc">Stok: En Azdan En Çoğa</option>
              <option value="stock_desc">Stok: En Çoktan En Aza</option>
              <option value="name">İsim Sıralı (A-Z)</option>
              <option value="value">Maliyet Değerine Göre</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `Tümü (${products.length})` },
            { id: 'critical', label: `Kritik Stok (${stats.lowStockCount})`, badgeColor: 'text-amber-600' },
            { id: 'out_of_stock', label: `Tükenenler (${stats.outOfStockCount})`, badgeColor: 'text-rose-600' },
            { id: 'healthy', label: 'Yeterli Stok' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Category Chips */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tüm Kat.
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products Stock Cards List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Filtreye Uygun Stok Kaydı Bulunamadı
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Arama kriterlerinizi değiştirebilir veya yeni ürün ekleyerek stok takibine başlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProducts.map((p) => {
              const isOut = p.stock <= 0;
              const isLow = !isOut && p.stock <= p.minStock;
              const costValue = p.stock * p.buyPrice;
              const saleValue = p.stock * p.sellPrice;

              return (
                <div
                  key={p.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isOut
                      ? 'bg-rose-50/30 dark:bg-rose-950/10'
                      : isLow
                      ? 'bg-amber-50/30 dark:bg-amber-950/10'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </span>
                      {p.category && (
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {p.category}
                        </span>
                      )}

                      {/* Stock Status Badge */}
                      {isOut ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100/80 dark:bg-rose-950 px-2 py-0.5 rounded flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Stok Tükendi
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100/80 dark:bg-amber-950 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Kritik Seviye (Min: {p.minStock})
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Stok Yeterli
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      <span>Alış: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(p.buyPrice)}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Satış: <strong className="text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(p.sellPrice)}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Stok Değeri: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(costValue)}</strong></span>
                    </div>
                  </div>

                  {/* Right: Quick Stock Count Controls & Manual Input */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                    {/* Inline Stepper: -1, Stock Number, +1 */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => onAdjustStock(p.id, -1)}
                        disabled={p.stock <= 0}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors active:scale-95 shadow-xs"
                        title="1 Adet Çıkar"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="px-3 text-center min-w-[50px]">
                        <span className={`text-xs font-black tabular-nums ${
                          isOut
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLow
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {p.stock}
                        </span>
                        <span className="text-[9px] text-slate-400 block -mt-0.5">
                          {p.unit || 'adet'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAdjustStock(p.id, 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95 shadow-xs"
                        title="1 Adet Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick +5 and +10 chips */}
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAdjustStock(p.id, 5)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        title="5 Adet Ekle"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustStock(p.id, 10)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        title="10 Adet Ekle"
                      >
                        +10
                      </button>
                    </div>

                    {/* Manual Count & Threshold Modal trigger */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200 dark:border-slate-700"
                      title="Sayım Düzeltmesi Yap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sayım</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Count / Stock Adjustment Modal */}
      {editingStockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Stok Sayım & Düzeltme
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[220px]">
                  {editingStockProduct.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStockProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStockModal} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mevcut Fiili Sayım Adedi *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={manualStockCount}
                    onChange={(e) => setManualStockCount(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-black tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {editingStockProduct.unit || 'adet'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kayıtlı sistem stoğu: <strong>{editingStockProduct.stock}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Kritik Stok Uyarısı Limiti
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStockValue}
                  onChange={(e) => setMinStockValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Stok bu sayının altına düşünce uyarı verilir.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Düzeltme Nedeni
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Sayım Düzeltmesi">Periyodik Sayım / Envanter Düzeltmesi</option>
                  <option value="Yeni Mal Girişi">Yeni Mal / İrsaliye Kabulü</option>
                  <option value="Hasarlı / Fire">Hasarlı / Kırık / Zayi Çıkışı</option>
                  <option value="Müşteri İadesi">Müşteri İadesi Girişi</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStockProduct(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  Stoğu Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
