import type { jsPDF } from 'jspdf';
import { createPdfDocument } from './pdf-utils';
import { formatCurrency, formatDate } from './formatters';
import { formatQuantity, getSaleReturns } from './sale-returns';
import type { CustomerPayment, PaymentMethod, Product, Sale } from '../types';

export interface SalesStatementPdfInput {
  storeName: string;
  customerName: string;
  customerPhone?: string;
  /** Current balance of the selected customer; positive means the customer owes the store. */
  customerBalance?: number;
  /** Adds the customer name to every row when the report covers more than one customer. */
  showCustomerNames: boolean;
  periodLabel: string;
  filterNotes: string[];
  sales: Sale[];
  /** Debt collections recorded outside a sale ("Tahsilat Al") for the same customer and period. */
  payments: CustomerPayment[];
  products: Product[];
  currency: string;
}

type Rgb = [number, number, number];

interface Column {
  title: string;
  width: number;
  align: 'left' | 'right';
}

interface CellLine {
  text: string;
  color: Rgb;
}

type Row = CellLine[][];

const MARGIN = 14;
const CONTENT_WIDTH = 182;
const PAGE_TOP = 16;
const PAGE_BOTTOM = 282;
const FOOTER_BASELINE = 291;

const TABLE_HEADER_HEIGHT = 7;
const TABLE_HEADER_BASELINE = 4.7;
const CELL_PADDING = 2;
const LINE_HEIGHT = 4;
const FIRST_LINE_BASELINE = 4.6;
const ROW_EXTRA_HEIGHT = 3;
const BODY_SIZE = 8;
const SECTION_GAP = 9;
const SUMMARY_LABEL_WIDTH = 28;

const TEAL: Rgb = [15, 118, 110];
const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const AMBER: Rgb = [180, 83, 9];
const ROSE: Rgb = [190, 18, 60];
const STRIPE: Rgb = [241, 245, 249];
const BORDER: Rgb = [203, 213, 225];

const SALE_COLUMNS: Column[] = [
  { title: 'Tarih', width: 24, align: 'left' },
  { title: 'Fiş', width: 28, align: 'left' },
  { title: 'Ürünler', width: 62, align: 'left' },
  { title: 'Ödeme', width: 20, align: 'left' },
  { title: 'Tutar', width: 24, align: 'right' },
  { title: 'Tahsilat', width: 24, align: 'right' },
];

const PRODUCT_COLUMNS: Column[] = [
  { title: 'Ürün', width: 98, align: 'left' },
  { title: 'Adet', width: 26, align: 'right' },
  { title: 'İade', width: 26, align: 'right' },
  { title: 'Tutar', width: 32, align: 'right' },
];

const PAYMENT_COLUMNS: Column[] = [
  { title: 'Tarih', width: 24, align: 'left' },
  { title: 'Açıklama', width: 110, align: 'left' },
  { title: 'Ödeme', width: 24, align: 'left' },
  { title: 'Tahsilat', width: 24, align: 'right' },
];

const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

// DejaVu Sans has no manat glyph; swapping it here keeps measured widths equal to what is drawn.
const createMoneyFormatter = (currency: string) => (amount: number): string =>
  formatCurrency(amount, currency).replace(/\u20BC/g, 'AZN');

const getMethodLabel = (method: PaymentMethod): string => {
  if (method === 'cash') return 'Nakit';
  if (method === 'mixed') return 'Karışık';
  if (method === 'credit') return 'Veresiye';
  if (method === 'transfer') return 'Havale';
  return 'Kart';
};

const getSalePaymentLabel = (sale: Sale): string => (sale.total < 0 ? 'İade' : getMethodLabel(sale.paymentMethod));

/**
 * Money taken at the till for a sale: the sale total minus the part written to the customer's
 * account. A negative account change (overpayment against old debt) raises it above the total.
 */
const getSaleCollectedAmount = (sale: Sale): number => {
  const paid = sale.paidAmount || (sale.cashPaid ?? 0) + (sale.transferPaid ?? 0);
  // Sales without a stored account change follow the rule sqliteStorage.updateSale uses.
  const fallbackDebt = sale.paymentMethod === 'credit' ? sale.total : sale.paymentMethod === 'mixed' ? sale.total - paid : 0;
  return Number((sale.total - (sale.customerBalanceDelta ?? fallbackDebt)).toFixed(2));
};

