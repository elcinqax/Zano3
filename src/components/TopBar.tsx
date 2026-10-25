import React, { useState } from 'react';
import { Lock, Smartphone, Monitor } from 'lucide-react';

interface TopBarProps {
  storeName: string;
  onLockApp: () => void;
  isPinEnabled: boolean;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  screenTopPadding?: 'auto' | 'compact' | 'large' | 'zero';
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
}) => {
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
    <header className={`w-full bg-[#fffdf5]/92 dark:bg-[#171914]/94 backdrop-blur-xl border-b border-[#d8d3c4] dark:border-[#34382b] transition-colors shadow-[0_4px_18px_rgba(30,32,20,0.08)] ${getPaddingTopClass()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand wordmark & emblem */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className="flex items-center gap-3 text-left group transition-transform active:scale-98"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#bef264] dark:bg-[#365314] text-[#1a2410] dark:text-[#bef264] flex items-center justify-center font-black text-xl shadow-md shadow-lime-900/25 ring-1 ring-white/20">
              M
            </div>
            <div className="leading-tight">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {storeName || 'Almalı Təndiri'}
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
                Mobil Satış & Kasa
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (hidden on compact mobile thumb zone, visible on desktop/tablet) */}
        <nav className="hidden md:flex items-center p-1 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            1. Satış
          </button>
          <button
            type="button"
            onClick={() => onTabChange('customers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'customers'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            2. Müşteriler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('products')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            3. Ürünler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'stock'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            4. Stok
          </button>

        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Desktop Frame View Toggle */}
          <button
            type="button"
            onClick={onToggleMobileFrame}
            className="hidden lg:flex min-w-[36px] h-9 px-3 items-center gap-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800"
            title="Telefon / Masaüstü Görünümünü Değiştir"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Geniş Ekran</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
