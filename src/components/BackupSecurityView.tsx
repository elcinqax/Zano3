import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  Fingerprint,
  Lock,
  Download,
  Upload,
  Cloud,
  FileSpreadsheet,
  FileCode,
  Store,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Code,
  Share2,
  Smartphone,
  Sliders,
  Clock,
  HardDrive,
  FolderDown,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, DatabaseDump, Sale, Customer, Product } from '../types';
import { SQLITE_SCHEMA_DDL, sqliteStorage } from '../db/sqlite-storage';
import {
  exportToExcel,
  exportSalesToCSV,
  exportCustomersToCSV,
  exportProductsToCSV,
  downloadFile,
  shareOrSaveFile,
} from '../utils/export-utils';
import { formatDateTime } from '../utils/formatters';

const normalizeWhatsappNumber = (raw: string) => raw.replace(/\D/g, '').replace(/^00/, '');

interface BackupSecurityViewProps {
  settings: AppSettings;
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onRestoreBackup: (dump: DatabaseDump) => void;
  onResetToSampleData: () => void;
  onResetAllReports?: () => void;
}

export const BackupSecurityView: React.FC<BackupSecurityViewProps> = ({
  settings,
  sales,
  customers,
  products,
  onUpdateSettings,
  onRestoreBackup,
  onResetToSampleData,
  onResetAllReports,
}) => {
  // Store profile
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);
  const [currency, setCurrency] = useState(settings.currency || '₼');
  const [screenTopPadding, setScreenTopPadding] = useState<'auto' | 'compact' | 'large' | 'zero'>(
    settings.screenTopPadding || 'auto'
  );

  // Security
  const [isPinEnabled, setIsPinEnabled] = useState(settings.isPinEnabled);
  const [pinCode, setPinCode] = useState(settings.pinCode);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(settings.isBiometricEnabled);
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Backup Settings State
  const [backupWhatsappNumber, setBackupWhatsappNumber] = useState<string>(
    settings.backupWhatsappNumber ?? settings.storePhone ?? ''
  );
  const [isOneClickBackingUp, setIsOneClickBackingUp] = useState(false);
  const [autoBackupReminder, setAutoBackupReminder] = useState<'daily' | 'weekly' | 'never'>(
    settings.autoBackupReminder || 'daily'
  );
  const [autoBackupOnDayEnd, setAutoBackupOnDayEnd] = useState<boolean>(
    settings.autoBackupOnDayEnd ?? true
  );

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Helper to build standardized filename
  const getStandardBackupFileName = (ext: 'json' | 'sql' = 'json') => {
    const cleanStore = (storeName || 'MobilSatis')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 20);
    const dateStr = new Date().toISOString().slice(0, 10);
    return `${cleanStore}_Yedek_${dateStr}.${ext}`;
  };

  // --- Handlers: Phone / Device Storage ---
  const handlePhoneDownloadJSON = () => {
    const dump = sqliteStorage.exportJSONDump();
    const jsonStr = JSON.stringify(dump, null, 2);
    const filename = getStandardBackupFileName('json');

    downloadFile(jsonStr, filename, 'application/json');
    const nowIso = new Date().toISOString();
    onUpdateSettings({
      lastBackupDate: nowIso,
      lastPhoneBackupDate: nowIso,
    });
    showNotification(`"${filename}" telefonunuza başarıyla indirildi.`, 'success');
    return true;
  };

  const handlePhoneShareOrSave = async () => {
    const dump = sqliteStorage.exportJSONDump();
    const jsonStr = JSON.stringify(dump, null, 2);
    const filename = getStandardBackupFileName('json');

    const res = await shareOrSaveFile(jsonStr, filename, 'application/json');
    const nowIso = new Date().toISOString();
    onUpdateSettings({
      lastBackupDate: nowIso,
      lastPhoneBackupDate: nowIso,
    });

    if (res.method === 'share') {
      showNotification('Telefonda paylaşım / kaydetme penceresi açıldı.', 'success');
    } else if (res.method === 'download') {
      showNotification(`"${filename}" telefonunuza indirildi.`, 'success');
    }
  };

  const handlePhoneSQLDump = () => {
    const sql = sqliteStorage.exportSQLDump();
    const filename = getStandardBackupFileName('sql');
    downloadFile(sql, filename, 'application/sql');
    showNotification(`SQLite (.sql) veritabanı dosyası telefonunuza indirildi.`, 'success');
  };

  const handleFileRestoreFromPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as DatabaseDump;
        if (!parsed.tables || !parsed.tables.products) {
          alert('Geçersiz yedek dosyası formatı!');
          return;
        }
        if (confirm('Yedekten geri yükleme mevcut verilerin üzerine yazacaktır. Devam etmek istiyor musunuz?')) {
          onRestoreBackup(parsed);
          showNotification('Telefonunuzdaki yedek başarıyla sisteme geri yüklendi!', 'success');
        }
      } catch (err) {
        alert('Yedek dosyası okunurken hata oluştu. Lütfen geçerli bir .json yedeği seçiniz.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Handlers: Backup Settings Save & One-Click Backup ---
  const handleSaveBackupSettings = () => {
    onUpdateSettings({
      backupWhatsappNumber: backupWhatsappNumber.trim(),
      autoBackupReminder: autoBackupReminder,
      autoBackupOnDayEnd: autoBackupOnDayEnd,
    });
    showNotification('Yedek alma ayarları kaydedildi.', 'success');
  };

  const handleOneClickBackup = async () => {
    const whatsappNumber = normalizeWhatsappNumber(backupWhatsappNumber);
    if (whatsappNumber.length < 8) {
      showNotification('Lütfen yedeğin gönderileceği WhatsApp numaranızı ülke koduyla girin (örn: 994707499991).', 'error');
      return;
    }

    setIsOneClickBackingUp(true);
    try {
      const dump = sqliteStorage.exportJSONDump();
      const jsonStr = JSON.stringify(dump, null, 2);
      const filename = getStandardBackupFileName('json');
      const nowIso = new Date().toISOString();

      downloadFile(jsonStr, filename, 'application/json');
      onUpdateSettings({
        lastBackupDate: nowIso,
        lastPhoneBackupDate: nowIso,
        backupWhatsappNumber: backupWhatsappNumber.trim(),
      });

      const message = `${storeName || 'MobilSatış'} yedeği - ${formatDateTime(nowIso)}\nDosya: ${filename}`;
      const file = new File([jsonStr], filename, { type: 'application/json' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename, text: message });
          showNotification('Yedek telefona kaydedildi. WhatsApp\'ta kendi numaranızı seçip gönderin.', 'success');
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            showNotification('Yedek telefona kaydedildi. WhatsApp gönderimi iptal edildi.', 'info');
            return;
          }
        }
      }

      window.open(
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`${message}\n(Yedek dosyası telefonun İndirilenler klasörüne kaydedildi.)`)}`,
        '_blank'
      );
      showNotification(`Yedek telefona kaydedildi ve WhatsApp (+${whatsappNumber}) açıldı. İndirilen dosyayı sohbete ekleyin.`, 'success');
    } finally {
      setIsOneClickBackingUp(false);
    }
  };

  // Store profile handler
  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      storeName: storeName.trim(),
      storePhone: storePhone.trim(),
      storeAddress: storeAddress.trim(),
      currency: currency.trim() || '₼',
    });
    showNotification('Mağaza ve fiş bilgileri başarıyla kaydedildi.', 'success');
  };

  const handleUpdateScreenPadding = (padding: 'auto' | 'compact' | 'large' | 'zero') => {
    setScreenTopPadding(padding);
    onUpdateSettings({ screenTopPadding: padding });
    showNotification('Ekran ve üst panel ayarları güncellendi.', 'success');
  };

  const handleTogglePin = (enabled: boolean) => {
    setIsPinEnabled(enabled);
    onUpdateSettings({ isPinEnabled: enabled });
    showNotification(enabled ? 'PIN kilidi aktifleştirildi.' : 'PIN kilidi devre dışı bırakıldı.', 'info');
  };

  const handleSavePin = () => {
    if (pinCode.length < 4) {
      alert('PIN en az 4 haneli olmalıdır.');
      return;
    }
    onUpdateSettings({ pinCode, isPinEnabled: true });
    setIsPinEnabled(true);
    showNotification('PIN kodu başarıyla güncellendi.', 'success');
  };

  const handleToggleBiometric = (enabled: boolean) => {
    setIsBiometricEnabled(enabled);
    onUpdateSettings({ isBiometricEnabled: enabled });
    showNotification(enabled ? 'Biyometrik doğrulama aktif edildi.' : 'Biyometrik doğrulama kapatıldı.', 'info');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Header & Quick Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Yedekleme & Sistem Ayarları</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Telefona yerel yedek, WhatsApp&apos;a gönderim ve SQLite güvenlik yönetimi
          </p>
        </div>

        {/* Big One-Click Backup Button */}
        <button
          type="button"
          disabled={isOneClickBackingUp}
          onClick={handleOneClickBackup}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          {isOneClickBackingUp ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Yedek Alınıyor...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Tek Tıkla Şimdi Yedekle</span>
            </>
          )}
        </button>
      </div>

      {/* Notification Toast */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              : feedbackMsg.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {feedbackMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          ) : feedbackMsg.type === 'info' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-blue-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Backup Solutions */}
        <div className="space-y-6">
          {/* Card 2: Telefona Yedek Alma (Phone & Local Storage) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Telefona Yedek Alma
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    İnternetsiz telefon hafızasına (.json / .sql) doğrudan kayıt
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                ÇEVRİMDIŞI · YEREL
              </span>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handlePhoneDownloadJSON}
                className="w-full h-11 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Telefona İndir (.json)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePhoneShareOrSave}
                  className="h-10 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  title="Android Paylaş Menüsü ile Dosyalara / WhatsApp'a Gönder"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Telefonda Paylaş</span>
                </button>

                <button
                  type="button"
                  onClick={handlePhoneSQLDump}
                  className="h-10 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  title="SQLite veri tabanı tam komut dökümü"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>SQLite (.sql) Al</span>
                </button>
              </div>

              {/* Restore from phone file */}
              <label className="w-full h-10 px-4 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Telefondan Yedek Dosyası Geri Yükle (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestoreFromPhone}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
              <span>Telefona Son Yedek:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {settings.lastPhoneBackupDate ? formatDateTime(settings.lastPhoneBackupDate) : 'Henüz alınmadı'}
              </span>
            </div>
          </div>

          {/* Card 3: Yedek Alma ve Otomasyon Ayarları (User Request Focus) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Yedek Alma Tercihleri & Ayarları
                </h2>
                <p className="text-[11px] text-slate-500">
                  Otomatik yedekleme kuralları ve hedef konum seçimi
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Setting 1: WhatsApp Yedek Numarası */}
              <div>
                <label
                  htmlFor="backup-whatsapp-number"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                >
                  Yedeğin Gönderileceği WhatsApp Numaranız:
                </label>
                <input
                  id="backup-whatsapp-number"
                  type="tel"
                  inputMode="tel"
                  value={backupWhatsappNumber}
                  onChange={(e) => setBackupWhatsappNumber(e.target.value)}
                  placeholder="+994 70 749 99 91"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-mono font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Ülke koduyla yazın. &quot;Tek Tıkla Şimdi Yedekle&quot; dosyayı telefona kaydeder ve WhatsApp ile bu numaraya gönderir.
                </p>
              </div>

              {/* Setting 2: Otomatik Yedek Hatırlatıcı */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Otomatik Yedek Hatırlatması:
                </label>
                <select
                  value={autoBackupReminder}
                  onChange={(e) => setAutoBackupReminder(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="daily">Her Gün (Akşam Kasa Kapanışında Hatırlat)</option>
                  <option value="weekly">Haftada Bir (Her Pazar Günü)</option>
                  <option value="never">Kapalı (Yalnızca El İle Alındığında)</option>
                </select>
              </div>

              {/* Setting 3: Satış Kapanışında Otomatik Uyarı */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Gün Sonu Kapanış Uyarısı
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Akşam son satış yapıldığında yedek almayı hatırlat
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoBackupOnDayEnd}
                  onChange={(e) => setAutoBackupOnDayEnd(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Save settings button */}
              <button
                type="button"
                onClick={handleSaveBackupSettings}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Yedekleme Ayarlarını Kaydet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Exports, Security, Profile & Reset */}
        <div className="space-y-6">
          {/* Card 4: Excel & CSV Export Suite */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Excel & Tablo Raporları
                </h2>
                <p className="text-[11px] text-slate-500">Excel ve CSV dosyaları ile anında dışa aktarma</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => exportToExcel(sales, customers, products, settings.storeName)}
                className="w-full h-11 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Çok Sekmeli Excel İndir (.xlsx)</span>
              </button>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => exportSalesToCSV(sales)}
                  className="h-9 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Satışlar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportCustomersToCSV(customers)}
                  className="h-9 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Müşteriler CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportProductsToCSV(products)}
                  className="h-9 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Ürünler CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 5: Şifreli Giriş & PIN Güvenliği */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Şifreli Giriş & PIN Güvenliği
                </h2>
                <p className="text-[11px] text-slate-500">Uygulama açılışında PIN veya parmak izi koruması</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  PIN Kilidi
                </span>
                <span className="text-[11px] text-slate-500">Açılışta PIN sorulsun</span>
              </div>
              <input
                type="checkbox"
                checked={isPinEnabled}
                onChange={(e) => handleTogglePin(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="4-6 haneli PIN"
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-center tracking-widest text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleSavePin}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                PIN Güncelle
              </button>
            </div>
          </div>

          {/* Card 6: Mağaza & Fiş Bilgileri */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Mağaza & Fiş Başlığı
                </h2>
                <p className="text-[11px] text-slate-500">Satış fişlerinde yer alacak işletme bilgileri</p>
              </div>
            </div>

            <form onSubmit={handleSaveStoreInfo} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  İşletme / Mağaza Adı
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Para Birimi Simgesi
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Adres
                </label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors"
              >
                Bilgileri Kaydet
              </button>
            </form>
          </div>

          {/* Card 7: Sistem Sıfırlama */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Veritabanı Sıfırlama & Yenileme
              </span>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Varsayılan örnek verileri yükle:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tüm veriler varsayılan örnek verilerle yenilenecektir. Onaylıyor musunuz?')) {
                      onResetToSampleData();
                      showNotification('Örnek veriler yeniden yüklendi.', 'info');
                    }
                  }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  Örnek Verileri Yükle
                </button>
              </div>

              {onResetAllReports && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                  <span className="text-[11px] text-rose-500 font-semibold">Tüm satış ve kasa raporlarını temizle:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('DİKKAT: Tüm satışlar, harcamalar ve kasa hareketleri sıfırlanacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
                        onResetAllReports();
                        showNotification('Tüm raporlar ve kasa verileri sıfırlandı.', 'success');
                      }
                    }}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3 text-rose-500" />
                    Raporları Sıfırla (0)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