const getBalanceLabel = (balance: number, money: (amount: number) => string): string => {
  if (balance > 0) return `Güncel borç: ${money(balance)}`;
  if (balance < 0) return `Güncel avans: ${money(Math.abs(balance))}`;
  return 'Borç yok';
};

const fitFontSize = (doc: jsPDF, text: string, maxWidth: number, size: number): void => {
  let fitted = size;
  doc.setFontSize(fitted);
  while (fitted > 6 && doc.getTextWidth(text) > maxWidth) {
    fitted -= 0.5;
    doc.setFontSize(fitted);
  }
};

const wrapCell = (doc: jsPDF, text: string, column: Column, color: Rgb): CellLine[] => {
  doc.setFontSize(BODY_SIZE);
  const lines = doc.splitTextToSize(text, column.width - CELL_PADDING * 2) as string[];
  return lines.map((line) => ({ text: line, color }));
};

const buildDateCell = (doc: jsPDF, isoDate: string, column: Column, color: Rgb): CellLine[] => {
  const date = new Date(isoDate);
  return [
    ...wrapCell(doc, formatDate(isoDate), column, color),
    ...(Number.isNaN(date.getTime()) ? [] : wrapCell(doc, timeFormatter.format(date), column, MUTED)),
  ];
};

const getRowHeight = (row: Row): number =>
  Math.max(1, ...row.map((cell) => cell.length)) * LINE_HEIGHT + ROW_EXTRA_HEIGHT;

const getColumnTextX = (column: Column, left: number): number =>
  column.align === 'right' ? left + column.width - CELL_PADDING : left + CELL_PADDING;

const drawTableHeader = (doc: jsPDF, columns: Column[], y: number): number => {
  doc.setFillColor(...TEAL);
  doc.rect(MARGIN, y, CONTENT_WIDTH, TABLE_HEADER_HEIGHT, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(BODY_SIZE);
  let left = MARGIN;
  columns.forEach((column) => {
    doc.text(column.title, getColumnTextX(column, left), y + TABLE_HEADER_BASELINE, { align: column.align });
    left += column.width;
  });
  return y + TABLE_HEADER_HEIGHT;
};

/** Draws the rows under a header that repeats on every page and returns the y position below the table. */
const drawTable = (doc: jsPDF, columns: Column[], rows: Row[], startY: number): number => {
  let y = drawTableHeader(doc, columns, startY);
  rows.forEach((row, rowIndex) => {
    const height = getRowHeight(row);
    if (y + height > PAGE_BOTTOM) {
      doc.addPage();
      y = drawTableHeader(doc, columns, PAGE_TOP);
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(...STRIPE);
      doc.rect(MARGIN, y, CONTENT_WIDTH, height, 'F');
    }
    doc.setFontSize(BODY_SIZE);
    let left = MARGIN;
    row.forEach((cell, columnIndex) => {
      const column = columns[columnIndex];
      cell.forEach((line, lineIndex) => {
        doc.setTextColor(...line.color);
        doc.text(line.text, getColumnTextX(column, left), y + FIRST_LINE_BASELINE + lineIndex * LINE_HEIGHT, {
          align: column.align,
        });
      });
      left += column.width;
    });
    y += height;
  });
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  return y;
};

/** Draws a titled table below `startY`, moving to a new page when the title would be left alone at the bottom. */
const drawSection = (doc: jsPDF, title: string, columns: Column[], rows: Row[], startY: number): number => {
  let y = startY + SECTION_GAP;
  if (y + 4 + TABLE_HEADER_HEIGHT + getRowHeight(rows[0]) > PAGE_BOTTOM) {
    doc.addPage();
    y = PAGE_TOP + 4;
  }
  doc.setTextColor(...INK);
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  return drawTable(doc, columns, rows, y + 4);
};

const drawSummaryBand = (
  doc: jsPDF,
  y: number,
  height: number,
  label: string,
  summary: string,
  colors: { fill: Rgb; label: Rgb; summary: Rgb },
): void => {
  doc.setFillColor(...colors.fill);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 2, 2, 'F');
  doc.setTextColor(...colors.label);
  doc.setFontSize(8);
  doc.text(label, MARGIN + 4, y + height / 2 + 1.4);
  doc.setTextColor(...colors.summary);
  fitFontSize(doc, summary, CONTENT_WIDTH - SUMMARY_LABEL_WIDTH, 11);
  doc.text(summary, MARGIN + CONTENT_WIDTH - 4, y + height / 2 + 1.7, { align: 'right' });
};

