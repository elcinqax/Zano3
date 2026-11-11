import React, { useEffect, useState } from 'react';
import { Lock, Smartphone, Monitor, Moon, Sun, Clock3 } from 'lucide-react';

interface TopBarProps {
  storeName: string;
  onLockApp: () => void;
  isPinEnabled: boolean;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  screenTopPadding?: 'auto' | 'compact' | 'large' | 'zero';
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  storeName,
  onLockApp,
  isPinEnabled,
  isMobileFrame,
  onToggleMobileFrame,
  activeTab,
  onTabChange,
  screenTopPadding = 'auto',
  themeMode,
  onToggleTheme,
}) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    <header className={`relative w-full bg-white/92 dark:bg-slate-950/94 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-[0_12px_32px_-22px_rgba(15,23,42,0.5)] ${getPaddingTopClass()}`}>

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-[4.25rem] flex items-center justify-between gap-3">
        {/* Zone 1: Brand wordmark & emblem */}
        <div className="min-w-0 flex-1 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className="flex items-center gap-3 text-left group transition-transform active:scale-98"
          >
            <div className="size-10 rounded-[0.9rem] bg-teal-700 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-teal-900/20 ring-4 ring-teal-50 dark:ring-teal-950/40">
              M
            </div>
            <div className="leading-tight">
              <span className="max-w-[11rem] truncate text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                {storeName || 'Almalı Təndiri'}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                Mobil Satış & Kasa
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (hidden on compact mobile thumb zone, visible on desktop/tablet) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Ana menü">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm transition-all active:scale-95 ${
              activeTab === 'pos'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 ring-1 ring-teal-200/80 dark:ring-teal-800/60 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
            }`}
          >
            1. Satış
          </button>
          <button
            type="button"
            onClick={() => onTabChange('customers')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm transition-all active:scale-95 ${
              activeTab === 'customers'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 ring-1 ring-teal-200/80 dark:ring-teal-800/60 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
            }`}
          >
            2. Müşteriler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('products')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm transition-all active:scale-95 ${
              activeTab === 'products'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 ring-1 ring-teal-200/80 dark:ring-teal-800/60 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
            }`}
          >
            3. Ürünler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('stock')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm transition-all active:scale-95 ${
              activeTab === 'stock'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 ring-1 ring-teal-200/80 dark:ring-teal-800/60 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
            }`}
          >
            4. Stok
          </button>

        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          <div className="flex h-10 items-center gap-1.5 rounded-2xl bg-teal-50 px-2.5 text-teal-700 shadow-xs ring-1 ring-teal-200/80 transition-colors dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800/60" aria-label="Anlık saat">
            <Clock3 className="size-4 stroke-[2.5]" aria-hidden="true" />
            <span className="font-mono text-[11px] font-black tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <button type="button" onClick={onToggleTheme} className="flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200/80 transition-all hover:bg-teal-100 active:scale-95 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800/60 dark:hover:bg-teal-900/50" title={themeMode === 'dark' ? 'Işık moduna geç' : 'Gece moduna geç'} aria-label={themeMode === 'dark' ? 'Işık moduna geç' : 'Gece moduna geç'}>
            {themeMode === 'dark' ? <Sun className="size-5 stroke-[2.5]" aria-hidden="true" /> : <Moon className="size-5 stroke-[2.5]" aria-hidden="true" />}
          </button>

          {/* Desktop Frame View Toggle */}
          <button
            type="button"
            onClick={onToggleMobileFrame}
            className="hidden lg:flex min-w-[36px] h-9 px-3 items-center gap-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800"
            title="Telefon / Masaüstü Görünümünü Değiştir"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                <span>Geniş Ekran</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                <span>Android Önizleme</span>
              </>
            )}
          </button>



          {/* Lock App */}
          {isPinEnabled && (
            <button
              type="button"
              onClick={onLockApp}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
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
