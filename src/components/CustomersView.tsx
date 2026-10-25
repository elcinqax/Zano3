import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  DollarSign,
  Download,
  Eye,
  Clock,
  ArrowDownLeft,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { Customer, Sale, SaleItem, CustomerPayment, AppSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { AppLanguage, translateText } from '../i18n';
import { exportCustomersToCSV } from '../utils/export-utils';
import { jsPDF } from 'jspdf';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  payments: CustomerPayment[];
  settings: AppSettings;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'totalPurchases' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  onAddPayment: (customerId: string, amount: number, paymentMethod: 'cash' | 'card' | 'credit' | 'transfer', notes?: string) => void;
  onUpdateSale: (id: string, updates: Partial<Sale>) => void;
  onDeleteSale: (id: string) => void;
  onSelectSaleForReceipt: (sale: Sale) => void;
  isOpenAddModalExternal: boolean;
  onCloseAddModalExternal: () => void;
  language: AppLanguage;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  payments,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddPayment,
  onUpdateSale,
  onDeleteSale,
  onSelectSaleForReceipt,
  isOpenAddModalExternal,
  onCloseAddModalExternal,
  language,
}) => {
  const [search, setSearch] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editingItems, setEditingItems] = useState<SaleItem[]>([]);

  const customerSales = historyCustomer
    ? sales.filter((sale) => sale.customerId === historyCustomer.id && sale.status === 'completed')
    : [];

  const historyMonths = useMemo(() => {
    if (!historyCustomer) return [] as string[];
    return Array.from(new Set([
      ...customerSales.map((sale) => sale.createdAt.slice(0, 7)),
      ...payments.filter((payment) => payment.customerId === historyCustomer.id).map((payment) => payment.createdAt.slice(0, 7)),
    ])).sort((a, b) => b.localeCompare(a));
  }, [historyCustomer, customerSales, payments]);

  const formatMonth = (month: string) => new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`));
  const filteredHistorySales = selectedHistoryMonth ? customerSales.filter((sale) => sale.createdAt.slice(0, 7) === selectedHistoryMonth) : customerSales;
  const filteredHistoryPayments = historyCustomer ? payments.filter((payment) => payment.customerId === historyCustomer.id && (!selectedHistoryMonth || payment.createdAt.slice(0, 7) === selectedHistoryMonth)) : [];
  const selectedPeriodProductTotals = Object.entries(filteredHistorySales.reduce<Record<string, number>>((totals, sale) => {
    sale.items.forEach((item) => { totals[item.productName] = (totals[item.productName] || 0) + item.quantity; });
    return totals;
  }, {})).sort(([, a], [, b]) => b - a);
  const selectedPeriodLabel = selectedHistoryMonth ? formatMonth(selectedHistoryMonth) : 'Tüm dönem';

  const startEditingSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditingItems(sale.items.map((item) => ({ ...item })));
  };

  const saveEditedSale = () => {
    if (!editingSale || editingItems.some((item) => item.quantity <= 0 || item.unitPrice < 0)) return;
    const subtotal = editingItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const total = Math.max(0, subtotal - editingSale.discount + editingSale.taxAmount);
    onUpdateSale(editingSale.id, {
      items: editingItems.map((item) => ({ ...item, total: item.quantity * item.unitPrice })),
      subtotal, total, profit: total - editingItems.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0),
    });
    setEditingSale(null);
  };

  const purchaseSummary = useMemo(() => {
    if (customerSales.length === 0) {
      return { latestQuantity: 0, latestDate: null as string | null, latestProductNames: [] as string[], busiestDate: null as string | null, busiestQuantity: 0, lastThreeMonthsQuantity: 0, allProductTotals: [] as Array<[string, number]> };
    }

    const quantityForSale = (sale: Sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const latestSale = [...customerSales].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    const recentSales = customerSales.filter((sale) => new Date(sale.createdAt) >= threeMonthsAgo);
    const lastThreeMonthsQuantity = recentSales.reduce((sum, sale) => sum + quantityForSale(sale), 0);
    const totalsByProduct = (sourceSales: Sale[]) => Object.entries(sourceSales.reduce<Record<string, number>>((totals, sale) => {
      sale.items.forEach((item) => { totals[item.productName] = (totals[item.productName] || 0) + item.quantity; });
      return totals;
    }, {})).sort(([, a], [, b]) => b - a);
    const byDay = customerSales.reduce<Record<string, number>>((totals, sale) => {
      const day = new Date(sale.createdAt).toISOString().slice(0, 10);
      totals[day] = (totals[day] || 0) + quantityForSale(sale);
      return totals;
    }, {});
    const [busiestDate, busiestQuantity] = Object.entries(byDay).sort(([, a], [, b]) => b - a)[0] || [null, 0];

    return {
      latestQuantity: quantityForSale(latestSale),
      latestDate: latestSale.createdAt,
      latestProductNames: [...new Set(latestSale.items.map((item) => item.productName))].sort((a, b) => a.localeCompare(b, 'tr')),
      busiestDate,
      busiestQuantity,
      lastThreeMonthsQuantity,
      allProductTotals: totalsByProduct(customerSales),
    };
  }, [customerSales]);

  // Modals
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Payment (Tahsilat) Modal
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  React.useEffect(() => {
    if (isOpenAddModalExternal) {
      openAddModal();
      onCloseAddModalExternal();
    }
  }, [isOpenAddModalExternal]);

  // Alphabetically sorted customers
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aDebt = a.balance > 0 ? 1 : 0;
      const bDebt = b.balance > 0 ? 1 : 0;
      if (aDebt !== bDebt) return bDebt - aDebt;
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [customers]);

  // Filter customers and sort alphabetically
  const filteredCustomers = useMemo(() => {
    return sortedCustomers.filter((c) => {
      const matchDebt = !filterDebtOnly || c.balance > 0;
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));
      return matchDebt && matchQuery;
    });
  }, [sortedCustomers, filterDebtOnly, search]);

  // Aggregate metrics
  const totalReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0),
    [customers]
  );
  const debtorCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setModalMode('add');
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormEmail(c.email || '');
    setFormAddress(c.address || '');
    setFormNotes(c.notes || '');
    setModalMode('edit');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (modalMode === 'add') {
      onAddCustomer({
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else if (modalMode === 'edit' && editingCustomer) {
      onUpdateCustomer(editingCustomer.id, {
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    }
    setModalMode(null);
  };

  const handleOpenPayment = (customer: Customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount(customer.balance);
    setPaymentMethod('cash');
    setPaymentNotes('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || paymentAmount === 0) return;
    onAddPayment(paymentCustomer.id, paymentAmount, paymentMethod, paymentNotes);
    setPaymentCustomer(null);
  };

  const pdfTitleCase = (value: string) => value.replace(/(^|[\s/()_-])[a-zçğıöşü]/gi, (match) => match.toUpperCase());
  const pdfSafeText = (value: string) => pdfTitleCase(translateText(value, language));
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    return window.btoa(binary);
  };

  const handleExportCustomerPdf = async (customer: Customer, preview = false) => {
    const monthLabel = selectedHistoryMonth ? formatMonth(selectedHistoryMonth) : 'Bütün Dövr';
    const customerSalesForReport = sales.filter((sale) => sale.customerId === customer.id && sale.status === 'completed' && (!selectedHistoryMonth || sale.createdAt.slice(0, 7) === selectedHistoryMonth));
    const customerPaymentsForReport = payments.filter((payment) => payment.customerId === customer.id && (!selectedHistoryMonth || payment.createdAt.slice(0, 7) === selectedHistoryMonth));
    const events = [
      ...customerSalesForReport.map((sale) => ({ date: sale.createdAt, type: sale.paymentMethod === 'credit' ? 'Nisy�� Satış' : sale.paymentMethod === 'cash' ? 'Nağd Satış' : 'Qarışıq Ödəniş', amount: formatCurrency(sale.total), subtotal: formatCurrency(sale.subtotal), product: sale.items.map((item) => item.productName).join(', '), quantity: sale.items.reduce((sum, item) => sum + item.quantity, 0) })),
      ...customerPaymentsForReport.map((payment) => ({ date: payment.createdAt, type: `Ödəniş (${payment.paymentMethod.charAt(0).toUpperCase()}${payment.paymentMethod.slice(1)})`, amount: `-${formatCurrency(payment.amount)}`, subtotal: '-', product: payment.notes || 'Ödəniş alındı', quantity: '-' })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const fontResponse = await fetch('/fonts/DejaVuSans.ttf');
    if (!fontResponse.ok) throw new Error('PDF font could not be loaded');
    const fontBase64 = arrayBufferToBase64(await fontResponse.arrayBuffer());
    pdf.addFileToVFS('DejaVuSans.ttf', fontBase64);
    pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
    pdf.setFont('DejaVuSans', 'normal');
    let y = 18;
    pdf.setFontSize(18);
    pdf.text(pdfSafeText(`${customer.name} - Müştəri Tarixçəsi`), 14, y);
    y += 9;
    pdf.setFontSize(10);
    pdf.text(pdfSafeText(`${monthLabel} | Qalıq: ${formatCurrency(customer.balance)} | Hesabat Tarixi: ${formatDate(new Date().toISOString())}`), 14, y);
    y += 6;
    const salesTotal = customerSalesForReport.reduce((sum, sale) => sum + sale.total, 0);
    const paymentsTotal = customerPaymentsForReport.reduce((sum, payment) => sum + payment.amount, 0);
    pdf.setFontSize(9);
    pdf.text(pdfSafeText(`Ümumi Satış: ${formatCurrency(salesTotal)} | Ümumi Ödəniş: ${formatCurrency(paymentsTotal)} | Əməliyyat Sayı: ${events.length}`), 14, y);
    y += 10;
    const tableLeft = 14;
    const tableRight = 196;
    const tableTop = y - 5;
    const columnX = [14, 42, 78, 110, 170, 196];
    pdf.setFillColor(234, 242, 255);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.rect(tableLeft, tableTop, tableRight - tableLeft, 8, 'FD');
    pdf.setLineWidth(0.35);
    columnX.slice(1, -1).forEach((x) => pdf.line(x, tableTop, x, tableTop + 8));
    pdf.setFontSize(9);
    pdf.text(pdfSafeText('Tarix'), 16, y + 1);
    pdf.text(pdfSafeText('Əməliyyat'), 44, y + 1);
    pdf.text(pdfSafeText('Məbləğ'), 80, y + 1);
    pdf.text(pdfSafeText('Məhsul/Açıqlama'), 112, y + 1);
    pdf.text(pdfSafeText('Say'), 174, y + 1);
    y += 8;
    events.forEach((event) => {
      const dateLines = pdf.splitTextToSize(pdfSafeText(formatDate(event.date)), 24);
      const typeLines = pdf.splitTextToSize(pdfSafeText(event.type), 32);
      const amountLines = pdf.splitTextToSize(pdfSafeText(event.amount), 28);
      const productLines = pdf.splitTextToSize(pdfSafeText(event.product), 56);
      const quantityLines = [String(event.quantity)];
      const lineCount = Math.max(dateLines.length, typeLines.length, amountLines.length, productLines.length, quantityLines.length, 1);
      const rowHeight = Math.max(10, lineCount * 4 + 5);
      if (y + rowHeight > 280) { pdf.addPage(); y = 18; }
      const rowTop = y - 5;
      const rowColor = event.type.startsWith('Nisyə')
        ? [254, 243, 199]
        : event.type.startsWith('Nağd')
          ? [219, 234, 254]
          : [220, 252, 231];
      pdf.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.rect(tableLeft, rowTop, tableRight - tableLeft, rowHeight, 'FD');
      pdf.setLineWidth(0.35);
      columnX.slice(1, -1).forEach((x) => pdf.line(x, rowTop, x, rowTop + rowHeight));
      pdf.setFontSize(8);
      pdf.setTextColor(31, 41, 55);
      const textY = rowTop + 5;
      pdf.text(dateLines, 16, textY);
      pdf.text(typeLines, 44, textY);
      pdf.text(amountLines, 80, textY);
      pdf.text(productLines, 112, textY);
      pdf.text(quantityLines, 174, textY);
      y += rowHeight;
    });
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.line(tableLeft, tableTop, tableLeft, y - 1);
    pdf.line(tableRight, tableTop, tableRight, y - 1);
    pdf.line(tableLeft, y - 1, tableRight, y - 1);

    if (y > 255) { pdf.addPage(); y = 18; } else { y += 10; }
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.rect(tableLeft, y - 5, tableRight - tableLeft, 18, 'FD');
    pdf.setFontSize(9);
    pdf.text(pdfSafeText('ÜMUMİ'), 17, y);
    pdf.text(pdfSafeText(`Ümumi Satış: ${formatCurrency(salesTotal)}`), 17, y + 7);
    pdf.text(pdfSafeText(`Ümumi Ödəniş: ${formatCurrency(paymentsTotal)}`), 105, y + 7);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.rect(tableLeft, y - 5, tableRight - tableLeft, 18, 'D');
    pdf.line(104, y - 5, 104, y + 13);
    const fileName = `${customer.name.replace(/[^a-z0-9ğ��şöçıİĞÜŞÖÇ]+/gi, '-').replace(/^-|-$/g, '') || 'musteri'}-raporu.pdf`;
    const pdfBlob = pdf.output('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    if (preview) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    downloadLink.rel = 'noopener';
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  const handleSendWhatsAppReminder = (customer: Customer) => {
    if (!customer.phone) return;
  const message = `Hörmətli ${customer.name},
  ${settings.storeName} üzrə cari açıq hesab (nisyə) qalığınız ${formatCurrency(customer.balance)} təşkil edir.
  Ödənişinizi gözləyir, sizə uğurlar arzulayırıq.`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('994') ? cleanPhone : '994' + cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* 1. EN ÜST SIRA: MÜŞTERİ ARAMA & HIZLI İŞLEMLER */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Müşteri adı, telefon veya adres ile ara..."
              className="w-full h-11 pl-10 pr-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px] font-bold px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFilterDebtOnly(!filterDebtOnly)}
              className={`px-3.5 h-11 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap border ${
                filterDebtOnly
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Sadece Borçlular ({debtorCount})</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="px-4 h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Yeni Müşteri</span>
            </button>

            <button
              type="button"
              onClick={() => exportCustomersToCSV(customers)}
              className="px-3 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="CSV İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Müşteri İsimleri (Arama Alanının Hemen Altında) */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Müşteri İsimleri:
            </span>
            <button
              type="button"
              onClick={() => setSearch('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                !search
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tümü ({customers.length})
            </button>
            {sortedCustomers.map((c) => {
              const isSelected = search.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSearch(isSelected ? '' : c.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  <span>{c.name}</span>
                  {c.balance > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {formatCurrency(c.balance)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button type="button" onClick={() => setCustomerListOpen((open) => !open)} aria-expanded={customerListOpen} className="flex w-full items-center justify-between border-b border-slate-200 px-1 py-3 text-left dark:border-slate-800">
        <span><span className="block text-sm font-black text-slate-900 dark:text-slate-100">Müşteri Listesi</span><span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{filteredCustomers.length} müşteri</span></span><span className="flex items-center gap-2 text-xs font-bold text-emerald-600"><span>{customerListOpen ? 'Kapat' : 'Aç'}</span><ChevronDown className={`h-4 w-4 transition-transform ${customerListOpen ? 'rotate-180' : ''}`} /></span>
      </button>

      {/* Customers List */}
      {customerListOpen ? (
      <div className="mt-3 overflow-hidden border-b border-slate-200 pb-4 dark:border-slate-800">
      <div className="overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Müşteri Listesi ({filteredCustomers.length})
            </span>
            {search && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                "{search}" için sonuçlar
              </span>
            )}
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.map((c) => {
            const hasDebt = c.balance > 0;
            return (
              <div
                key={c.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setHistoryCustomer(c); setSelectedHistoryMonth(null); }}
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline underline-offset-2 text-left"
                      title="Müşteri geçmişini görüntüle"
                    >
                      {c.name}
                    </button>
                    {c.balance > 0 ? (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        Borçlu: {formatCurrency(c.balance)}
                      </span>
                    ) : c.balance < 0 ? (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        Alacaklı (Avans): {formatCurrency(Math.abs(c.balance))}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        Borçsuz
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {c.phone ? (
                      <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Telefon yok</span>
                    )}
                    {c.address && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[200px]">{c.address}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>Toplam Alışveriş: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(c.totalPurchases)}</strong></span>
                  </div>

                  {c.notes && (
                    <p className="text-[11px] text-slate-400 italic mt-1 line-clamp-1">
                      {c.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  {/* Collection / customer balance settlement */}
                  {c.balance !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors ${hasDebt ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      title={hasDebt ? 'Tahsilat Al' : 'Müşteriye Ödeme Yap'}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>{hasDebt ? 'Tahsilat Al' : 'Tahsilat Al'}</span>
                    </button>
                  )}

                  {/* WhatsApp Reminder */}
                  {c.phone && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(c)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                      title="WhatsApp ile Mesaj Gönder"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  {/* Edit & Delete */}
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomer(c.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs">
              Kayıtlı müşteri bulunamadı.
            </div>
          )}
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 block">Kayıtlı Müşteri</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {customers.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 block">Toplam Alacak (Veresiye)</span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {formatCurrency(totalReceivables)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 block">Borçlu Müşteri Sayısı</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {debtorCount} kişi
          </span>
        </div>
      </div>
      </div>
      ) : null}

      {/* Customer History Modal */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Müşteri Geçmişi</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-slate-500">{historyCustomer.name} · {customerSales.length} satış</p>
                  <button type="button" onClick={() => handleExportCustomerPdf(historyCustomer)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-700" title="PDF indir">
                    <Download className="w-3 h-3" /> PDF indir
                  </button>
                  <button type="button" onClick={() => handleExportCustomerPdf(historyCustomer, true)} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-sky-700" title="PDF görüntüle ve paylaş">
                    <Eye className="w-3 h-3" /> PDF görüntüle
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <p>Son aldığı: <span className="font-bold text-slate-900 dark:text-white">{purchaseSummary.latestProductNames.length > 0 ? purchaseSummary.latestProductNames.join(', ') : 'Ürün yok'}</span> · {purchaseSummary.latestQuantity} adet{purchaseSummary.latestDate && <> · {formatDate(purchaseSummary.latestDate)}</>}</p>
                  <p>En fazla aldığı gün: <span className="font-bold text-slate-900 dark:text-white">{purchaseSummary.busiestQuantity} ürün</span>{purchaseSummary.busiestDate && <> · {formatDate(purchaseSummary.busiestDate)}</>}</p>
  <p>Son 3 ayda aldığı: <span className="font-bold text-emerald-600 dark:text-emerald-400">{purchaseSummary.lastThreeMonthsQuantity} ürün</span></p>
{selectedPeriodProductTotals.length > 0 && (
  <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{selectedPeriodLabel} Toplamı</p>
  <div className="space-y-1">{selectedPeriodProductTotals.map(([product, quantity]) => <p key={product} className="flex justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-300"><span>{product}</span><span className="font-bold text-slate-900 dark:text-white">{quantity} adet</span></p>)}</div>
    </div>
  )}
  </div>
              </div>
              <button type="button" onClick={() => setHistoryCustomer(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Geçmişi kapat">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[65vh] space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => setSelectedHistoryMonth(null)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold ${selectedHistoryMonth === null ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Tümü</button>
                {historyMonths.map((month) => <button key={month} type="button" onClick={() => setSelectedHistoryMonth(month)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold capitalize ${selectedHistoryMonth === month ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{formatMonth(month)}</button>)}
              </div>
              {filteredHistorySales.length === 0 && filteredHistoryPayments.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">Bu ay için işlem geçmişi bulunamadı.</div>
              ) : (
                [...filteredHistorySales.map((sale) => ({ type: 'sale' as const, date: sale.createdAt, record: sale })), ...filteredHistoryPayments.map((payment) => ({ type: 'payment' as const, date: payment.createdAt, record: payment }))]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .map((entry) => entry.type === 'sale' ? (
                    <div key={entry.record.id} role="button" tabIndex={0} onClick={() => onSelectSaleForReceipt(entry.record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectSaleForReceipt(entry.record); }} className={`cursor-pointer rounded-xl border p-3 ${entry.record.paymentMethod === 'credit' ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20' : 'border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20'}`}>
                      <div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase ${entry.record.paymentMethod === 'credit' ? 'text-amber-700 dark:text-amber-300' : 'text-sky-700 dark:text-sky-300'}`}>{entry.record.paymentMethod === 'credit' ? 'Veresiye satış' : entry.record.paymentMethod === 'cash' ? 'Nakit satış' : 'Qarışıq ödəniş'}</p><p className="text-xs font-bold text-slate-900 dark:text-white">#{entry.record.invoiceNo}</p><p className="text-[11px] text-slate-500">{formatDate(entry.record.createdAt)}</p></div><span className={`text-sm font-bold ${entry.record.paymentMethod === 'credit' ? 'text-amber-700 dark:text-amber-300' : 'text-sky-700 dark:text-sky-300'}`}>{formatCurrency(entry.record.total)}</span></div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2">{entry.record.items.map((item) => `${item.productName} x${item.quantity} · ${formatCurrency(item.unitPrice)}`).join(', ')}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); startEditingSale(entry.record); }} className="inline-flex items-center gap-1 rounded-lg bg-white/70 dark:bg-slate-900/50 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-200"><Edit2 className="h-3 w-3" /> Fişi düzenle</button><button type="button" onClick={(event) => { event.stopPropagation(); if (window.confirm('Bu fişi kaldırmak istediğinizden emin misiniz?')) onDeleteSale(entry.record.id); }} className="inline-flex items-center gap-1 rounded-lg bg-rose-100/80 px-2 py-1 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><Trash2 className="h-3 w-3" /> Fişi kaldır</button></div>
                    </div>
                  ) : (
                    <div key={entry.record.id} className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Tahsilat</p><p className="text-xs font-bold text-slate-900 dark:text-white">{formatDate(entry.record.createdAt)}</p><p className="text-[11px] text-slate-500">{entry.record.notes || 'Ödeme alındı'}</p></div><span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">-{formatCurrency(entry.record.amount)}</span></div></div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {editingSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-slate-900 dark:text-white">Eski fişi düzenle</h3><p className="text-[11px] text-slate-500">Fiş #{editingSale.invoiceNo}</p></div><button type="button" onClick={() => setEditingSale(null)} className="rounded-lg p-2 text-slate-400"><X className="h-4 w-4" /></button></div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
              {editingItems.map((item, index) => <div key={item.id} className="grid grid-cols-[1fr_72px_88px] items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{item.productName}</span><input aria-label={`${item.productName} miktar`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setEditingItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, quantity: Number(event.target.value) } : current))} className="h-9 rounded-lg border bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" /><input aria-label={`${item.productName} fiyat`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setEditingItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, unitPrice: Number(event.target.value) } : current))} className="h-9 rounded-lg border bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" /></div>)}
            </div>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditingSale(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500">Vazgeç</button><button type="button" onClick={saveEditedSale} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Kaydet</button></div>
          </div>
        </div>
      )}

      {/* Payment / Tahsilat Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Tahsilat Girişi
                </h3>
                <p className="text-[11px] text-slate-500">
                  {paymentCustomer.name} · Borç: {formatCurrency(paymentCustomer.balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentCustomer(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tahsil Edilen / Verilen Tutar (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-999999"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                />
                {paymentAmount < 0 ? (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Verilen tutar: satış kaydı olarak müşterinin borcuna {formatCurrency(Math.abs(paymentAmount))} eklenecek.
                  </p>
                ) : paymentAmount > paymentCustomer.balance ? (
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Fazla ödeme: {formatCurrency(paymentAmount - paymentCustomer.balance)} müşterinin hesabına alacak olarak eklenecek.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Ödeme Yöntemi
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cash', label: 'Nakit' },
                    { id: 'mixed', label: 'Karışık' },
                    { id: 'transfer', label: 'Havale' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        paymentMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Kısmi ödeme, elden alındı vb."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Tahsilatı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {modalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {modalMode === 'add' ? 'Yeni Müşteri İlave Et' : 'Müşteriyi Düzenle'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Müşteri Adı Soyadı / Firma Ünvanı <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Azərbaycan <span className="text-slate-400 font-normal">(İsteğe Bağlı)</span>
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+994 50 123 45 67 (İsteğe bağl��)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  E-posta Adresi (İsteğe Bağlı)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ornek@posta.com"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Adres
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Mahalle, Cadde, No, İlçe / İl"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Özel Notlar
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Açık hesap limiti, ödeme günleri vb."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {modalMode === 'add' ? 'Müşteriyi Kaydet' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
