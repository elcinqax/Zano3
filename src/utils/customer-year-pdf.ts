import type { jsPDF } from 'jspdf';
import { createPdfDocument } from './pdf-utils';
import { formatCurrency, formatDate } from './formatters';
import { formatQuantity } from './sale-returns';
import { WEEKDAY_LABELS, type PurchaseDayTotal } from '../components/PurchaseCalendar';

export interface CustomerYearMonth {
  monthKey: string;
  quantity: number;
  amount: number;
  returned: number;
  days: PurchaseDayTotal[];
}

export interface CustomerYearPdfInput {
  storeName: string;
  customerName: string;
  customerPhone?: string;
  year: number;
  months: CustomerYearMonth[];
  filterLabel: string;
  scopeStartKey: string | null;
  scopeEndKey: string;
  currency: string;
}

type Rgb = [number, number, number];

const MARGIN = 14;
const CONTENT_WIDTH = 182;
const COLUMN_GAP = 6;
const BLOCK_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;
const CELL_WIDTH = BLOCK_WIDTH / 7;
const CELL_HEIGHT = 9;
const MONTH_HEADER_HEIGHT = 8;
const WEEKDAY_ROW_HEIGHT = 5;
const BLOCK_GAP = 6;
const PAGE_TOP = 16;
const PAGE_BOTTOM = 284;

const TEAL: Rgb = [15, 118, 110];
const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const RETURN_ON_GREEN: Rgb = [253, 230, 138];

const DAY_STYLES: Record<'purchased' | 'none' | 'outside', { fill: Rgb; text: Rgb; label: string }> = {
  purchased: { fill: [4, 120, 87], text: WHITE, label: 'Alışveriş var' },
  none: { fill: [254, 202, 202], text: [153, 27, 27], label: 'Alışveriş yok' },
  outside: { fill: [241, 245, 249], text: [148, 163, 184], label: 'Aralık dışı / gelecek' },
};

const monthLabelFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

const getMonthLabel = (year: number, month: number): string => {
  const label = monthLabelFormatter.format(new Date(year, month - 1, 1));
  return label.charAt(0).toLocaleUpperCase('tr-TR') + label.slice(1);
};

const getLeadingBlanks = (year: number, month: number): number => (new Date(year, month - 1, 1).getDay() + 6) % 7;

const getWeekRows = (monthKey: string): number => {
  const [year, month] = monthKey.split('-').map(Number);
  return Math.ceil((getLeadingBlanks(year, month) + new Date(year, month, 0).getDate()) / 7);
};

const getBlockHeight = (rows: number): number => MONTH_HEADER_HEIGHT + WEEKDAY_ROW_HEIGHT + rows * CELL_HEIGHT;

const fitFontSize = (doc: jsPDF, text: string, maxWidth: number, size: number): number => {
  let fitted = size;
  doc.setFontSize(fitted);
  while (fitted > 5 && doc.getTextWidth(text) > maxWidth) {
    fitted -= 0.5;
    doc.setFontSize(fitted);
  }
  return fitted;
};

const drawMonth = (
  doc: jsPDF,
  month: CustomerYearMonth,
  x: number,
  y: number,
  input: Pick<CustomerYearPdfInput, 'scopeStartKey' | 'scopeEndKey' | 'currency'>,
): void => {
  const [year, monthNumber] = month.monthKey.split('-').map(Number);
  const title = getMonthLabel(year, monthNumber);
  const totals = [
    `${formatQuantity(month.quantity)} adet`,
    ...(month.returned > 0 ? [`İade ${formatQuantity(month.returned)}`] : []),
    formatCurrency(month.amount, input.currency),
  ].join(' · ');

  doc.setFillColor(...TEAL);
  doc.roundedRect(x, y, BLOCK_WIDTH, MONTH_HEADER_HEIGHT, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.text(title, x + 2.5, y + 5.4);
  const titleWidth = doc.getTextWidth(title);
  fitFontSize(doc, totals, BLOCK_WIDTH - titleWidth - 9, 7.5);
  doc.text(totals, x + BLOCK_WIDTH - 2.5, y + 5.3, { align: 'right' });

  doc.setTextColor(...MUTED);
  doc.setFontSize(6.5);
  WEEKDAY_LABELS.forEach((label, index) => {
    doc.text(label, x + index * CELL_WIDTH + CELL_WIDTH / 2, y + MONTH_HEADER_HEIGHT + 3.7, { align: 'center' });
  });

  const gridTop = y + MONTH_HEADER_HEIGHT + WEEKDAY_ROW_HEIGHT;
  const leadingBlanks = getLeadingBlanks(year, monthNumber);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const totalsByDate = new Map(month.days.map((day) => [day.date, day]));

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const dateKey = `${month.monthKey}-${String(dayNumber).padStart(2, '0')}`;
    const total = totalsByDate.get(dateKey);
    const isOutsideScope = (input.scopeStartKey !== null && dateKey < input.scopeStartKey) || dateKey > input.scopeEndKey;
    const style = DAY_STYLES[total ? 'purchased' : isOutsideScope ? 'outside' : 'none'];
    const position = leadingBlanks + dayNumber - 1;
    const cellX = x + (position % 7) * CELL_WIDTH;
    const cellY = gridTop + Math.floor(position / 7) * CELL_HEIGHT;

    doc.setFillColor(...style.fill);
    doc.roundedRect(cellX + 0.4, cellY + 0.4, CELL_WIDTH - 0.8, CELL_HEIGHT - 0.8, 1.2, 1.2, 'F');
    doc.setTextColor(...style.text);
    doc.setFontSize(6.5);
    doc.text(String(dayNumber), cellX + 1.6, cellY + 3.4);

    if (!total) continue;
    const quantity = formatQuantity(total.quantity);
    fitFontSize(doc, quantity, CELL_WIDTH - 2.4, 9);
    doc.text(quantity, cellX + CELL_WIDTH / 2, cellY + 7.3, { align: 'center' });
    if (total.returned > 0) {
      doc.setTextColor(...RETURN_ON_GREEN);
      doc.setFontSize(6);
      doc.text(`-${formatQuantity(total.returned)}`, cellX + CELL_WIDTH - 1.6, cellY + 3.4, { align: 'right' });
    }
  }
};

