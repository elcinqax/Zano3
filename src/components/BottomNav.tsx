import React from 'react';
import { ShoppingCart, Users, Package, Boxes, BarChart3, TrendingDown } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartItemCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartItemCount = 0,
}) => {
  // Ordered strictly as requested:
  // 1. Satış
  // 2. Müşteriler
  // 3. Ürünler
  // 4. Stok
  // 5. Giderler
  // 6. Raporlar
  const tabs = [
    {
      id: 'pos',
      label: 'Satış',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
    },
    {
      id: 'customers',
      label: 'Müşteriler',
      icon: Users,
    },
    {
      id: 'products',
      label: 'Ürünler',
      icon: Package,
    },
    {
      id: 'stock',
      label: 'Stok',
      icon: Boxes,
    },
    {
      id: 'expenses',
      label: 'Giderler',
      icon: TrendingDown,
    },
    {
      id: 'reports',
      label: 'Raporlar',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="sticky bottom-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 transition-colors shadow-lg shrink-0 select-none pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-6 h-16 items-center px-1 max-w-lg mx-auto sm:max-w-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'reports' && (activeTab === 'dashboard' || activeTab === 'sales'));

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center min-h-[50px] py-1 transition-all rounded-xl ${
                isActive
                  ? tab.id === 'expenses'
                    ? 'text-rose-600 dark:text-rose-400 font-black'
                    : 'text-emerald-600 dark:text-emerald-400 font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
              }`}
              aria-label={tab.label}
            >
              {/* Active Tab subtle pill indicator */}
              <div
                className={`relative flex items-center justify-center w-10 sm:w-12 h-7.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? tab.id === 'expenses'
                      ? 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[2]'
                  }`}
                />

                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white px-1 shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] sm:text-xs tracking-tight mt-0.5 truncate leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
