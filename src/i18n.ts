export type AppLanguage = 'tr' | 'az' | 'en' | 'ru';

export const LANGUAGE_OPTIONS: Array<{ id: AppLanguage; label: string; nativeLabel: string }> = [
  { id: 'tr', label: 'Türkçe', nativeLabel: 'Türkçe' },
  { id: 'az', label: 'Azerbaycanca', nativeLabel: 'Azərbaycan dili' },
  { id: 'en', label: 'İngilizce', nativeLabel: 'English' },
  { id: 'ru', label: 'Rusça', nativeLabel: 'Русский' },
];

const dictionary: Record<AppLanguage, Record<string, string>> = {
  tr: {},
  // Common labels are kept in one place so switching from one translated language to another can always resolve back to Turkish.

  az: {
    'Satış': 'Satış', 'Satış Yap': 'Satış Et', 'Hızlı perakende satış ekranı': 'Sürətli pərakəndə satış ekranı', 'Hızlı Satış': 'Sürətli Satış', 'Hızlı Butonlar': 'Sürətli Düymələr', 'Hızlı Adet Butonları': 'Sürətli Miqdar Düymələri', 'Müşteri seç': 'Müştəri seçin', 'Müşteri Seçimi': 'Müştəri Seçimi', 'Satışı kimin hesabına işlemek istediğinizi seçin.': 'Satışı kimin hesabına yazmaq istədiyinizi seçin.', 'Satışı kimin hesabına işlemek istediğinizi seçin.': 'Satışı kimin hesabına yazmaq istədiyinizi seçin.', 'Müşteri seçimini kapat': 'Müştəri seçimini bağlayın', 'Favori Ürünler': 'Sevimli Məhsullar', 'Yönet / Ekle': 'İdarə Et / Əlavə Et', 'Favori Ürünleri Seç': 'Sevimli Məhsulları Seç', 'Favori Ürünleri Belirle': 'Sevimli Məhsulları Müəyyən Et', 'Müşteriler': 'Müştərilər', 'Ürünler': 'Məhsullar', 'Stok': 'Anbar', 'Ayarlar': 'Parametrlər',
    'Giderler': 'Xərclər', 'Raporlar': 'Hesabatlar', 'Yedekleme İşlemleri': 'Yedəkləmə Əməliyyatları', 'Temalar': 'Mövzular', 'Tema': 'Mövzu', 'Işık veya gece modunu seçin': 'İşıq və ya gecə rejimini seçin', 'Işık modu': 'İşıq rejimi', 'Gece modu': 'Gecə rejimi',
    'Diller': 'Dillər', 'Dil seçin': 'Dil seçin', 'Program dilini seçin': 'Proqram dilini seçin', 'Aç': 'Aç', 'Kapat': 'Bağla', 'Kaydet': 'Yadda saxla', 'Görünüm temasını buradan seçin': 'Görünüş mövzusunu buradan seçin',
    'Toplam Satış': 'Ümumi Satış', 'Total Alışveriş': 'Ümumi Alış-Veriş', 'Haftalık düzenli müşteri, veresiye açık hesap.': 'Həftəlik daimi müştəri, nisyə açıq hesab.', 'Toplam Tahsilat': 'Ümumi Ödəniş', 'Fişi görüntüle': 'Qəbzə bax',
    'Tahsilat Al': 'Ödəniş Al', 'Ödeme Al': 'Ödəniş Al', 'Payment Al': 'Collect Payment', 'Ödəniş Al': 'Ödəniş Al', 'Müşteri Geçmişi': 'Müştəri Tarixçəsi', 'Ürün / Açıklama': 'Məhsul / Açıqlama',
    'Tutar': 'Məbləğ', 'Adet': 'Say', 'Tarih': 'Tarix', 'İşlem': 'Əməliyyat', 'Yeni Müşteri': 'Yeni Müştəri', 'Müşteri Ara': 'Müştəri Axtar', 'Müşteri Geçmişi': 'Müştəri Tarixçəsi', 'Düzenle': 'Redaktə Et', 'Sil': 'Sil', 'İptal': 'Ləğv Et', 'Telefon': 'Telefon', 'Adres': 'Ünvan', 'Not': 'Qeyd', 'Ödeme Yöntemi': 'Ödəniş Üsulu', 'Nakit': 'Nağd', 'Kart': 'Kart', 'Havale': 'Bank Köçürməsi', 'Tutar (₺)': 'Məbləğ', 'Tahsilatı kaydet': 'Ödənişi Yadda Saxla', 'PDF indir': 'PDF Yüklə', 'PDF görüntüle': 'PDF-ə Bax', 'Toplam': 'Ümumi', 'Genel Müşteri': 'Ümumi Müştəri', 'Ürün adı': 'Məhsul Adı', 'Açıklama': 'Açıqlama', 'Ürün': 'Məhsul', 'Müşteri': 'Müştəri', 'Satış Geçmişi': 'Satış Tarixçəsi', 'Satış Ekranı': 'Satış Ekranı', 'Ürün Ekle': 'Məhsul Əlavə Et', 'Müşteri Ekle': 'Müştəri Əlavə Et', 'Sepet': 'Səbət', 'Ödeme': 'Ödəniş', 'Borc': 'Borc', 'Alacak': 'Alacaq', 'Fiyat': 'Qiymət', 'Miktar': 'Miqdar', 'Toplam Tutar': 'Ümumi Məbləğ', 'Ara': 'Axtar', 'Temizle': 'Təmizlə', 'Uygula': 'Tətbiq Et', 'Kapat': 'Bağla', 'Geri': 'Geri', 'İleri': 'Növbəti', 'Bugün': 'Bu Gün', 'Bu Ay': 'Bu Ay', 'Tüm Dönem': 'Bütün Dövr',
  },
  en: {
    'Satış': 'Sales', 'Satış Yap': 'Make a Sale', 'Hızlı perakende satış ekranı': 'Fast retail sales screen', 'Hızlı Satış': 'Quick Sale', 'Hızlı Butonlar': 'Quick Buttons', 'Hızlı Adet Butonları': 'Quick Quantity Buttons', 'Müşteri seç': 'Select Customer', 'Müşteri Seçimi': 'Customer Selection', 'Satışı kimin hesabına işlemek istediğinizi seçin.': 'Choose whose account to charge this sale to.', 'Müşteri seçimini kapat': 'Close customer selection', 'Favori Ürünler': 'Favorite Products', 'Yönet / Ekle': 'Manage / Add', 'Favori Ürünleri Seç': 'Select Favorite Products', 'Favori Ürünleri Belirle': 'Set Favorite Products', 'Müşteriler': 'Customers', 'Ürünler': 'Products', 'Stok': 'Stock', 'Ayarlar': 'Settings',
    'Giderler': 'Expenses', 'Raporlar': 'Reports', 'Yedekleme İşlemleri': 'Backup Operations', 'Temalar': 'Themes', 'Tema': 'Theme', 'Işık veya gece modunu seçin': 'Choose light or night mode', 'Işık modu': 'Light mode', 'Gece modu': 'Night mode',
    'Diller': 'Languages', 'Dil seçin': 'Choose language', 'Program dilini seçin': 'Choose the program language', 'Aç': 'Open', 'Kapat': 'Close', 'Kaydet': 'Save', 'Görünüm temasını buradan seçin': 'Choose the appearance theme here',
    'Toplam Satış': 'Total Sales', 'Total Alışveriş': 'Total Purchases', 'Haftalık düzenli müşteri, veresiye açık hesap.': 'Weekly regular customer, open credit account.', 'Toplam Tahsilat': 'Total Collections', 'Fişi görüntüle': 'View Receipt',
    'Tahsilat Al': 'Collect Payment', 'Ödeme Al': 'Collect Payment', 'Payment Al': 'Collect Payment', 'Ödəniş Al': 'Collect Payment', 'Müşteri Geçmişi': 'Customer History', 'Ürün / Açıklama': 'Product / Description',
    'Tutar': 'Amount', 'Adet': 'Quantity', 'Tarih': 'Date', 'İşlem': 'Transaction', 'Yeni Müşteri': 'New Customer', 'Müşteri Ara': 'Search customers', 'Düzenle': 'Edit', 'Sil': 'Delete', 'İptal': 'Cancel', 'Telefon': 'Phone', 'Adres': 'Address', 'Not': 'Note', 'Ödeme Yöntemi': 'Payment Method', 'Nakit': 'Cash', 'Kart': 'Card', 'Havale': 'Bank Transfer', 'Tahsilatı kaydet': 'Save Payment', 'PDF indir': 'Download PDF', 'PDF görüntüle': 'View PDF', 'Toplam': 'Total', 'Genel Müşteri': 'General Customer', 'Ürün adı': 'Product Name', 'Açıklama': 'Description', 'Ürün': 'Product', 'Müşteri': 'Customer', 'Satış Geçmişi': 'Sales History', 'Tamamlanan ve iptal edilen tüm perakende satış makbuzları': 'All completed and cancelled retail sales receipts', 'Satış Ekranı': 'Sales Screen', 'Ürün Ekle': 'Add Product', 'Müşteri Ekle': 'Add Customer', 'Sepet': 'Cart', 'Ödeme': 'Payment', 'Borc': 'Debt', 'Alacak': 'Receivable', 'Fiyat': 'Price', 'Miktar': 'Quantity', 'Toplam Tutar': 'Total Amount', 'Ara': 'Search', 'Temizle': 'Clear', 'Uygula': 'Apply', 'Geri': 'Back', 'İleri': 'Next', 'Bugün': 'Today', 'Bu Ay': 'This Month', 'Tüm Dönem': 'All Time',
  },
  ru: {
    'Satış': 'Продажи', 'Satış Yap': 'Оформить продажу', 'Hızlı perakende satış ekranı': 'Экран быстрой розничной продажи', 'Hızlı Satış': 'Быстрая продажа', 'Hızlı Butonlar': 'Быстрые кнопки', 'Hızlı Adet Butonları': 'Кнопки быстрого количества', 'Müşteri seç': 'Выберите клиента', 'Müşteri Seçimi': 'Выбор клиента', 'Satışı kimin hesabına işlemek istediğinizi seçin.': 'Выберите, на чей счёт оформить эту продажу.', 'Müşteri seçimini kapat': 'Закрыть выбор клиента', 'Favori Ürünler': 'Избранные товары', 'Yönet / Ekle': 'Управить / Добавить', 'Favori Ürünleri Seç': 'Выбрать избранные товары', 'Favori Ürünleri Belirle': 'Настроить избранные товары', 'Müşteriler': 'Клиенты', 'Ürünler': 'Товары', 'Stok': 'Склад', 'Ayarlar': 'Настройки',
    'Giderler': 'Расходы', 'Raporlar': 'Отчёты', 'Yedekleme İşlemleri': 'Резервное копирование', 'Temalar': 'Темы', 'Tema': 'Тема', 'Işık veya gece modunu seçin': 'Выберите светлый или ночной режим', 'Işık modu': 'Светлый режим', 'Gece modu': 'Ночной режим',
    'Diller': 'Языки', 'Dil seçin': 'Выберите язык', 'Program dilini seçin': 'Выберите язык программы', 'Aç': 'Открыть', 'Kapat': 'Закрыть', 'Kaydet': 'Сохранить', 'Görünüm temasını buradan seçin': 'Выберите тему оформления',
    'Toplam Satış': 'Итого продаж', 'Total Alışveriş': 'Общие покупки', 'Haftalık düzenli müşteri, veresiye açık hesap.': 'Постоянный еженедельный клиент, открытый кредитный счёт.', 'Toplam Tahsilat': 'Итого оплат', 'Fişi görüntüle': 'Просмотр чека',
    'Tahsilat Al': 'Принять оплату', 'Ödeme Al': 'Принять оплату', 'Payment Al': 'Принять оплату', 'Ödəniş Al': 'Принять оплату', 'Müşteri Geçmişi': 'История клиента', 'Ürün / Açıklama': 'Товар / Описание',
    'Tutar': 'Сумма', 'Adet': 'Количество', 'Tarih': 'Дата', 'İşlem': 'Операция', 'Yeni Müşteri': 'Новый клиент', 'Müşteri Ara': 'Поиск клиентов', 'Düzenle': 'Изменить', 'Sil': 'Удалить', 'İptal': 'Отмена', 'Telefon': 'Телефон', 'Adres': '��дрес', 'Not': 'Примечание', 'Ödeme Yöntemi': 'Способ оплаты', 'Nakit': 'Наличные', 'Kart': 'Карта', 'Havale': 'Банковский перевод', 'Tahsilatı kaydet': 'Сохранить оплату', 'PDF indir': 'Скачать PDF', 'PDF görüntüle': 'Просмотр PDF', 'Toplam': 'Итого', 'Genel Müşteri': 'Общий клиент', 'Ürün adı': 'Название товара', 'Açıklama': 'Описание', 'Ürün': 'Товар', 'Müşteri': 'Клиент', 'Satış Geçmişi': 'История продаж', 'Tamamlanan ve iptal edilen tüm perakende satış makbuzları': 'Все чеки завершённых и отменённых розничных продаж', 'Satış Ekranı': 'Экран продаж', 'Ürün Ekle': 'Добавить товар', 'Müşteri Ekle': 'Добавить клиента', 'Sepet': 'Корзина', 'Ödeme': 'Оплата', 'Borc': 'Долг', 'Alacak': 'Дебиторская задолженность', 'Fiyat': 'Цена', 'Miktar': 'Количество', 'Toplam Tutar': 'Общая сумма', 'Ara': 'Поиск', 'Temizle': 'Очистить', 'Uygula': 'Применить', 'Geri': 'Назад', 'İleri': 'Далее', 'Bugün': 'Сегодня', 'Bu Ay': 'Этот месяц', 'Tüm Dönem': 'Весь период',
  },
};

