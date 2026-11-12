import type { jsPDF } from 'jspdf';
import { createPdfDocument } from './pdf-utils';
import { formatCurrency, formatDate } from './formatters';
import { formatQuantity } from './sale-returns';
import { WEEKDAY_LABELS, type PurchaseDayTotal } from '../components/PurchaseCalendar';

export interface CustomerDailyMonth {
  monthKey: string;
  quantity: number;
  amount: number;
  returned: number;
  days: PurchaseDayTotal[];
}

export interface CustomerDailyPdfInput {
  storeName: string;
  customerName: string;
  customerPhone?: string;
  year: number;
  /** Set to report a single month at full page width instead of the whole year. */
  monthKey?: string;
  months: CustomerDailyMonth[];
  filterLabel: string;
  scopeStartKey: string | null;
  scopeEndKey: string;
  currency: string;
}

type Rgb = [number, number, number];

interface MonthLayout {
  columns: number;
  width: number;
  headerHeight: number;
  weekdayRowHeight: number;
  cellHeight: number;
  cellRadius: number;
  cellPadding: number;
  titleSize: number;
  noteSize: number;
  weekdaySize: number;
  dayNumberSize: number;
  dayNumberBaseline: number;
  quantitySize: number;
  quantityBaseline: number;
  returnSize: number;
  amount: { size: number; baseline: number } | null;
}

const MARGIN = 14;
const CONTENT_WIDTH = 182;
const COLUMN_GAP = 6;
const BLOCK_GAP = 6;
const PAGE_TOP = 16;
const PAGE_BOTTOM = 284;

const YEAR_LAYOUT: MonthLayout = {
  columns: 2,
  width: (CONTENT_WIDTH - COLUMN_GAP) / 2,
  headerHeight: 8,
  weekdayRowHeight: 5,
  cellHeight: 9,
  cellRadius: 1.2,
  cellPadding: 1.6,
  titleSize: 9,
  noteSize: 7.5,
  weekdaySize: 6.5,
  dayNumberSize: 6.5,
  dayNumberBaseline: 3.4,
  quantitySize: 9,
  quantityBaseline: 7.3,
  returnSize: 6,
  amount: null,
};

const SINGLE_MONTH_LAYOUT: MonthLayout = {
  columns: 1,
  width: CONTENT_WIDTH,
  headerHeight: 11,
  weekdayRowHeight: 7,
  cellHeight: 24,
  cellRadius: 2,
  cellPadding: 2.6,
  titleSize: 12,
  noteSize: 9.5,
  weekdaySize: 8.5,
  dayNumberSize: 10,
  dayNumberBaseline: 6.2,
  quantitySize: 18,
  quantityBaseline: 15.2,
  returnSize: 9,
  amount: { size: 8, baseline: 21 },
};

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

const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const label = monthLabelFormatter.format(new Date(year, month - 1, 1));
  return label.charAt(0).toLocaleUpperCase('tr-TR') + label.slice(1);
};

const getLeadingBlanks = (year: number, month: number): number => (new Date(year, month - 1, 1).getDay() + 6) % 7;

const getWeekRows = (monthKey: string): number => {
  const [year, month] = monthKey.split('-').map(Number);
  return Math.ceil((getLeadingBlanks(year, month) + new Date(year, month, 0).getDate()) / 7);
};

const getBlockHeight = (layout: MonthLayout, rows: number): number =>
  layout.headerHeight + layout.weekdayRowHeight + rows * layout.cellHeight;

// jsPDF sizes fonts in points and positions text by baseline; this centres the cap height in a box given in mm.
const centerBaseline = (top: number, height: number, fontSize: number): number => top + height / 2 + fontSize * 0.125;

const fitFontSize = (doc: jsPDF, text: string, maxWidth: number, size: number): number => {
  let fitted = size;
  doc.setFontSize(fitted);
  while (fitted > 5 && doc.getTextWidth(text) > maxWidth) {
    fitted -= 0.5;
    doc.setFontSize(fitted);
  }
  return fitted;
};

const getMonthTotals = (month: CustomerDailyMonth, currency: string): string =>
  [
    `${formatQuantity(month.quantity)} adet`,
    ...(month.returned > 0 ? [`İade ${formatQuantity(month.returned)}`] : []),
    formatCurrency(month.amount, currency),
  ].join(' · ');