const buildSaleRow = (
  doc: jsPDF,
  sale: Sale,
  input: SalesStatementPdfInput,
  money: (amount: number) => string,
): Row => {
  const [dateColumn, invoiceColumn, itemsColumn, paymentColumn, totalColumn, collectedColumn] = SALE_COLUMNS;
  const isCancelled = sale.status === 'cancelled';
  const textColor = isCancelled ? MUTED : INK;
  const balanceDelta = sale.customerBalanceDelta ?? 0;
  const collected = isCancelled ? 0 : getSaleCollectedAmount(sale);

  return [
    buildDateCell(doc, sale.createdAt, dateColumn, textColor),
    [
      ...wrapCell(doc, sale.invoiceNo, invoiceColumn, textColor),
      ...(input.showCustomerNames ? wrapCell(doc, sale.customerName, invoiceColumn, MUTED) : []),
    ],
    [
      ...sale.items.flatMap((item) =>
        wrapCell(
          doc,
          `${item.productName} · ${formatQuantity(item.quantity)} × ${money(item.unitPrice)} = ${money(item.total)}`,
          itemsColumn,
          textColor,
        ),
      ),
      ...getSaleReturns(sale, input.products).flatMap((returned) =>
        wrapCell(
          doc,
          `İade: ${returned.productName} · ${formatQuantity(returned.quantity)} ${returned.unit}`,
          itemsColumn,
          isCancelled ? MUTED : AMBER,
        ),
      ),
      ...(balanceDelta > 0 ? wrapCell(doc, `Borca eklendi: ${money(balanceDelta)}`, itemsColumn, isCancelled ? MUTED : AMBER) : []),
      ...(balanceDelta < 0 ? wrapCell(doc, `Hesaptan düşüldü: ${money(Math.abs(balanceDelta))}`, itemsColumn, MUTED) : []),
    ],
    [
      ...wrapCell(doc, getSalePaymentLabel(sale), paymentColumn, textColor),
      ...(isCancelled ? wrapCell(doc, 'İptal edildi', paymentColumn, ROSE) : []),
    ],
    wrapCell(doc, money(sale.total), totalColumn, textColor),
    collected === 0
      ? wrapCell(doc, '-', collectedColumn, MUTED)
      : wrapCell(doc, money(collected), collectedColumn, TEAL),
  ];
};

const buildPaymentRow = (
  doc: jsPDF,
  payment: CustomerPayment,
  showCustomerNames: boolean,
  money: (amount: number) => string,
): Row => {
  const [dateColumn, noteColumn, methodColumn, amountColumn] = PAYMENT_COLUMNS;
  const note = payment.notes?.trim() || (payment.amount < 0 ? 'Borç eklendi' : 'Tahsilat alındı');

  return [
    buildDateCell(doc, payment.createdAt, dateColumn, INK),
    [
      ...wrapCell(doc, note, noteColumn, INK),
      ...(showCustomerNames ? wrapCell(doc, payment.customerName, noteColumn, MUTED) : []),
    ],
    wrapCell(doc, getMethodLabel(payment.paymentMethod), methodColumn, INK),
    wrapCell(doc, money(payment.amount), amountColumn, payment.amount < 0 ? AMBER : TEAL),
  ];
};

const buildProductRows = (
  doc: jsPDF,
  sales: Sale[],
  products: Product[],
  money: (amount: number) => string,
): Row[] => {
  const totals = new Map<string, { quantity: number; returned: number; amount: number }>();
  const getTotals = (productName: string) => {
    const existing = totals.get(productName);
    if (existing) return existing;
    const created = { quantity: 0, returned: 0, amount: 0 };
    totals.set(productName, created);
    return created;
  };

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const productTotals = getTotals(item.productName);
      productTotals.quantity += item.quantity;
      productTotals.amount += item.total;
    });
    getSaleReturns(sale, products).forEach((returned) => {
      getTotals(returned.productName).returned += returned.quantity;
    });
  });

  const [nameColumn, quantityColumn, returnedColumn, amountColumn] = PRODUCT_COLUMNS;
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(([productName, productTotals]) => [
      wrapCell(doc, productName, nameColumn, INK),
      wrapCell(doc, formatQuantity(productTotals.quantity), quantityColumn, INK),
      wrapCell(doc, productTotals.returned > 0 ? formatQuantity(productTotals.returned) : '-', returnedColumn, productTotals.returned > 0 ? AMBER : MUTED),
      wrapCell(doc, money(productTotals.amount), amountColumn, INK),
    ]);
};

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }): number =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

