import React from 'react';
import { Check, Pencil, ShoppingCart } from 'lucide-react';
import { Reminder } from '../types';
import { daysUntil, formatDueDate, getDueLabel } from '../utils/reminders';
import { formatQuantity } from '../utils/sale-returns';

interface ReminderRowProps {
  reminder: Reminder;
  todayKey: string;
  canLoad: boolean;
  isLoaded?: boolean;
  hideCustomer?: boolean;
  onLoad: () => void;
  onComplete: () => void;
  onEdit?: () => void;
}

export const ReminderRow: React.FC<ReminderRowProps> = ({
  reminder,
  todayKey,
  canLoad,
  isLoaded = false,
  hideCustomer = false,
  onLoad,
  onComplete,
  onEdit,
}) => {
  const days = daysUntil(reminder.dueDate, todayKey);
  const isDueNow = days <= 0;

  const chipClass =
    days < 0
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
      : days === 0
      ? 'bg-emerald-600 text-white'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <li
      className={`flex flex-col gap-2 rounded-2xl border p-3 ${
        isDueNow
          ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
          : 'border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {!hideCustomer && (
            <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {reminder.customerName}
            </p>
          )}
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-pretty">
            <span className="font-mono tabular-nums">{formatQuantity(reminder.quantity)}</span> {reminder.unit}
            {' · '}
            {reminder.productName}
          </p>
        </div>
        <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black whitespace-nowrap ${chipClass}`}>
          {getDueLabel(days)}
        </span>
      </div>

      <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 text-pretty">
        {formatDueDate(reminder.dueDate)}
        {reminder.notes ? ` · ${reminder.notes}` : ''}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLoad}
          disabled={!canLoad || isLoaded}
          className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-xs font-bold whitespace-nowrap text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
        >
          {isLoaded ? (
            <Check className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ShoppingCart className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">
            {isLoaded ? 'Sepete eklendi' : canLoad ? 'Sepete ekle' : 'Ürün silinmiş'}
          </span>
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-all hover:border-emerald-500 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Tamamlandı
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Hatırlatıcıyı düzenle: ${reminder.customerName}, ${reminder.productName}`}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-emerald-500 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
};
