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
    <nav className="sticky bottom-0 z-40 w-full bg-[#fffdf5]/94 dark:bg-[#171914]/96 backdrop-blur-2xl border-t border-[#d8d3c4] dark:border-[#34382b] transition-colors shadow-[0_-6px_24px_rgba(30,32,20,0.12)] shrink-0 select-none pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-6 h-16 items-center px-1.5 max-w-lg mx-auto sm:max-w-none">
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
              className={`relative flex flex-col items-center justify-center min-h-[52px] py-1 transition-all rounded-2xl active:scale-95 ${
                isActive
                  ? tab.id === 'expenses'
                    ? 'text-[#a16207] dark:text-[#facc15] font-extrabold'
                    : 'text-[#4d7c0f] dark:text-[#bef264] font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
              }`}
              aria-label={tab.label}
            >
              {/* Active Tab indicator pill */}
              <div
                className={`relative flex items-center justify-center w-11 sm:w-14 h-8 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? tab.id === 'expenses'
                      ? 'bg-yellow-400/10 text-[#a16207] dark:text-[#facc15] ring-1 ring-yellow-400/25 shadow-xs'
                      : 'bg-lime-400/10 text-[#4d7c0f] dark:text-[#bef264] ring-1 ring-lime-400/25 shadow-xs'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[2]'
                  }`}
                />

                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white px-1 shadow-sm ring-2 ring-white dark:ring-slate-950">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] sm:text-xs tracking-tight mt-1 truncate leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
