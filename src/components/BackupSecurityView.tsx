import React, { useState } from 'react';
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
} from 'lucide-react';
import { AppSettings, DatabaseDump, Sale, Customer, Product } from '../types';
import { SQLITE_SCHEMA_DDL, sqliteStorage } from '../db/sqlite-storage';
import { exportToExcel, exportSalesToCSV, exportCustomersToCSV, exportProductsToCSV, downloadFile, shareOrSaveFile } from '../utils/export-utils';
import { formatDateTime } from '../utils/formatters';

interface BackupSecurityViewProps {
  settings: AppSettings;
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onRestoreBackup: (dump: DatabaseDump) => void;
  onResetToSampleData: () => void;
}

export const BackupSecurityView: React.FC<BackupSecurityViewProps> = ({
  settings,
  sales,
  customers,
  products,
  onUpdateSettings,
  onRestoreBackup,
  onResetToSampleData,
}) => {
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
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      storeName: storeName.trim(),
      storePhone: storePhone.trim(),
      storeAddress: storeAddress.trim(),
      currency: currency.trim() || '₼',
    });
    showNotification('Mağaza ve fiş bilgileri başarıyla kaydedildi.');
  };

  const handleUpdateScreenPadding = (padding: 'auto' | 'compact' | 'large' | 'zero') => {
    setScreenTopPadding(padding);
    onUpdateSettings({ screenTopPadding: padding });
    showNotification('Ekran ve üst panel ayarları güncellendi.');
  };

  const handleTogglePin = (enabled: boolean) => {
    setIsPinEnabled(enabled);
    onUpdateSettings({ isPinEnabled: enabled });
    showNotification(enabled ? 'PIN kilidi aktifleştirildi.' : 'PIN kilidi devre dışı bırakıldı.');
  };

  const handleSavePin = () => {
    if (pinCode.length < 4) {
      alert('PIN en az 4 haneli olmalıdır.');
      return;
    }
    onUpdateSettings({ pinCode, isPinEnabled: true });
    setIsPinEnabled(true);
    showNotification('PIN kodu başarıyla güncellendi.');
  };

  const handleToggleBiometric = (enabled: boolean) => {
    setIsBiometricEnabled(enabled);
    onUpdateSettings({ isBiometricEnabled: enabled });
    showNotification(enabled ? 'Biyometrik doğrulama aktif edildi.' : 'Biyometrik doğrulama kapatıldı.');
  };

  // SQL & Backup handlers
  const handleDownloadSQLDump = () => {
    const sql = sqliteStorage.exportSQLDump();
    downloadFile(sql, `mobilsatis_sqlite_yedek_${new Date().toISOString().slice(0, 10)}.sql`, 'application/sql');
    showNotification('SQLite (.sql) veritabanı yedeği indirildi.');
  };

  const handleDownloadJSONBackup = () => {
    const dump = sqliteStorage.exportJSONDump();
    const jsonStr = JSON.stringify(dump, null, 2);
    downloadFile(jsonStr, `mobilsatis_yedek_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    onUpdateSettings({ lastBackupDate: new Date().toISOString() });
    showNotification('JSON yedek dosyası başarıyla indirildi.');
  };

  const handleCloudDriveBackup = async () => {
    const dump = sqliteStorage.exportJSONDump();
    const jsonStr = JSON.stringify(dump, null, 2);
    const filename = `mobilsatis_bulut_yedek_${new Date().toISOString().slice(0, 10)}.json`;

    const res = await shareOrSaveFile(jsonStr, filename, 'application/json');
    onUpdateSettings({ lastBackupDate: new Date().toISOString() });
    if (res.method === 'share') {
      showNotification('Google Drive / Cihaz paylaşım penceresi açıldı.');
    } else {
      showNotification('Yedek dosyası cihazınıza indirildi (Google Drive klasörüne yükleyebilirsiniz).');
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          showNotification('Tüm veriler başarıyla geri yüklendi!');
        }
      } catch (err) {
        alert('Yedek dosyası okunurken hata oluştu. Lütfen geçerli bir .json yedeği seçiniz.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          SQLite Veritabanı & Güvenlik
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          %100 internetsiz yerel veri saklama, Google Drive yedekleme ve güvenlik ayarları
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Grid: 2 Columns on large */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: SQLite Engine & Exports */}
        <div className="space-y-6">
          {/* SQLite Status Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    SQLite Yerel Veritabanı
                  </h2>
                  <p className="text-[11px] text-slate-500">Cihaz üzerinde yerel IndexedDB SQLite motoru</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-500/20">
                AKTİF · ÇEVRİMDIŞI
              </span>
            </div>

            {/* Table Stats */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">customers</span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {customers.length} kayıt
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">products</span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {products.length} kayıt
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">sales</span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {sales.length} kayıt
                </span>
              </div>
            </div>

            {/* Actions for SQLite */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadSQLDump}
                className="flex-1 min-w-[140px] h-10 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                title="SQLite uyumlu .sql dump indir"
              >
                <FileCode className="w-4 h-4 text-indigo-500" />
                <span>SQLite (.sql) İndir</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlViewer(!showSqlViewer)}
                className="h-10 px-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{showSqlViewer ? 'Şemayı Gizle' : 'Şemayı İncele'}</span>
              </button>
            </div>

            {/* SQL DDL Schema Viewer */}
            {showSqlViewer && (
              <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                <pre>{SQLITE_SCHEMA_DDL}</pre>
              </div>
            )}
          </div>

          {/* Excel & CSV Export Suite */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Excel & CSV Dışa Aktarma
                </h2>
                <p className="text-[11px] text-slate-500">Muhasebe ve tablo programları ile tam uyumlu</p>
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

          {/* Android & Yerel SQLite Durumu */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Android & Yerel SQLite Modu
                </h2>
                <p className="text-[11px] text-slate-500">
                  İnternetsiz ve bağımsız çalışan yerel POS sistemi
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bu yazılım internetsiz (çevrimdışı) çalışabilen yerel SQLite veritabanı altyapısına sahiptir. Tüm satışlar, stok hareketleri ve müşteri verileri doğrudan cihazınızın güvenli yerel hafızasında tutulur.
            </p>
          </div>

          {/* Backup & Cloud Sync */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Yedekleme & Google Drive / iCloud
                </h2>
                <p className="text-[11px] text-slate-500">
                  Son yedek: {settings.lastBackupDate ? formatDateTime(settings.lastBackupDate) : 'Henüz alınmadı'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCloudDriveBackup}
                className="w-full h-11 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Google Drive / Cihaza Yedekle</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadJSONBackup}
                  className="flex-1 h-9 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON Yedeği Al</span>
                </button>

                <label className="flex-1 h-9 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Yedekten Geri Yükle</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileRestore}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Örnek verilerle sıfırla:</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tüm veriler varsayılan örnek verilerle yenilenecektir. Onaylıyor musunuz?')) {
                    onResetToSampleData();
                    showNotification('Örnek veriler yeniden yüklendi.');
                  }
                }}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Varsayılanı Yükle
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Security & Store Profile */}
        <div className="space-y-6">
          {/* Security & Authentication */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Şifreli Giriş & Biyometrik Doğrulama
                </h2>
                <p className="text-[11px] text-slate-500">Uygulama açılışında PIN veya parmak izi koruması</p>
              </div>
            </div>

            {/* PIN Enable switch */}
            <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  PIN Kilidi
                </span>
                <span className="text-[11px] text-slate-500">Uygulamaya girişte PIN sorulsun</span>
              </div>
              <input
                type="checkbox"
                checked={isPinEnabled}
                onChange={(e) => handleTogglePin(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {/* Change PIN Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Güvenlik PIN Kodu (4-6 Rakam)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-center tracking-widest text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-4 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  PIN Kaydet
                </button>
              </div>
            </div>

            {/* Biometric Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Biyometrik / Parmak İzi Doğrulama
                  </span>
                  <span className="text-[11px] text-slate-500">Cihaz sensörü ile tek dokunuşla kilit aç</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isBiometricEnabled}
                onChange={(e) => handleToggleBiometric(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Store Settings Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Mağaza & Fiş Bilgileri
                </h2>
                <p className="text-[11px] text-slate-500">Satış fişlerinde yer alacak bilgiler</p>
              </div>
            </div>

            <form onSubmit={handleSaveStoreInfo} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mağaza / İşletme Adı
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  İşletme Telefonu
                </label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Adres / Fiş Başlığı
                </label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Para Birimi
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                >
                  <option value="₼">₼ - Manat (AZN)</option>
                  <option value="₺">₺ - Türk Lirası (TRY)</option>
                  <option value="$">$ - ABD Doları (USD)</option>
                  <option value="€">€ - Euro (EUR)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
              >
                Bilgileri Güncelle
              </button>
            </form>
          </div>

          {/* Ekran & Üst Panel Ayarları */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ekran & Üst Panel Ayarları
                </h2>
                <p className="text-[11px] text-slate-500">
                  Telefonun saati, bataryası ve bildirim simgeleriyle çakışmayı önler
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Üst Panel Boşluğu (Güvenli Alan Koruması)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateScreenPadding('auto')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      screenTopPadding === 'auto'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Otomatik</span>
                      {screenTopPadding === 'auto' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Cihaz çentiğine göre güvenli boşluk (Önerilen)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateScreenPadding('large')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      screenTopPadding === 'large'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Geniş (+32px)</span>
                      {screenTopPadding === 'large' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Kalın durum çubuğu & ada ekranlar için</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateScreenPadding('compact')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      screenTopPadding === 'compact'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Kompakt (+16px)</span>
                      {screenTopPadding === 'compact' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Orta seviye boşluk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateScreenPadding('zero')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      screenTopPadding === 'zero'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Sıfır Boşluk</span>
                      {screenTopPadding === 'zero' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Düz masaüstü ekranlar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
