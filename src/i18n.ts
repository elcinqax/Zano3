export type AppLanguage = 'tr' | 'az' | 'en' | 'ru';

export const LANGUAGE_OPTIONS: Array<{ id: AppLanguage; label: string; nativeLabel: string }> = [
  { id: 'tr', label: 'Türkçe', nativeLabel: 'Türkçe' },
  { id: 'az', label: 'Azerbaycanca', nativeLabel: 'Azərbaycan dili' },
  { id: 'en', label: 'İngilizce', nativeLabel: 'English' },
  { id: 'ru', label: 'Rusça', nativeLabel: 'Русский' },
];

const dictionary: Record<AppLanguage, Record<string, string>> = {
  tr: {},
  az: {
    'Satış': 'Satış', 'Müşteriler': 'Müştərilər', 'Ürünler': 'Məhsullar', 'Stok': 'Anbar', 'Ayarlar': 'Parametrlər',
    'Giderler': 'Xərclər', 'Raporlar': 'Hesabatlar', 'Yedekleme İşlemleri': 'Yedəkləmə Əməliyyatları', 'Temalar': 'Mövzular',
    'Diller': 'Dillər', 'Dil seçin': 'Dil seçin', 'Program dilini seçin': 'Proqram dilini seçin', 'Aç': 'Aç', 'Kapat': 'Bağla', 'Kaydet': 'Yadda saxla', 'Görünüm temasını buradan seçin': 'Görünüş mövzusunu buradan seçin',
    'Toplam Satış': 'Ümumi Satış', 'Toplam Tahsilat': 'Ümumi Ödəniş', 'Fişi görüntüle': 'Qəbzə bax',
    'Tahsilat Al': 'Ödəniş Al', 'Müşteri Geçmişi': 'Müştəri Tarixçəsi', 'Ürün / Açıklama': 'Məhsul / Açıqlama',
    'Tutar': 'Məbləğ', 'Adet': 'Say', 'Tarih': 'Tarix', 'İşlem': 'Əməliyyat',
  },
  en: {
    'Satış': 'Sales', 'Müşteriler': 'Customers', 'Ürünler': 'Products', 'Stok': 'Stock', 'Ayarlar': 'Settings',
    'Giderler': 'Expenses', 'Raporlar': 'Reports', 'Yedekleme İşlemleri': 'Backup Operations', 'Temalar': 'Themes',
    'Diller': 'Languages', 'Dil seçin': 'Choose language', 'Program dilini seçin': 'Choose the program language', 'Aç': 'Open', 'Kapat': 'Close', 'Kaydet': 'Save', 'Görünüm temasını buradan seçin': 'Choose the appearance theme here',
    'Toplam Satış': 'Total Sales', 'Toplam Tahsilat': 'Total Collections', 'Fişi görüntüle': 'View Receipt',
    'Tahsilat Al': 'Collect Payment', 'Müşteri Geçmişi': 'Customer History', 'Ürün / Açıklama': 'Product / Description',
    'Tutar': 'Amount', 'Adet': 'Quantity', 'Tarih': 'Date', 'İşlem': 'Transaction',
  },
  ru: {
    'Satış': 'Продажи', 'Müşteriler': 'Клиенты', 'Ürünler': 'Товары', 'Stok': 'Склад', 'Ayarlar': 'Настройки',
    'Giderler': 'Расходы', 'Raporlar': 'Отчёты', 'Yedekleme İşlemleri': 'Резервное копирование', 'Temalar': 'Темы',
    'Diller': 'Языки', 'Dil seçin': 'Выберите язык', 'Program dilini seçin': 'Выберите язык программы', 'Aç': 'Открыть', 'Kapat': 'Закрыть', 'Kaydet': 'Сохранить', 'Görünüm temasını buradan seçin': 'Выберите тему оформления',
    'Toplam Satış': 'Итого продаж', 'Toplam Tahsilat': 'Итого оплат', 'Fişi görüntüle': 'Просмотр чека',
    'Tahsilat Al': 'Принять оплату', 'Müşteri Geçmişi': 'История клиента', 'Ürün / Açıklama': 'Товар / Описание',
    'Tutar': 'Сумма', 'Adet': 'Количество', 'Tarih': 'Дата', 'İşlem': 'Операция',
  },
};

export function translateText(value: string, language: AppLanguage): string {
  return dictionary[language][value] || value;
}

export function translateDocument(language: AppLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  nodes.forEach((textNode) => {
    const value = textNode.nodeValue?.trim();
    if (!value || value.length > 80) return;
    const translated = translateText(value, language);
    if (translated !== value) textNode.nodeValue = textNode.nodeValue!.replace(value, translated);
  });
}
