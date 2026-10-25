import React, { useState } from 'react';
import { Palette, Moon, Sun, Lock, Smartphone, Monitor, Cloud } from 'lucide-react';
import type { ThemeMode } from '../App';

interface TopBarProps {
  storeName: string;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onSelectTheme: (theme: ThemeMode) => void;
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
  themeMode,
  onToggleTheme,
  onSelectTheme,
  onLockApp,
  isPinEnabled,
  isMobileFrame,
  onToggleMobileFrame,
  activeTab,
  onTabChange,
  screenTopPadding = 'auto',
}) => {
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const themeOptions: Array<{ id: ThemeMode; label: string; color: string }> = [
    { id: 'light', label: 'Açık', color: '#f4f1e8' },
    { id: 'dark', label: 'Gece', color: '#0f110d' },
    { id: 'ocean', label: 'Okyanus', color: '#67e8f9' },
    { id: 'plum', label: 'Erik', color: '#e9a8ff' },
    { id: 'forest', label: 'Orman', color: '#86efac' },
    { id: 'sand', label: 'Kum', color: '#fbbf77' },
  ];

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
          {activeTab !== 'pos' && (
            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Ayarlar
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Ayarlar Button - Hidden on sales screen */}
          {activeTab !== 'pos' && (
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`min-h-[38px] px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl font-extrabold text-xs transition-all active:scale-95 border ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-700/60 shadow-xs'
            }`}
            title="Telefona Yedek Al ve WhatsApp'a Gönder"
            aria-label="Yedekleme ve Ayarlar"
          >
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110" />
            <span className="inline font-black">Ayarlar</span>
          </button>
          )}

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

          {/* Theme picker */}
          {activeTab !== 'pos' && <div className="relative">
            <button
              type="button"
              onClick={() => setIsThemePickerOpen((open) => !open)}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Temalar"
              aria-label="Tema seç"
              aria-expanded={isThemePickerOpen}
            >
              <Palette className="w-5 h-5" />
            </button>
            {isThemePickerOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-2xl">
                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Temalar</p>
                <div className="grid grid-cols-2 gap-1">
                  {themeOptions.map((option) => (
                    <button key={option.id} type="button" onClick={() => { onSelectTheme(option.id); setIsThemePickerOpen(false); }} className={`flex items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-bold transition-colors ${themeMode === option.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'}`}>
                      <span className="h-4 w-4 shrink-0 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: option.color }} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>}

          {/* Theme Toggle */}
          {activeTab !== 'pos' && <button
            type="button"
            onClick={onToggleTheme}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
            title={themeMode === 'light' ? 'Karanlık Mod' : 'Açık Mod'}
            aria-label="Tema Değiştir"
          >
            {themeMode === 'light' ? (
              <Moon className="w-5 h-5 text-[#4d7c0f]" />
            ) : (
              <Sun className="w-5 h-5 text-[#bef264]" />
            )}
          </button>}

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
