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
import type { User } from 'firebase/auth';
import { AppSettings, DatabaseDump, Sale, Customer, Product, DriveBackupFile } from '../types';
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
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  downloadGoogleDriveBackupContent,
  deleteGoogleDriveBackup,
  getCurrentGoogleUser,
  getGoogleAccessToken,
} from '../services/googleDriveService';

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
  const [backupLocationPref, setBackupLocationPref] = useState<'both' | 'phone' | 'gdrive'>(
    settings.backupLocationPreference || 'both'
  );
  const [autoBackupReminder, setAutoBackupReminder] = useState<'daily' | 'weekly' | 'never'>(
    settings.autoBackupReminder || 'daily'
  );
  const [autoBackupOnDayEnd, setAutoBackupOnDayEnd] = useState<boolean>(
    settings.autoBackupOnDayEnd ?? true
  );

  // Google Drive State
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [showDriveBackupsModal, setShowDriveBackupsModal] = useState(false);
  const [isOneClickBackingUp, setIsOneClickBackingUp] = useState(false);

  useEffect(() => {
    const unsub = initGoogleAuth((user) => {
      setGoogleUser(user);
    });
    return () => unsub();
  }, []);

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

  // --- Handlers: Google Drive ---
  const handleGoogleSignIn = async () => {
    setIsGoogleConnecting(true);
    try {
      const res = await signInWithGoogle();
      setGoogleUser(res.user);
      onUpdateSettings({ googleDriveSyncEmail: res.user.email || '' });
      showNotification(`Google Drive bağlandı: ${res.user.email || res.user.displayName}`, 'success');
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      showNotification(err.message || 'Google Drive bağlantısı kurulamadı.', 'error');
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setDriveBackups([]);
      onUpdateSettings({ googleDriveSyncEmail: '' });
      showNotification('Google oturumu kapatıldı.', 'info');
    } catch (err: any) {
      showNotification('Çıkış yapılırken bir hata oluştu.', 'error');
    }
  };

  const handleBackupToGoogleDrive = async (): Promise<boolean> => {
    if (!googleUser || !getGoogleAccessToken()) {
      showNotification('Lütfen önce Google hesabınıza bağlanın.', 'error');
      await handleGoogleSignIn();
      if (!getGoogleAccessToken()) return false;
    }

    setIsUploadingToDrive(true);
    try {
      const dump = sqliteStorage.exportJSONDump();
      const jsonStr = JSON.stringify(dump, null, 2);
      const filename = getStandardBackupFileName('json');

      const uploaded = await uploadBackupToGoogleDrive(filename, jsonStr);
      const nowIso = new Date().toISOString();
      onUpdateSettings({
        lastBackupDate: nowIso,
        lastDriveBackupDate: nowIso,
      });

      showNotification(`"${uploaded.name}" başarıyla Google Drive'a yüklendi!`, 'success');
      return true;
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      showNotification(err.message || 'Google Drive yedekleme başarısız oldu.', 'error');
      return false;
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleLoadDriveBackups = async () => {
    if (!googleUser || !getGoogleAccessToken()) {
      showNotification('Google Drive yedeklerini görmek için önce Google ile bağlanmalısınız.', 'error');
      return;
    }

    setIsLoadingDriveFiles(true);
    setShowDriveBackupsModal(true);
    try {
      const files = await listGoogleDriveBackups();
      setDriveBackups(files);
      if (files.length === 0) {
        showNotification('Google Drive üzerinde bu uygulamaya ait kayıtlı yedek bulunamadı.', 'info');
      }
    } catch (err: any) {
      showNotification(err.message || 'Yedek listesi alınamadı.', 'error');
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleRestoreFromDriveFile = async (file: DriveBackupFile) => {
    const confirmed = window.confirm(
      `DİKKAT: "${file.name}" dosyasından veritabanı geri yüklenecektir. Mevcut verilerin üzerine yazılacaktır. Devam etmek istiyor musunuz?`
    );
    if (!confirmed) return;

    try {
      showNotification('Google Drive üzerinden yedek indiriliyor...', 'info');
      const content = await downloadGoogleDriveBackupContent(file.id);
      const parsed = JSON.parse(content) as DatabaseDump;

      if (!parsed.tables || !parsed.tables.products) {
        throw new Error('Yedek dosyası formatı geçersiz!');
      }

      onRestoreBackup(parsed);
      setShowDriveBackupsModal(false);
      showNotification('Google Drive yedeği başarıyla geri yüklendi!', 'success');
    } catch (err: any) {
      console.error('Drive restore failed:', err);
      showNotification(err.message || 'Google Drive yedeği geri yüklenirken hata oluştu.', 'error');
    }
  };

  const handleDeleteDriveFile = async (file: DriveBackupFile) => {
    const confirmed = window.confirm(
      `"${file.name}" yedek dosyasını Google Drive'dan tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
    );
    if (!confirmed) return;

    try {
      await deleteGoogleDriveBackup(file.id);
      setDriveBackups((prev) => prev.filter((f) => f.id !== file.id));
      showNotification(`"${file.name}" Google Drive'dan silindi.`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Yedek silinemedi.', 'error');
    }
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
      backupLocationPreference: backupLocationPref,
      autoBackupReminder: autoBackupReminder,
      autoBackupOnDayEnd: autoBackupOnDayEnd,
    });
    showNotification('Yedek alma ayarları ve tercihleri kaydedildi.', 'success');
  };

  const handleOneClickBackup = async () => {
    setIsOneClickBackingUp(true);
    let phoneSuccess = false;
    let driveSuccess = false;

    try {
      if (backupLocationPref === 'phone' || backupLocationPref === 'both') {
        phoneSuccess = handlePhoneDownloadJSON();
      }

      if (backupLocationPref === 'gdrive' || backupLocationPref === 'both') {
        if (googleUser) {
          driveSuccess = await handleBackupToGoogleDrive();
        } else {
          showNotification('Google Drive bağlı olmadığı için Google Drive yedeği atlandı. Lütfen Google ile bağlanın.', 'info');
        }
      }

      if (backupLocationPref === 'both') {
        if (phoneSuccess && driveSuccess) {
          showNotification('Hem Telefona hem de Google Drive bulutuna başarıyla yedeklendi!', 'success');
        } else if (phoneSuccess) {
          showNotification('Telefona yedek alındı. Google Drive için bağlantı kurunuz.', 'info');
        }
      }
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
            Google Drive bulut yedekleme, telefona yerel kayıt ve SQLite güvenlik yönetimi
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
          {/* Card 1: Google Drive Bulut Yedekleme */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Google Drive Bulut Yedekleme
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Verilerinizi Google Drive hesabınıza güvenle kaydedin
                  </p>
                </div>
              </div>

              {googleUser ? (
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  BAĞLANDI
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  BAĞLI DEĞİL
                </span>
              )}
            </div>

            {/* Google Account Status Area */}
            {googleUser ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                      {(googleUser.email || 'G').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block truncate">
                      {googleUser.displayName || 'Google Kullanıcısı'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                      {googleUser.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                  title="Google Oturumunu Kapat"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Google Drive hesabınızı bağlayarak tüm satış ve stok verilerinizi tek tıkla doğrudan Google Drive'a yedekleyebilir, telefonunuz değişse bile anında geri yükleyebilirsiniz.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGoogleConnecting}
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                >
                  {isGoogleConnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Google Bağlantısı Açılıyor...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Google ile Bağlan & Yetkilendir</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Google Drive Actions */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isUploadingToDrive}
                onClick={handleBackupToGoogleDrive}
                className="w-full h-11 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isUploadingToDrive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Google Drive'a Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Google Drive'a Doğrudan Yedekle</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isLoadingDriveFiles}
                onClick={handleLoadDriveBackups}
                className="w-full h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isLoadingDriveFiles ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Yedekler Getiriliyor...</span>
                  </>
                ) : (
                  <>
                    <FolderDown className="w-4 h-4 text-blue-500" />
                    <span>Google Drive'daki Yedekleri Gör & Geri Yükle</span>
                  </>
                )}
              </button>
            </div>

            {/* Last Backup Notice */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
              <span>Son Google Drive Yedeği:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {settings.lastDriveBackupDate ? formatDateTime(settings.lastDriveBackupDate) : 'Henüz alınmadı'}
              </span>
            </div>
          </div>

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
                  title="Android Paylaş Menüsü ile Dosyalara / WhatsApp'a / Drive'a Gönder"
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
              {/* Setting 1: Yedekleme Konumu Tercihi */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Varsayılan Yedekleme Konumu:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Hem Tel + Drive', desc: 'Tam Koruma' },
                    { id: 'phone', label: 'Yalnızca Telefon', desc: 'Çevrimdışı' },
                    { id: 'gdrive', label: 'Yalnızca Drive', desc: 'Bulut' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBackupLocationPref(opt.id as any)}
                      className={`p-2.5 rounded-2xl text-left border transition-all ${
                        backupLocationPref === opt.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-black block leading-tight">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{opt.desc}</span>
                    </button>
                  ))}
                </div>
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

      {/* Modal: Google Drive Backups List & Restore */}
      {showDriveBackupsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Google Drive Yedekleri
                  </h3>
                  <p className="text-[11px] text-slate-500">Google Drive hesabınızdaki kayıtlı yedekler</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveBackupsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {isLoadingDriveFiles ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                  <p className="text-xs">Google Drive taranıyor...</p>
                </div>
              ) : driveBackups.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <Cloud className="w-8 h-8 mx-auto opacity-30 text-blue-500" />
                  <p className="text-xs font-semibold">Google Drive'da kayıtlı yedek bulunamadı.</p>
                  <p className="text-[11px] text-slate-500">Yukarıdaki "Google Drive'a Doğrudan Yedekle" butonuyla ilk yedeğinizi alabilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {driveBackups.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                          {file.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {file.modifiedTime && (
                            <span>{formatDateTime(file.modifiedTime)}</span>
                          )}
                          {file.size && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{file.size}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreFromDriveFile(file)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                          title="Bu yedeği geri yükle"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Geri Yükle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDriveFile(file)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="Yedeği Google Drive'dan Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                Toplam {driveBackups.length} yedek dosyası
              </span>
              <button
                type="button"
                onClick={() => setShowDriveBackupsModal(false)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
