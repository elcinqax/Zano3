import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  Layers,
  Check,
  X,
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { exportProductsToCSV } from '../utils/export-utils';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
  isOpenAddModalExternal: boolean;
  onCloseAddModalExternal: () => void;
}

// Helper to safely parse both comma and dot decimal inputs (e.g. 12,50 or 12.50)
const parseDecimal = (val: string | number): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = val.toString().replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
  isOpenAddModalExternal,
  onCloseAddModalExternal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Edit / Add modal state
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states (using string for robust decimal & kuruş typing without browser stripping)
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Genel');
  const [formBuyPrice, setFormBuyPrice] = useState<string>('');
  const [formSellPrice, setFormSellPrice] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('10');
  const [formMinStock, setFormMinStock] = useState<string>('5');
  const [formUnit, setFormUnit] = useState<Product['unit']>('Adet');

  // Trigger add from external prop
  React.useEffect(() => {
    if (isOpenAddModalExternal) {
      openAddModal();
      onCloseAddModalExternal();
    }
  }, [isOpenAddModalExternal]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchLowStock = !filterLowStockOnly || p.stock <= p.minStock;
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchLowStock && matchQuery;
    });
  }, [products, selectedCategory, filterLowStockOnly, search]);

  // Metrics
  const totalStockCost = useMemo(() => products.reduce((s, p) => s + p.stock * p.buyPrice, 0), [products]);
  const totalStockSalesValue = useMemo(() => products.reduce((s, p) => s + p.stock * p.sellPrice, 0), [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.stock <= p.minStock).length, [products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Gıda & İçecek');
    setFormBuyPrice('');
    setFormSellPrice('');
    setFormStock('10');
    setFormMinStock('5');
    setFormUnit('Adet');
    setModalMode('add');
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormBuyPrice(p.buyPrice > 0 ? p.buyPrice.toString().replace('.', ',') : '');
    setFormSellPrice(p.sellPrice > 0 ? p.sellPrice.toString().replace('.', ',') : '');
    setFormStock(p.stock.toString().replace('.', ','));
    setFormMinStock(p.minStock.toString().replace('.', ','));
    setFormUnit(p.unit);
    setModalMode('edit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const buyPrice = parseDecimal(formBuyPrice);
    const sellPrice = parseDecimal(formSellPrice);
    const stock = parseDecimal(formStock);
    const minStock = parseDecimal(formMinStock);

    if (modalMode === 'add') {
      onAddProduct({
        name: formName.trim(),
        category: formCategory.trim() || 'Genel',
        buyPrice,
        sellPrice,
        stock,
        minStock,
        unit: formUnit,
      });
    } else if (modalMode === 'edit' && editingProduct) {
      onUpdateProduct(editingProduct.id, {
        name: formName.trim(),
        category: formCategory.trim() || 'Genel',
        buyPrice,
        sellPrice,
        stock,
        minStock,
        unit: formUnit,
      });
    }

    setModalMode(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Main Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Ürün & Stok Yönetimi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SQLite üzerinde yerel kayıtlı ürün kataloğu ve anlık stok takibi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportProductsToCSV(products)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV İndir</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </button>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 block">Toplam Çeşit</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {products.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 block">Stok Maliyeti</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(totalStockCost)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 block">Beklenen Ciro</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(totalStockSalesValue)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 block">Kritik Stok</span>
          <span className={`text-lg font-bold tabular-nums ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
            {lowStockCount} ürün
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün adı veya kategori ile ara..."
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 h-11 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap border ${
              filterLowStockOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Kritik Stok ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {cat === 'all' ? 'Tüm Kategoriler' : cat}
          </button>
        ))}
      </div>

      {/* Products Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredProducts.map((p) => {
            const isLow = p.stock <= p.minStock;
            return (
              <div
                key={p.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {p.name}
                    </span>
                    {isLow && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                        Kritik
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>{p.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Alış: <strong className="font-mono">{formatCurrency(p.buyPrice)}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Satış: <strong className="font-mono text-emerald-600">{formatCurrency(p.sellPrice)}</strong></span>
                  </div>
                </div>

                {/* Stock Controls & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  {/* Stock Quick Buttons */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onAdjustStock(p.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-200 transition-colors shadow-xs"
                      title="Stok Azalt"
                    >
                      -
                    </button>
                    <div className="px-2 text-center min-w-[54px]">
                      <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums block">
                        {p.stock}
                      </span>
                      <span className="text-[9px] text-slate-400 block -mt-0.5">
                        {p.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(p.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-200 transition-colors shadow-xs"
                      title="Stok Artır"
                    >
                      +
                    </button>
                  </div>

                  {/* Edit / Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs">
              Kayıtlı ürün bulunamadı. Yeni bir ürün ekleyebilirsiniz.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {modalMode === 'add' ? 'Yeni Ürün İlave Et' : 'Ürünü Düzenle'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Örn: Zeytinyağı Sızma 1 Litre"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Gıda, Temizlik, Kırtasiye vb."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Alış Fiyatı (₺)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formBuyPrice}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setFormBuyPrice(val);
                      }}
                      className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                      ₺
                    </span>
                  </div>
                  {formBuyPrice.trim() !== '' && parseDecimal(formBuyPrice) > 0 && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block tabular-nums">
                      Kayıt: {formatCurrency(parseDecimal(formBuyPrice))}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Satış Fiyatı (₺) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0,00"
                      value={formSellPrice}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setFormSellPrice(val);
                      }}
                      className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pointer-events-none">
                      ₺
                    </span>
                  </div>
                  {formSellPrice.trim() !== '' && parseDecimal(formSellPrice) > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums font-semibold">
                      Kayıt: {formatCurrency(parseDecimal(formSellPrice))}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mevcut Stok
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={formStock}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '');
                      setFormStock(val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Kritik Stok
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="5"
                    value={formMinStock}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '');
                      setFormMinStock(val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Birim
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as Product['unit'])}
                    className="w-full h-10 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kg</option>
                    <option value="Paket">Paket</option>
                    <option value="Koli">Koli</option>
                    <option value="Metre">Metre</option>
                    <option value="Litre">Litre</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {modalMode === 'add' ? 'Ürünü Kaydet' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
