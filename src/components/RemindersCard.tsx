import React, { useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Customer, Product, Reminder, ReminderDraft } from '../types';
import { formatDueDate, getPendingReminders, isDue } from '../utils/reminders';
import { formatQuantity } from '../utils/sale-returns';
import { ReminderRow } from './ReminderRow';
import { ReminderFormModal } from './ReminderFormModal';

interface RemindersCardProps {
  reminders: Reminder[];
  customers: Customer[];
  products: Product[];
  todayKey: string;
  defaultCustomerId?: string;
  isReminderInCart: (reminder: Reminder) => boolean;
  onLoad: (reminder: Reminder) => void;
  onAdd: (draft: ReminderDraft) => void;
  onUpdate: (id: string, updates: Partial<Reminder>) => void;
  onDelete: (ids: string[]) => void;
}

export const RemindersCard: React.FC<RemindersCardProps> = ({
  reminders,
  customers,
  products,
  todayKey,
  defaultCustomerId,
  isReminderInCart,
  onLoad,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const pending = useMemo(() => getPendingReminders(reminders), [reminders]);
  const completed = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.status === 'done')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [reminders]
  );
  const dueCount = pending.filter((reminder) => isDue(reminder, todayKey)).length;

  const [isOpen, setIsOpen] = useState<boolean>(dueCount > 0);
  const [isCompletedOpen, setIsCompletedOpen] = useState<boolean>(false);
  const [formTarget, setFormTarget] = useState<Reminder | 'new' | null>(null);

  const editingReminder = formTarget && formTarget !== 'new' ? formTarget : null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <h2>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="reminders-list"
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/70 active:bg-slate-100/70 dark:hover:bg-slate-800/40 dark:active:bg-slate-800/60"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CalendarClock className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">Hatırlatıcılar</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {dueCount > 0 && (
              <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-black text-white">
                {dueCount} günü geldi
              </span>
            )}
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {pending.length}
            </span>
            <ChevronDown
              className={`size-5 text-slate-500 transition-transform duration-300 motion-reduce:transition-none dark:text-slate-400 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </button>
      </h2>

      {isOpen && (
        <div id="reminders-list" className="flex flex-col gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
          {pending.length === 0 ? (
            <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 text-pretty">
              Bekleyen hatırlatıcı yok. Müşterinin istediği ürünü, miktarı ve tarihi kaydedin; günü gelince uygulama
              size hatırlatır.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  todayKey={todayKey}
                  canLoad={products.some((product) => product.id === reminder.productId)}
                  isLoaded={isReminderInCart(reminder)}
                  onLoad={() => onLoad(reminder)}
                  onComplete={() => onUpdate(reminder.id, { status: 'done' })}
                  onEdit={() => setFormTarget(reminder)}
                />
              ))}
            </ul>
          )}

          {completed.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompletedOpen((open) => !open)}
                  aria-expanded={isCompletedOpen}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  <ChevronDown
                    className={`size-4 transition-transform motion-reduce:transition-none ${isCompletedOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Tamamlananlar ({completed.length})</span>
                </button>
                {isCompletedOpen && (
                  <button
                    type="button"
                    onClick={() => onDelete(completed.map((reminder) => reminder.id))}
                    className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Tümünü sil
                  </button>
                )}
              </div>

              {isCompletedOpen && (
                <ul className="flex flex-col gap-2">
                  {completed.map((reminder) => (
                    <li
                      key={reminder.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                          {reminder.customerName} · {formatQuantity(reminder.quantity)} {reminder.unit}{' '}
                          {reminder.productName}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {formatDueDate(reminder.dueDate)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdate(reminder.id, { status: 'pending' })}
                          aria-label={`Geri al: ${reminder.customerName}, ${reminder.productName}`}
                          title="Geri al"
                          className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-emerald-700 dark:hover:bg-slate-700"
                        >
                          <RotateCcw className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete([reminder.id])}
                          aria-label={`Sil: ${reminder.customerName}, ${reminder.productName}`}
                          title="Sil"
                          className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setFormTarget('new')}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-400 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-98 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Hatırlatıcı Ekle</span>
        </button>
      </div>

      {formTarget && (
        <ReminderFormModal
          key={editingReminder ? editingReminder.id : 'new'}
          customers={customers}
          products={products}
          todayKey={todayKey}
          reminder={editingReminder}
          defaultCustomerId={defaultCustomerId}
          onSave={(draft) => {
            if (editingReminder) {
              onUpdate(editingReminder.id, draft);
            } else {
              onAdd(draft);
              setIsOpen(true);
            }
            setFormTarget(null);
          }}
          onDelete={
            editingReminder
              ? () => {
                  onDelete([editingReminder.id]);
                  setFormTarget(null);
                }
              : undefined
          }
          onClose={() => setFormTarget(null)}
        />
      )}
    </section>
  );
};