const drawMonth = (
  doc: jsPDF,
  month: CustomerDailyMonth,
  x: number,
  y: number,
  layout: MonthLayout,
  note: string,
  input: Pick<CustomerDailyPdfInput, 'scopeStartKey' | 'scopeEndKey' | 'currency'>,
): void => {
  const [year, monthNumber] = month.monthKey.split('-').map(Number);
  const title = getMonthLabel(month.monthKey);
  const cellWidth = layout.width / 7;
  const headerInset = layout.cellPadding + 1;

  doc.setFillColor(...TEAL);
  doc.roundedRect(x, y, layout.width, layout.headerHeight, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(layout.titleSize);
  doc.text(title, x + headerInset, centerBaseline(y, layout.headerHeight, layout.titleSize));
  const titleWidth = doc.getTextWidth(title);
  const noteSize = fitFontSize(doc, note, layout.width - titleWidth - headerInset * 2 - 4, layout.noteSize);
  doc.text(note, x + layout.width - headerInset, centerBaseline(y, layout.headerHeight, noteSize), { align: 'right' });

  doc.setTextColor(...MUTED);
  doc.setFontSize(layout.weekdaySize);
  WEEKDAY_LABELS.forEach((label, index) => {
    doc.text(
      label,
      x + index * cellWidth + cellWidth / 2,
      centerBaseline(y + layout.headerHeight, layout.weekdayRowHeight, layout.weekdaySize),
      { align: 'center' },
    );
  });

  const gridTop = y + layout.headerHeight + layout.weekdayRowHeight;
  const leadingBlanks = getLeadingBlanks(year, monthNumber);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const totalsByDate = new Map(month.days.map((day) => [day.date, day]));
  const textWidth = cellWidth - layout.cellPadding * 2;

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const dateKey = `${month.monthKey}-${String(dayNumber).padStart(2, '0')}`;
    const total = totalsByDate.get(dateKey);
    const isOutsideScope = (input.scopeStartKey !== null && dateKey < input.scopeStartKey) || dateKey > input.scopeEndKey;
    const style = DAY_STYLES[total ? 'purchased' : isOutsideScope ? 'outside' : 'none'];
    const position = leadingBlanks + dayNumber - 1;
    const cellX = x + (position % 7) * cellWidth;
    const cellY = gridTop + Math.floor(position / 7) * layout.cellHeight;

    doc.setFillColor(...style.fill);
    doc.roundedRect(cellX + 0.4, cellY + 0.4, cellWidth - 0.8, layout.cellHeight - 0.8, layout.cellRadius, layout.cellRadius, 'F');
    doc.setTextColor(...style.text);
    doc.setFontSize(layout.dayNumberSize);
    doc.text(String(dayNumber), cellX + layout.cellPadding, cellY + layout.dayNumberBaseline);

    if (!total) continue;
    const quantity = formatQuantity(total.quantity);
    fitFontSize(doc, quantity, textWidth, layout.quantitySize);
    doc.text(quantity, cellX + cellWidth / 2, cellY + layout.quantityBaseline, { align: 'center' });
    if (layout.amount) {
      const amount = formatCurrency(total.amount, input.currency);
      fitFontSize(doc, amount, textWidth, layout.amount.size);
      doc.text(amount, cellX + cellWidth / 2, cellY + layout.amount.baseline, { align: 'center' });
    }
    if (total.returned > 0) {
      doc.setTextColor(...RETURN_ON_GREEN);
      doc.setFontSize(layout.returnSize);
      doc.text(`-${formatQuantity(total.returned)}`, cellX + cellWidth - layout.cellPadding, cellY + layout.dayNumberBaseline, { align: 'right' });
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

export const buildCustomerDailyPdf = async (input: CustomerDailyPdfInput): Promise<Blob> => {
  const doc = await createPdfDocument();
  const isSingleMonth = input.monthKey !== undefined;
  const layout = isSingleMonth ? SINGLE_MONTH_LAYOUT : YEAR_LAYOUT;
  const periodLabel = input.monthKey !== undefined ? getMonthLabel(input.monthKey) : String(input.year);
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
    [
      `${isSingleMonth ? periodLabel : `${input.year} yılı`} günlük dağılım`,
      ...(input.customerPhone ? [input.customerPhone] : []),
    ].join(' · '),
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
  doc.text(isSingleMonth ? 'Ay toplamı' : 'Yıl toplamı', MARGIN + 4, y + 7.4);
  const periodTotals = `${formatQuantity(totalQuantity)} adet   ·   İade ${formatQuantity(totalReturned)} adet   ·   ${formatCurrency(totalAmount, input.currency)}`;
  fitFontSize(doc, periodTotals, CONTENT_WIDTH - 34, 11);
  doc.text(periodTotals, MARGIN + CONTENT_WIDTH - 4, y + 7.7, { align: 'right' });

  y += 19;
  drawLegend(doc, y, totalReturned > 0);
  y += 6;

  if (months.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text(`Bu ${isSingleMonth ? 'ay' : 'yıl'} için günlük satış bulunamadı.`, MARGIN, y + 4);
  }

  for (let index = 0; index < months.length; index += layout.columns) {
    const row = months.slice(index, index + layout.columns);
    const blockHeight = getBlockHeight(layout, Math.max(...row.map((month) => getWeekRows(month.monthKey))));
    if (y + blockHeight > PAGE_BOTTOM) {
      doc.addPage();
      y = PAGE_TOP;
    }
    row.forEach((month, column) => {
      // The single-month page already shows the month totals in the summary bar above.
      const note = isSingleMonth ? `${month.days.length} gün alışveriş` : getMonthTotals(month, input.currency);
      drawMonth(doc, month, MARGIN + column * (layout.width + COLUMN_GAP), y, layout, note, input);
    });
    y += blockHeight + BLOCK_GAP;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(`${customerTitle} · ${periodLabel}`, MARGIN, 291);
    doc.text(`Sayfa ${page} / ${pageCount}`, MARGIN + CONTENT_WIDTH, 291, { align: 'right' });
  }

  return doc.output('blob');
};
