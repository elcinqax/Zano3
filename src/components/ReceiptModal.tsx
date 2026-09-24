import React from 'react';
import { Printer, Share2, X, CheckCircle2 } from 'lucide-react';
import { Sale, AppSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface ReceiptModalProps {
  sale: Sale;
  settings: AppSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  onClose,
}) => {
  const paymentLabels: Record<string, string> = {
    cash: 'Nakit',
    mixed: 'Karışık Ödeme',
    credit: 'Açık Hesap (Veresiye)',
    transfer: 'Havale / EFT',
    card: 'Kart',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const itemsText = sale.items
      .map((i) => `• ${i.productName} x${i.quantity} = ${formatCurrency(i.total, settings.currency)}`)
      .join('\n');

    let extraNote = '';
    if (sale.paymentMethod === 'mixed') {
      extraNote += `\nTahsilat: Nakit: ${formatCurrency(sale.cashPaid || 0, settings.currency)} + Havale: ${formatCurrency(sale.transferPaid || 0, settings.currency)}`;
    }
    if (sale.customerBalanceDelta && sale.customerBalanceDelta > 0) {
      extraNote += `\nKalan Borç (Veresiye): +${formatCurrency(sale.customerBalanceDelta, settings.currency)}`;
    } else if (sale.customerBalanceDelta && sale.customerBalanceDelta < 0) {
      extraNote += `\nHesaba Avans Aktarılan: ${formatCurrency(Math.abs(sale.customerBalanceDelta), settings.currency)}`;
    }

    const message = `*${settings.storeName || 'Almalı Təndiri'}*
${settings.storeAddress || 'Qax rayon Almalı kəndi, Almalı Təndiri'}
Tel: ${settings.storePhone || '+994 70 749 99 91'}
Fatura No: ${sale.invoiceNo}
Tarih: ${formatDateTime(sale.createdAt)}
Müşteri: ${sale.customerName}
------------------------
${itemsText}
------------------------
Ara Toplam: ${formatCurrency(sale.subtotal, settings.currency)}
${sale.discount > 0 ? `İndirim: -${formatCurrency(sale.discount, settings.currency)}\n` : ''}*Genel Toplam: ${formatCurrency(sale.total, settings.currency)}*
Ödeme: ${paymentLabels[sale.paymentMethod]}${extraNote}
${sale.paymentMethod === 'cash' && sale.changeAmount > 0 ? `Para Üstü: ${formatCurrency(sale.changeAmount, settings.currency)}\n` : ''}
Bizi tercih ettiğiniz için teşekkür ederiz!`;

    const encoded = encodeURIComponent(message);
    const phone = sale.customerPhone?.replace(/\D/g, '') || '';
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('90') ? phone : '90' + phone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Satış Fişi / Makbuz
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

        {/* Thermal Receipt Paper Style Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-200 print:text-black print:bg-white bg-slate-50/50 dark:bg-slate-950/40">
          <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
            <h2 className="text-base font-bold font-sans tracking-tight text-slate-900 dark:text-white uppercase">
              {settings.storeName || 'Almalı Təndiri'}
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed">
              {settings.storeAddress || 'Qax rayon Almalı kəndi, Almalı Təndiri'}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
              Tel: {settings.storePhone || '+994 70 749 99 91'}
            </p>
          </div>

          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Fatura No:</span>
              <span className="font-semibold">{sale.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tarih:</span>
              <span>{formatDateTime(sale.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Müşteri:</span>
              <span className="font-medium truncate max-w-[170px]">{sale.customerName}</span>
            </div>
            {sale.customerPhone && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Telefon:</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 font-semibold mb-2 text-[11px]">
              <span>ÜRÜN</span>
              <div className="flex gap-4">
                <span>AD.</span>
                <span>TUTAR</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {sale.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-[11px]">
                  <div className="pr-2 max-w-[150px]">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{item.productName}</p>
                    <p className="text-[10px] text-slate-400">
                      @{formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center shrink-0">
                    <span className="text-slate-600 dark:text-slate-400 tabular-nums">x{item.quantity}</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Ara Toplam:</span>
              <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>İndirim:</span>
                <span className="tabular-nums">-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1.5 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
              <span>GENEL TOPLAM:</span>
              <span className="tabular-nums">{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Ödeme Yöntemi:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{paymentLabels[sale.paymentMethod]}</span>
            </div>

            {sale.paymentMethod === 'mixed' && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">💵 Nakit:</span>
                  <span className="tabular-nums font-medium">{formatCurrency(sale.cashPaid || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">🏦 Havale / EFT:</span>
                  <span className="tabular-nums font-medium">{formatCurrency(sale.transferPaid || 0)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Toplam Tahsil Edilen:</span>
                  <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.paidAmount)}</span>
                </div>
              </div>
            )}

            {sale.paymentMethod === 'cash' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Alınan Nakit:</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(sale.paidAmount)}</span>
                </div>
                {sale.changeAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Para Üstü:</span>
                    <span className="tabular-nums">{formatCurrency(sale.changeAmount)}</span>
                  </div>
                )}
              </>
            )}

            {/* Customer Account Adjustments */}
            {sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta > 0 && (
              <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-center text-[10px] font-medium font-sans">
                Kalan <strong>{formatCurrency(sale.customerBalanceDelta)}</strong> tutar müşteri veresiye borcuna eklenmiştir.
              </div>
            )}

            {sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta < 0 && (
              <div className="p-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-center text-[10px] font-medium font-sans">
                Fazla verilen <strong>{formatCurrency(Math.abs(sale.customerBalanceDelta))}</strong> tutar müşteri hesabına avans/alacak kaydedilmiştir.
              </div>
            )}

            {sale.paymentMethod === 'credit' && !sale.customerBalanceDelta && (
              <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-center text-[10px] font-medium font-sans">
                Bu tutar müşterinin açık hesap veresiye borcuna kaydedilmiştir.
              </div>
            )}
          </div>

          <div className="pt-4 text-center text-[10px] text-slate-400">
            <p className="font-semibold text-slate-600 dark:text-slate-300">{settings.storeName || 'Almalı Təndiri'}</p>
            <p className="mt-0.5">Mali değeri yoktur · Bilgi fişidir</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
