import React, { useState } from 'react';
import { X, Bell, AlertTriangle, Clock, Sparkles, Check, CheckCheck, Trash2 } from 'lucide-react';
import { AppNotification } from '../types';
import { formatDateTime } from '../utils/formatters';

interface NotificationModalProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNavigateTab: (tab: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'stock' | 'debt'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'stock') return n.type === 'stock_alert';
    if (filter === 'debt') return n.type === 'debt_reminder';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'debt_reminder':
        return <Clock className="w-4 h-4 text-indigo-500" />;
      case 'milestone':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Uygulama Bildirimleri
            </h2>
            <span className="text-xs text-slate-500">
              ({notifications.filter((n) => !n.isRead).length} okunmamış)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Quick Actions */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/30 dark:bg-slate-900">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => setFilter('stock')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === 'stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Kritik Stok
            </button>
            <button
              type="button"
              onClick={() => setFilter('debt')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === 'debt'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Veresiye
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Tümünü Okundu İşaretle"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Tümünü Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Henüz bir bildirim bulunmuyor.
            </div>
          ) : (
            filtered.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl flex items-start gap-3 transition-colors ${
                  notif.isRead
                    ? 'opacity-70 hover:opacity-100'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatDateTime(notif.createdAt).split(' ')[1] || ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    {notif.actionTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab(notif.actionTab!);
                          onMarkRead(notif.id);
                          onClose();
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                      >
                        Görüntüle →
                      </button>
                    )}
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(notif.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Okundu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
