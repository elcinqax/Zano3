import React, { useId, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Customer, Product, Reminder, ReminderDraft } from '../types';
import { addDays, formatDueDate } from '../utils/reminders';

interface ReminderFormModalProps {
  customers: Customer[];
  products: Product[];
  todayKey: string;
  reminder?: Reminder | null;
  defaultCustomerId?: string;
  onSave: (draft: ReminderDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const FIELD_CLASS =
  'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL_CLASS = 'block mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300';

export const ReminderFormModal: React.FC<ReminderFormModalProps> = ({
  customers,
  products,
  todayKey,
  reminder,
  defaultCustomerId,
  onSave,
  onDelete,
  onClose,
}) => {
  const fieldId = useId();
  const hasKnownCustomer = Boolean(reminder?.customerId && customers.some((c) => c.id === reminder.customerId));

  const [customerId, setCustomerId] = useState<string>(
    reminder ? (hasKnownCustomer ? reminder.customerId ?? '' : '') : defaultCustomerId ?? ''
  );
  const [customerName, setCustomerName] = useState<string>(reminder && !hasKnownCustomer ? reminder.customerName : '');
  const [productId, setProductId] = useState<string>(reminder?.productId ?? '');
  const [quantity, setQuantity] = useState<string>(reminder ? String(reminder.quantity) : '');
  const [dueDate, setDueDate] = useState<string>(reminder?.dueDate ?? addDays(todayKey, 1));
  const [notes, setNotes] = useState<string>(reminder?.notes ?? '');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [customers]
  );
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [products]
  );

  const selectedProduct = products.find((p) => p.id === productId);
  const isRemovedProduct = Boolean(reminder && reminder.productId === productId && !selectedProduct);
  const productName = selectedProduct?.name ?? (isRemovedProduct ? reminder?.productName ?? '' : '');
  const unit = selectedProduct?.unit ?? (isRemovedProduct ? reminder?.unit ?? 'Adet' : 'Adet');
  const parsedQuantity = parseFloat(quantity.replace(',', '.'));
  const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const isValid = Boolean(productName) && Number.isFinite(parsedQuantity) && parsedQuantity > 0 && hasValidDate;

  const quickDates = [
    { label: 'Bugün', value: todayKey },
    { label: 'Yarın', value: addDays(todayKey, 1) },
    { label: '1 Hafta', value: addDays(todayKey, 7) },
  ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    const customer = customers.find((c) => c.id === customerId);
    onSave({
      customerId: customer?.id,
      customerName: customer?.name ?? (customerName.trim() || 'Genel Müşteri'),
      productId,
      productName,
      unit,
      quantity: parsedQuantity,
      dueDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${fieldId}-title`}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full max-h-[92vh] overflow-y-auto p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 id={`${fieldId}-title`} className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {reminder ? 'Hatırlatıcıyı Düzenle' : 'Yeni Hatırlatıcı'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor={`${fieldId}-customer`} className={LABEL_CLASS}>
              Müşteri
            </label>
            <select
              id={`${fieldId}-customer`}
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Kayıtlı değil (adını yazın)</option>
              {sortedCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {!customerId && (
            <div>
              <label htmlFor={`${fieldId}-customer-name`} className={LABEL_CLASS}>
                Müşteri adı <span className="font-normal text-slate-400">(isteğe bağlı)</span>
              </label>
              <input
                id={`${fieldId}-customer-name`}
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ahmet Yılmaz"
                className={FIELD_CLASS}
              />
            </div>
          )}

          <div>
            <label htmlFor={`${fieldId}-product`} className={LABEL_CLASS}>
              Ürün *
            </label>
            <select
              id={`${fieldId}-product`}
              required
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Ürün seçin</option>
              {isRemovedProduct && reminder && (
                <option value={reminder.productId}>{reminder.productName} (silinmiş)</option>
              )}
              {sortedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${fieldId}-quantity`} className={LABEL_CLASS}>
              Miktar ({unit}) *
            </label>
            <input
              id={`${fieldId}-quantity`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="20"
              className={`${FIELD_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-date`} className={LABEL_CLASS}>
              Hatırlatma tarihi *
            </label>
            <input
              id={`${fieldId}-date`}
              type="date"
              required
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={FIELD_CLASS}
            />
            <div className="mt-2 flex gap-2">
              {quickDates.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setDueDate(option.value)}
                  aria-pressed={dueDate === option.value}
                  className={`h-9 flex-1 rounded-xl border text-xs font-bold transition-colors ${
                    dueDate === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {hasValidDate && (
              <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{formatDueDate(dueDate)}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${fieldId}-notes`} className={LABEL_CLASS}>
              Not <span className="font-normal text-slate-400">(isteğe bağlı)</span>
            </label>
            <input
              id={`${fieldId}-notes`}
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Sabah erkenden alacak"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kaydet
            </button>
          </div>

          {reminder && onDelete && (
            <button
              type="button"
              onClick={() => (isConfirmingDelete ? onDelete() : setIsConfirmingDelete(true))}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
                isConfirmingDelete
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30'
              }`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span>{isConfirmingDelete ? 'Silmek için tekrar dokunun' : 'Hatırlatıcıyı sil'}</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
