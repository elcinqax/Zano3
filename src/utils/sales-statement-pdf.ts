import type { jsPDF } from 'jspdf';
import { createPdfDocument } from './pdf-utils';
import { formatCurrency, formatDate } from './formatters';
import { formatQuantity, getSaleReturns } from './sale-returns';
import type { Product, Sale } from '../types';

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

const TEAL: Rgb = [15, 118, 110];
const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const AMBER: Rgb = [180, 83, 9];
const ROSE: Rgb = [190, 18, 60];
const STRIPE: Rgb = [241, 245, 249];
const BORDER: Rgb = [203, 213, 225];

const SALE_COLUMNS: Column[] = [
  { title: 'Tarih', width: 26, align: 'left' },
  { title: 'Fiş', width: 30, align: 'left' },
  { title: 'Ürünler', width: 76, align: 'left' },
  { title: 'Ödeme', width: 22, align: 'left' },
  { title: 'Tutar', width: 28, align: 'right' },
];

const PRODUCT_COLUMNS: Column[] = [
  { title: 'Ürün', width: 98, align: 'left' },
  { title: 'Adet', width: 26, align: 'right' },
  { title: 'İade', width: 26, align: 'right' },
  { title: 'Tutar', width: 32, align: 'right' },
];

const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

// DejaVu Sans has no manat glyph; swapping it here keeps measured widths equal to what is drawn.
const createMoneyFormatter = (currency: string) => (amount: number): string =>
  formatCurrency(amount, currency).replace(/\u20BC/g, 'AZN');

const getPaymentLabel = (sale: Sale): string => {
  if (sale.total < 0) return 'İade';
  if (sale.paymentMethod === 'cash') return 'Nakit';
  if (sale.paymentMethod === 'mixed') return 'Karışık';
  if (sale.paymentMethod === 'credit') return 'Veresiye';
  if (sale.paymentMethod === 'transfer') return 'Havale';
  return 'Kart';
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
    const lineCount = Math.max(1, ...row.map((cell) => cell.length));
    const height = lineCount * LINE_HEIGHT + ROW_EXTRA_HEIGHT;
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

const buildSaleRow = (
  doc: jsPDF,
  sale: Sale,
  input: SalesStatementPdfInput,
  money: (amount: number) => string,
): Row => {
  const [dateColumn, invoiceColumn, itemsColumn, paymentColumn, totalColumn] = SALE_COLUMNS;
  const isCancelled = sale.status === 'cancelled';
  const textColor = isCancelled ? MUTED : INK;
  const createdAt = new Date(sale.createdAt);
  const balanceDelta = sale.customerBalanceDelta ?? 0;

  return [
    [
      ...wrapCell(doc, formatDate(sale.createdAt), dateColumn, textColor),
      ...(Number.isNaN(createdAt.getTime()) ? [] : wrapCell(doc, timeFormatter.format(createdAt), dateColumn, MUTED)),
    ],
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
      ...wrapCell(doc, getPaymentLabel(sale), paymentColumn, textColor),
      ...(isCancelled ? wrapCell(doc, 'İptal edildi', paymentColumn, ROSE) : []),
    ],
    wrapCell(doc, money(sale.total), totalColumn, textColor),
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

export const buildSalesStatementPdf = async (input: SalesStatementPdfInput): Promise<Blob> => {
  const doc = await createPdfDocument();
  const money = createMoneyFormatter(input.currency);
  const sales = [...input.sales].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
      'Satış dökümü',
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
  doc.setFillColor(...TEAL);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 12, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.text('Toplam', MARGIN + 4, y + 7.4);
  const totalsLabel = `${completedSales.length} satış   ·   ${formatQuantity(totalQuantity)} adet   ·   İade ${formatQuantity(totalReturned)} adet   ·   ${money(totalAmount)}`;
  fitFontSize(doc, totalsLabel, CONTENT_WIDTH - 28, 11);
  doc.text(totalsLabel, MARGIN + CONTENT_WIDTH - 4, y + 7.7, { align: 'right' });

  y += 12 + 6;

  if (sales.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text('Seçilen müşteri ve tarih için satış bulunamadı.', MARGIN, y + 4);
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

    const productRows = buildProductRows(doc, completedSales, input.products, money);
    if (productRows.length > 0) {
      y += SECTION_GAP;
      const firstRowHeight = productRows[0][0].length * LINE_HEIGHT + ROW_EXTRA_HEIGHT;
      if (y + 4 + TABLE_HEADER_HEIGHT + firstRowHeight > PAGE_BOTTOM) {
        doc.addPage();
        y = PAGE_TOP + 4;
      }
      doc.setTextColor(...INK);
      doc.setFontSize(11);
      doc.text('Ürün özeti', MARGIN, y);
      drawTable(doc, PRODUCT_COLUMNS, productRows, y + 4);
    }
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