export const buildSalesStatementPdf = async (input: SalesStatementPdfInput): Promise<Blob> => {
  const doc = await createPdfDocument();
  const money = createMoneyFormatter(input.currency);
  const sales = [...input.sales].sort(byCreatedAt);
  const payments = [...input.payments].sort(byCreatedAt);
  const completedSales = sales.filter((sale) => sale.status === 'completed');
  const cancelledCount = sales.length - completedSales.length;
  const totalQuantity = completedSales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const totalReturned = completedSales.reduce(
    (sum, sale) => sum + getSaleReturns(sale, input.products).reduce((returnSum, returned) => returnSum + returned.quantity, 0),
    0,
  );
  const totalAmount = completedSales.reduce((sum, sale) => sum + sale.total, 0);
  const collectedInSales = completedSales.reduce((sum, sale) => sum + getSaleCollectedAmount(sale), 0);
  const collectedAsPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

  let y = PAGE_TOP;
  doc.setTextColor(...MUTED);
  doc.setFontSize(8.5);
  doc.text(input.storeName, MARGIN, y);
  doc.text(`Rapor tarihi: ${formatDate(new Date().toISOString())}`, MARGIN + CONTENT_WIDTH, y, { align: 'right' });

  y += 9;
  doc.setTextColor(...INK);
  doc.setFontSize(17);
  const customerTitle = String(doc.splitTextToSize(input.customerName, CONTENT_WIDTH)[0] ?? '');
  doc.text(customerTitle, MARGIN, y);

  y += 6.5;
  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.text(
    [
      'Satış ve tahsilat dökümü',
      ...(input.customerPhone ? [input.customerPhone] : []),
      ...(input.customerBalance !== undefined ? [getBalanceLabel(input.customerBalance, money)] : []),
    ].join(' · '),
    MARGIN,
    y,
  );

  y += 5;
  doc.setFontSize(8);
  const scopeLine = [`Tarih: ${input.periodLabel}`, ...input.filterNotes].join(' · ');
  doc.text(String(doc.splitTextToSize(scopeLine, CONTENT_WIDTH)[0] ?? ''), MARGIN, y);

  y += 5;
  drawSummaryBand(
    doc,
    y,
    12,
    'Toplam',
    `${completedSales.length} satış   ·   ${formatQuantity(totalQuantity)} adet   ·   İade ${formatQuantity(totalReturned)} adet   ·   ${money(totalAmount)}`,
    { fill: TEAL, label: WHITE, summary: WHITE },
  );

  y += 12 + 2;
  drawSummaryBand(
    doc,
    y,
    12,
    'Tahsilat',
    `Satışlarda ${money(collectedInSales)}   ·   Borç tahsilatı ${money(collectedAsPayments)}   ·   Toplam ${money(collectedInSales + collectedAsPayments)}`,
    { fill: STRIPE, label: MUTED, summary: INK },
  );

  y += 12 + 6;

  if (sales.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text(
      payments.length === 0
        ? 'Seçilen müşteri ve tarih için satış veya tahsilat bulunamadı.'
        : 'Seçilen müşteri ve tarih için satış bulunamadı.',
      MARGIN,
      y + 4,
    );
    y += 4;
  } else {
    y = drawTable(
      doc,
      SALE_COLUMNS,
      sales.map((sale) => buildSaleRow(doc, sale, input, money)),
      y,
    );

    if (cancelledCount > 0) {
      y += 5;
      doc.setTextColor(...MUTED);
      doc.setFontSize(8);
      doc.text(`İptal edilen ${cancelledCount} satış toplamlara dahil değildir.`, MARGIN, y);
    }
  }

  if (payments.length > 0) {
    y = drawSection(
      doc,
      'Borç tahsilatları',
      PAYMENT_COLUMNS,
      payments.map((payment) => buildPaymentRow(doc, payment, input.showCustomerNames, money)),
      y,
    );
  }

  const productRows = buildProductRows(doc, completedSales, input.products, money);
  if (productRows.length > 0) {
    drawSection(doc, 'Ürün özeti', PRODUCT_COLUMNS, productRows, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(`${customerTitle} · ${input.periodLabel}`, MARGIN, FOOTER_BASELINE);
    doc.text(`Sayfa ${page} / ${pageCount}`, MARGIN + CONTENT_WIDTH, FOOTER_BASELINE, { align: 'right' });
  }

  return doc.output('blob');
};