const drawLegend = (doc: jsPDF, y: number, hasReturns: boolean): void => {
  let x = MARGIN;
  doc.setFontSize(7.5);
  (Object.keys(DAY_STYLES) as Array<keyof typeof DAY_STYLES>).forEach((status) => {
    const style = DAY_STYLES[status];
    doc.setFillColor(...style.fill);
    doc.roundedRect(x, y - 2.7, 3.2, 3.2, 0.6, 0.6, 'F');
    doc.setTextColor(...MUTED);
    doc.text(style.label, x + 4.6, y);
    x += 4.6 + doc.getTextWidth(style.label) + 6;
  });
  if (hasReturns) {
    doc.setTextColor(180, 83, 9);
    doc.text('Eksi sayı = iade', x, y);
  }
};

export const buildCustomerYearPdf = async (input: CustomerYearPdfInput): Promise<Blob> => {
  const doc = await createPdfDocument();
  const months = [...input.months].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const totalQuantity = months.reduce((sum, month) => sum + month.quantity, 0);
  const totalReturned = months.reduce((sum, month) => sum + month.returned, 0);
  const totalAmount = months.reduce((sum, month) => sum + month.amount, 0);

  let y = PAGE_TOP;
  doc.setTextColor(...MUTED);
  doc.setFontSize(8.5);
  doc.text(input.storeName, MARGIN, y);
  doc.text(`Rapor tarihi: ${formatDate(new Date().toISOString())}`, MARGIN + CONTENT_WIDTH, y, { align: 'right' });

  y += 9;
  doc.setTextColor(...INK);
  const customerTitle = String(doc.splitTextToSize(input.customerName, CONTENT_WIDTH)[0] ?? '');
  doc.setFontSize(17);
  doc.text(customerTitle, MARGIN, y);

  y += 6.5;
  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.text(
    [`${input.year} yılı günlük dağılım`, ...(input.customerPhone ? [input.customerPhone] : [])].join(' · '),
    MARGIN,
    y,
  );

  y += 5;
  doc.setFontSize(8);
  doc.text(String(doc.splitTextToSize(`Filtre: ${input.filterLabel}`, CONTENT_WIDTH)[0] ?? ''), MARGIN, y);

  y += 5;
  doc.setFillColor(...TEAL);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 12, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.text('Yıl toplamı', MARGIN + 4, y + 7.4);
  const yearTotals = `${formatQuantity(totalQuantity)} adet   ·   İade ${formatQuantity(totalReturned)} adet   ·   ${formatCurrency(totalAmount, input.currency)}`;
  fitFontSize(doc, yearTotals, CONTENT_WIDTH - 34, 11);
  doc.text(yearTotals, MARGIN + CONTENT_WIDTH - 4, y + 7.7, { align: 'right' });

  y += 19;
  drawLegend(doc, y, totalReturned > 0);
  y += 6;

  if (months.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text('Bu yıl için günlük satış bulunamadı.', MARGIN, y + 4);
  }

  for (let index = 0; index < months.length; index += 2) {
    const pair = months.slice(index, index + 2);
    const blockHeight = getBlockHeight(Math.max(...pair.map((month) => getWeekRows(month.monthKey))));
    if (y + blockHeight > PAGE_BOTTOM) {
      doc.addPage();
      y = PAGE_TOP;
    }
    pair.forEach((month, column) => drawMonth(doc, month, MARGIN + column * (BLOCK_WIDTH + COLUMN_GAP), y, input));
    y += blockHeight + BLOCK_GAP;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(`${customerTitle} · ${input.year}`, MARGIN, 291);
    doc.text(`Sayfa ${page} / ${pageCount}`, MARGIN + CONTENT_WIDTH, 291, { align: 'right' });
  }

  return doc.output('blob');
};
