import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../utils/formatters';

export interface PurchaseDayTotal {
  date: string;
  quantity: number;
  amount: number;
  orders: number;
}

interface PurchaseCalendarProps {
  monthKey: string;
  days: PurchaseDayTotal[];
  scopeStartKey: string | null;
  scopeEndKey: string;
  currency: string;
}

type DayStatus = 'purchased' | 'none' | 'outside';

export const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(2024, 0, 1 + index)),
);

export const fullDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const STATUS_CLASSES: Record<DayStatus, string> = {
  purchased: 'bg-emerald-700 text-white dark:bg-emerald-600',
  none: 'bg-red-200 text-red-800 dark:bg-red-950/70 dark:text-red-300',
  outside: 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500',
};

export const PurchaseCalendar: React.FC<PurchaseCalendarProps> = ({ monthKey, days, scopeStartKey, scopeEndKey, currency }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { cells, counts } = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const totalsByDate = new Map(days.map((day) => [day.date, day]));
    const counts: Record<DayStatus, number> = { purchased: 0, none: 0, outside: 0 };

    const dayCells = Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      const dateKey = `${monthKey}-${String(dayNumber).padStart(2, '0')}`;
      const total = totalsByDate.get(dateKey);
      const isOutsideScope = (scopeStartKey !== null && dateKey < scopeStartKey) || dateKey > scopeEndKey;
      const status: DayStatus = total ? 'purchased' : isOutsideScope ? 'outside' : 'none';
      counts[status] += 1;
      return { dayNumber, dateKey, total, status, label: fullDateFormatter.format(new Date(year, month - 1, dayNumber)) };
    });

    return { cells: [...Array.from({ length: leadingBlanks }, () => null), ...dayCells], counts };
  }, [monthKey, days, scopeStartKey, scopeEndKey]);

  const selectedDay = days.find((day) => day.date === selectedDate);
  const selectedLabel = cells.find((cell) => cell?.dateKey === selectedDate)?.label;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1 [print-color-adjust:exact]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-0.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <span key={`blank-${index}`} aria-hidden="true" />;
          const cellClasses = `flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg tabular-nums ${STATUS_CLASSES[cell.status]}`;
          if (cell.total) {
            const isSelected = cell.dateKey === selectedDate;
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : cell.dateKey)}
                aria-pressed={isSelected}
                aria-label={`${cell.label}: ${cell.total.quantity} adet, ${formatCurrency(cell.total.amount, currency)}`}
                className={`${cellClasses} ${isSelected ? 'ring-2 ring-emerald-900 ring-offset-1 dark:ring-emerald-200 dark:ring-offset-slate-900' : ''}`}
              >
                <span className="text-xs font-black leading-none">{cell.dayNumber}</span>
                <span className="text-[10px] font-bold leading-none">{cell.total.quantity}</span>
              </button>
            );
          }
          return (
            <span
              key={cell.dateKey}
              role="img"
              aria-label={`${cell.label}: ${cell.status === 'none' ? 'alışveriş yok' : 'rapor aralığı dışında'}`}
              className={cellClasses}
            >
              <span className="text-xs font-black leading-none">{cell.dayNumber}</span>
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 [print-color-adjust:exact]">
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.purchased}`} aria-hidden="true" />Alışveriş var ({counts.purchased} gün)</span>
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.none}`} aria-hidden="true" />Alışveriş yok ({counts.none} gün)</span>
        {counts.outside > 0 && (
          <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.outside}`} aria-hidden="true" />Aralık dışı / gelecek</span>
        )}
      </div>

      <p aria-live="polite" className="print:hidden rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
        {selectedDay ? (
          <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 font-bold tabular-nums">
            <span>{selectedLabel}</span>
            <span className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <span>{selectedDay.quantity} adet</span>
              <span className="text-teal-700 dark:text-teal-300">{formatCurrency(selectedDay.amount, currency)}</span>
            </span>
          </span>
        ) : (
          'Yeşil bir güne basınca o günün adedi ve tutarı görünür.'
        )}
      </p>
    </div>
  );
};