function resolveSourceText(value: string): string {
  for (const translations of Object.values(dictionary)) {
    const source = Object.entries(translations).find(([, translated]) => translated === value)?.[0];
    if (source) return source;
  }
  return value;
}

export function translateText(value: string, language: AppLanguage): string {
  const dynamicTotal = value.match(/^(?:Total Alışveriş|Toplam Alışveriş|Ümumi Alış-Veriş|Total Purchases|Общие покупки):\s*(.+)$/);
  if (dynamicTotal) {
    const labels: Record<AppLanguage, string> = { tr: 'Toplam Alışveriş', az: 'Ümumi Alış-Veriş', en: 'Total Purchases', ru: 'Общие покупки' };
    return `${labels[language]}: ${dynamicTotal[1]}`;
  }
  const source = resolveSourceText(value);
  const exact = dictionary[language][source];
  if (exact) return exact;

  return Object.entries(dictionary[language])
    .filter(([key]) => key.length > 1 && source.includes(key))
    .sort(([a], [b]) => b.length - a.length)
    .reduce((result, [key, translated]) => result.split(key).join(translated), source);
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
    if (!value || value.length > 120) return;
    const translated = translateText(value, language);
    if (translated !== value) textNode.nodeValue = textNode.nodeValue!.replace(value, translated);
  });

  document.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]').forEach((element) => {
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translateText(value, language));
    }
  });
}
