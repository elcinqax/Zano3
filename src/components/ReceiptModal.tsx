import React, { useState } from 'react';
import { Printer, X, CheckCircle2, Share2, Loader2 } from 'lucide-react';
import type { jsPDF } from 'jspdf';
import { Sale, AppSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { createPdfDocument } from '../utils/pdf-utils';
import { shareOrDownloadBlob } from '../utils/share-utils';
import { getSaleReturns, formatQuantity } from '../utils/sale-returns';

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

  const [isSharing, setIsSharing] = useState(false);
  const money = (amount: number) => formatCurrency(amount, settings.currency);
  const saleReturns = getSaleReturns(sale);

  const handlePrint = () => {
    window.print();
  };

  const buildReceiptPdf = async (): Promise<Blob> => {
    const WIDTH = 80;
    const MARGIN = 5;
    const RIGHT = WIDTH - MARGIN;

    const draw = (doc: jsPDF): number => {
      let y = 9;
      const gap = (size: number) => size * 0.3528 * 1.4;
      const centered = (text: string, size = 9) => {
        doc.setFontSize(size);
        doc.text(text, WIDTH / 2, y, { align: 'center' });
        y += gap(size);
      };
      const wrappedCentered = (text: string, size: number) => {
        doc.setFontSize(size);
        (doc.splitTextToSize(text, WIDTH - MARGIN * 2) as string[]).forEach((line) => {
          doc.text(line, WIDTH / 2, y, { align: 'center' });
          y += gap(size);
        });
      };
      const row = (left: string, right: string, size = 8) => {
        doc.setFontSize(size);
        doc.text(left, MARGIN, y);
        doc.text(right, RIGHT, y, { align: 'right' });
        y += gap(size);
      };
      const divider = () => {
        y -= 1;
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(MARGIN, y, RIGHT, y);
        doc.setLineDashPattern([], 0);
        y += 4;
      };

      centered((settings.storeName || 'Mobil Satış').toUpperCase(), 11);
      if (settings.storeAddress) wrappedCentered(settings.storeAddress, 7.5);
      if (settings.storePhone) centered(`Tel: ${settings.storePhone}`, 7.5);
      y += 1;
      divider();

      row('Fatura No:', sale.invoiceNo);
      row('Tarih:', formatDateTime(sale.createdAt));
      row('Müşteri:', String(doc.splitTextToSize(sale.customerName, 42)[0] ?? ''));
      if (sale.customerPhone) row('Telefon:', sale.customerPhone);
      y += 1;
      divider();

      row('ÜRÜN', 'AD.     TUTAR', 7.5);
      y += 0.5;
      sale.items.forEach((item) => {
        doc.setFontSize(8);
        const nameLines = doc.splitTextToSize(item.productName, 34) as string[];
        nameLines.forEach((line, index) => {
          doc.text(line, MARGIN, y);
          if (index === 0) {
            doc.text(`x${item.quantity}`, 48, y, { align: 'right' });
            doc.text(money(item.total), RIGHT, y, { align: 'right' });
          }
          y += gap(8);
        });
        doc.setFontSize(7);
        doc.text(`@${money(item.unitPrice)}`, MARGIN, y);
        y += gap(7) + 1;
      });
      saleReturns.forEach((item) => {
        row(
          String(doc.splitTextToSize(`İade: ${item.productName}`, 46)[0] ?? ''),
          `-${formatQuantity(item.quantity)} ${item.unit}`
        );
      });
      if (saleReturns.length > 0) y += 1;
      divider();

      row('Ara Toplam:', money(sale.subtotal));
      if (sale.discount > 0) row('İndirim:', `-${money(sale.discount)}`);
      y += 1;
      row('GENEL TOPLAM:', money(sale.total), 10);
      y += 1;
      divider();

      row('Ödeme Yöntemi:', sale.total < 0 ? 'İade' : paymentLabels[sale.paymentMethod] ?? String(sale.paymentMethod));
      if (sale.paymentMethod === 'mixed') {
        row('Nakit:', money(sale.cashPaid || 0), 7.5);
        row('Havale / EFT:', money(sale.transferPaid || 0), 7.5);
        row('Toplam Tahsil Edilen:', money(sale.paidAmount), 7.5);
      }
      if (sale.paymentMethod === 'cash') {
        row('Alınan Nakit:', money(sale.paidAmount));
        if (sale.changeAmount > 0) row('Para Üstü:', money(sale.changeAmount));
      }
      y += 1;
      if (sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta > 0) {
        wrappedCentered(`Kalan ${money(sale.customerBalanceDelta)} tutar müşteri veresiye borcuna eklenmiştir.`, 7);
      } else if (sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta < 0 && sale.total < 0) {
        wrappedCentered(`İade fazlası ${money(Math.abs(sale.customerBalanceDelta))} müşteri hesabına işlenmiştir.`, 7);
      } else if (sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta < 0) {
        wrappedCentered(`Fazla verilen ${money(Math.abs(sale.customerBalanceDelta))} tutar müşteri hesabına avans/alacak kaydedilmiştir.`, 7);
      } else if (sale.paymentMethod === 'credit') {
        wrappedCentered('Bu tutar müşterinin açık hesap veresiye borcuna kaydedilmiştir.', 7);
      }

      y += 2;
      divider();
      centered(settings.storeName || 'Mobil Satış', 8);
      centered('Mali değeri yoktur · Bilgi fişidir', 7);
      return y;
    };

    // Önce ölçüm için uzun bir sayfaya çizip gerçek yüksekliği bulur, sonra tam boyutlu sayfaya çizer.
    const measureDoc = await createPdfDocument({ unit: 'mm', format: [WIDTH, 1500] });
    const height = Math.max(100, draw(measureDoc) + 6);
    const finalDoc = await createPdfDocument({ unit: 'mm', format: [WIDTH, height] });
    draw(finalDoc);
    return finalDoc.output('blob');
  };

  const handleSharePdf = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const blob = await buildReceiptPdf();
      const safeName = sale.invoiceNo.replace(/[^\w.-]+/g, '-');
      const outcome = await shareOrDownloadBlob(blob, `fis-${safeName}.pdf`, {
        title: `Satış Fişi ${sale.invoiceNo}`,
      });
      if (outcome === 'downloaded') {
        window.alert('Bu cihaz paylaşım menüsünü desteklemiyor, PDF indirildi. Dosyalar uygulamasından açabilirsiniz.');
      }
    } catch (error) {
      console.error('Fiş PDF olarak hazırlanamadı:', error);
      window.alert('Fiş PDF olarak hazırlanamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsSharing(false);
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
                      @{money(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center shrink-0">
                    <span className="text-slate-600 dark:text-slate-400 tabular-nums">x{item.quantity}</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {money(item.total)}
                    </span>
                  </div>
                </div>
              ))}
              {saleReturns.map((item) => (
                <div key={`return-${item.productId}`} className="flex justify-between items-start gap-2 text-[11px] text-rose-600 dark:text-rose-400">
                  <p className="min-w-0 truncate font-medium">İade: {item.productName}</p>
                  <span className="shrink-0 font-semibold tabular-nums">
                    −{formatQuantity(item.quantity)} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Ara Toplam:</span>
              <span className="tabular-nums">{money(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>İndirim:</span>
                <span className="tabular-nums">-{money(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1.5 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
              <span>GENEL TOPLAM:</span>
              <span className="tabular-nums">{money(sale.total)}</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Ödeme Yöntemi:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sale.total < 0 ? 'İade' : paymentLabels[sale.paymentMethod]}</span>
            </div>

            {sale.paymentMethod === 'mixed' && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">💵 Nakit:</span>
                  <span className="tabular-nums font-medium">{money(sale.cashPaid || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">🏦 Havale / EFT:</span>
                  <span className="tabular-nums font-medium">{money(sale.transferPaid || 0)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Toplam Tahsil Edilen:</span>
                  <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{money(sale.paidAmount)}</span>
                </div>
              </div>
            )}

            {sale.paymentMethod === 'cash' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Alınan Nakit:</span>
                  <span className="tabular-nums font-semibold">{money(sale.paidAmount)}</span>
                </div>
                {sale.changeAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Para Üstü:</span>
                    <span className="tabular-nums">{money(sale.changeAmount)}</span>
                  </div>
                )}
              </>
            )}

            {/* Customer Account Adjustments */}
            {sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta > 0 && (
              <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-center text-[10px] font-medium font-sans">
                Kalan <strong>{money(sale.customerBalanceDelta)}</strong> tutar müşteri veresiye borcuna eklenmiştir.
              </div>
            )}

            {sale.customerBalanceDelta !== undefined && sale.customerBalanceDelta < 0 && (
              <div className="p-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-center text-[10px] font-medium font-sans">
                {sale.total < 0 ? 'İade fazlası' : 'Fazla verilen'} <strong>{money(Math.abs(sale.customerBalanceDelta))}</strong> {sale.total < 0 ? 'müşteri hesabına işlenmiştir.' : 'tutar müşteri hesabına avans/alacak kaydedilmiştir.'}
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
            onClick={handlePrint}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır</span>
          </button>
          <button
            type="button"
            onClick={handleSharePdf}
            disabled={isSharing}
            className="h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span>PDF Paylaş</span>
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
