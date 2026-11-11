import React, { useMemo, useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { WEEKDAY_LABELS, fullDateFormatter } from './PurchaseCalendar';

export interface LedgerEvent {
  type: 'Veresiye' | 'Tahsilat';
  date: string;
  dateKey: string;
  customer: string;
  detail: string;
  amount: number;
}

interface LedgerCalendarProps {
  monthKey: string;
  events: LedgerEvent[];
  currency: string;
}

type DayStatus = 'credit' | 'collection' | 'both' | 'none';

const STATUS_CLASSES: Record<DayStatus, string> = {
  credit: 'bg-amber-700 text-white',
  collection: 'bg-emerald-700 text-white',
  both: 'bg-[linear-gradient(135deg,#b45309_50%,#047857_50%)] text-white',
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400',
};

const STATUS_MARKERS: Record<DayStatus, string> = { credit: 'V', collection: 'T', both: 'V+T', none: '' };

const TYPE_BADGE_CLASSES: Record<LedgerEvent['type'], string> = {
  Veresiye: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Tahsilat: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
};

const EventRow: React.FC<{ event: LedgerEvent; currency: string; showDate?: boolean }> = ({ event, currency, showDate = false }) => (
  <li className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-950">
    <span className={`rounded-lg px-2 py-1 font-black ${TYPE_BADGE_CLASSES[event.type]}`}>{event.type}</span>
    <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
      {showDate && `${formatDate(event.date)} · `}{event.customer} · {event.detail}
    </span>
    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(event.amount, currency)}</span>
  </li>
);

export const LedgerCalendar: React.FC<LedgerCalendarProps> = ({ monthKey, events, currency }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { cells, counts } = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const counts = { credit: 0, collection: 0, both: 0 };

    const dayCells = Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      const dateKey = `${monthKey}-${String(dayNumber).padStart(2, '0')}`;
      const dayEvents = events.filter((event) => event.dateKey === dateKey);
      const creditCount = dayEvents.filter((event) => event.type === 'Veresiye').length;
      const collectionCount = dayEvents.length - creditCount;
      const status: DayStatus = creditCount && collectionCount ? 'both' : creditCount ? 'credit' : collectionCount ? 'collection' : 'none';
      if (creditCount) counts.credit += 1;
      if (collectionCount) counts.collection += 1;
      if (status === 'both') counts.both += 1;
      const summary = [creditCount && `${creditCount} veresiye`, collectionCount && `${collectionCount} tahsilat`].filter(Boolean).join(', ');
      return { dayNumber, dateKey, dayEvents, status, label: fullDateFormatter.format(new Date(year, month - 1, dayNumber)), summary };
    });

    return { cells: [...Array.from({ length: leadingBlanks }, () => null), ...dayCells], counts };
  }, [monthKey, events]);

  const selectedCell = cells.find((cell) => cell?.dateKey === selectedDate && cell.dayEvents.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1 [print-color-adjust:exact]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-0.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <span key={`blank-${index}`} aria-hidden="true" />;
          const cellClasses = `flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg tabular-nums ${STATUS_CLASSES[cell.status]}`;
          if (cell.status !== 'none') {
            const isSelected = cell.dateKey === selectedDate;
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : cell.dateKey)}
                aria-pressed={isSelected}
                aria-label={`${cell.label}: ${cell.summary}`}
                className={`${cellClasses} ${isSelected ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900' : ''}`}
              >
                <span className="text-xs font-black leading-none">{cell.dayNumber}</span>
                <span className="text-[10px] font-bold leading-none">{STATUS_MARKERS[cell.status]}</span>
              </button>
            );
          }
          return (
            <span key={cell.dateKey} role="img" aria-label={`${cell.label}: hareket yok`} className={cellClasses}>
              <span className="text-xs font-black leading-none">{cell.dayNumber}</span>
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 [print-color-adjust:exact]">
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.credit}`} aria-hidden="true" />V: Veresiye ({counts.credit} gün)</span>
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.collection}`} aria-hidden="true" />T: Tahsilat ({counts.collection} gün)</span>
        {counts.both > 0 && (
          <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.both}`} aria-hidden="true" />Aynı gün ikisi de</span>
        )}
        <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${STATUS_CLASSES.none}`} aria-hidden="true" />Hareket yok</span>
      </div>

      <div aria-live="polite" className="print:hidden rounded-lg border border-slate-200/80 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        {selectedCell ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-black text-slate-800 dark:text-slate-100">{selectedCell.label}</span>
            <ul className="flex flex-col gap-1.5">
              {selectedCell.dayEvents.map((event, index) => (
                <EventRow key={`${event.type}-${event.date}-${index}`} event={event} currency={currency} />
              ))}
            </ul>
          </div>
        ) : (
          'Renkli bir güne basınca o günün hareketleri görünür.'
        )}
      </div>

      <ul className="hidden flex-col gap-1.5 print:flex">
        {events.map((event, index) => (
          <EventRow key={`${event.type}-${event.date}-${index}`} event={event} currency={currency} showDate />
        ))}
      </ul>
    </div>
  );
};
