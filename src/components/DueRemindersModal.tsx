import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Product, Reminder } from '../types';
import { ReminderRow } from './ReminderRow';

interface DueRemindersModalProps {
  reminders: Reminder[];
  products: Product[];
  todayKey: string;
  onLoad: (reminder: Reminder) => void;
  onComplete: (reminder: Reminder) => void;
  onClose: () => void;
}

export const DueRemindersModal: React.FC<DueRemindersModalProps> = ({
  reminders,
  products,
  todayKey,
  onLoad,
  onComplete,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="due-reminders-title"
  >
    <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CalendarClock className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id="due-reminders-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            Hatırlatma
          </h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Günü gelen {reminders.length} sipariş var
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 overflow-y-auto p-4">
        {reminders.map((reminder) => (
          <ReminderRow
            key={reminder.id}
            reminder={reminder}
            todayKey={todayKey}
            canLoad={products.some((product) => product.id === reminder.productId)}
            onLoad={() => onLoad(reminder)}
            onComplete={() => onComplete(reminder)}
          />
        ))}
      </ul>

      <div className="border-t border-slate-100 p-4 pb-[max(env(safe-area-inset-bottom,0px),1rem)] dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="h-11 w-full rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Kapat
        </button>
      </div>
    </div>
  </div>
);
