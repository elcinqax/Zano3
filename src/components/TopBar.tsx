import React from 'react';
import { Bell, Moon, Sun, Lock, Smartphone, Monitor } from 'lucide-react';
import { AppNotification } from '../types';

interface TopBarProps {
  storeName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onLockApp: () => void;
  isPinEnabled: boolean;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  screenTopPadding?: 'auto' | 'compact' | 'large' | 'zero';
}

export const TopBar: React.FC<TopBarProps> = ({
  storeName,
  isDark,
  onToggleTheme,
  onLockApp,
  isPinEnabled,
  notifications,
  onOpenNotifications,
  isMobileFrame,
  onToggleMobileFrame,
  activeTab,
  onTabChange,
  screenTopPadding = 'auto',
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getPaddingTopClass = () => {
    switch (screenTopPadding) {
      case 'large':
        return 'pt-8 sm:pt-4';
      case 'compact':
        return 'pt-4 sm:pt-2';
      case 'zero':
        return 'pt-0';
      case 'auto':
      default:
        return 'pt-[max(env(safe-area-inset-top,0px),8px)] sm:pt-0';
    }
  };

  return (
    <header className={`w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors ${getPaddingTopClass()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
              M
            </div>
            <div className="leading-tight">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {storeName || 'Almalı Təndiri'}
              </span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Mobil Satış & Kasa
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (hidden on compact mobile thumb zone, visible on desktop/tablet) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-bold text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-sm ${
              activeTab === 'pos' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''
            }`}
          >
            1. Satış
          </button>
          <button
            type="button"
            onClick={() => onTabChange('customers')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-sm ${
              activeTab === 'customers' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''
            }`}
          >
            2. Müşteriler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('products')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-sm ${
              activeTab === 'products' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''
            }`}
          >
            3. Ürünler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('stock')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-sm ${
              activeTab === 'stock' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''
            }`}
          >
            4. Stok
          </button>
          <button
            type="button"
            onClick={() => onTabChange('expenses')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-sm ${
              activeTab === 'expenses' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : ''
            }`}
          >
            5. Giderler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('reports')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-sm ${
              activeTab === 'reports' || activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''
            }`}
          >
            6. Raporlar
          </button>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 ${
              activeTab === 'settings' ? 'text-emerald-600 dark:text-emerald-400 font-bold ring-1 ring-emerald-500' : ''
            }`}
          >
            Yedek & Ayarlar
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Frame View Toggle */}
          <button
            type="button"
            onClick={onToggleMobileFrame}
            className="hidden lg:flex min-w-[36px] h-9 px-3 items-center gap-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
            title="Telefon / Masaüstü Görünümünü Değiştir"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-4 h-4" />
                <span>Geniş Ekran</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                <span>Android Önizleme</span>
              </>
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Bildirimler"
            aria-label="Bildirimler"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white px-1 shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Açık Mod' : 'Karanlık Mod'}
            aria-label="Tema Değiştir"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* Lock App */}
          {isPinEnabled && (
            <button
              type="button"
              onClick={onLockApp}
              className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Uygulamayı Kilitle"
              aria-label="Kilitle"
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
