import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Layers,
  ArrowRight,
  Terminal,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, hasNativePrompt, promptInstall, isIOS, isAndroid } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const res = await promptInstall();
      if (res) {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Mobil Uygulama Kurulumu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Android telefonunuza tam ekran, internetsiz çalışan uygulama
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 bg-slate-50/30 dark:bg-slate-950/20">
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pwa'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Telefona 1 Tıkla Yükle (Önerilen)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'apk'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Android Studio & APK Kodu</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'pwa' ? (
            <div className="space-y-4">
              {isInstalled || installSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Uygulama Başarıyla Yüklendi!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Uygulama telefonunuzun ana ekranında bağımsız bir ikon olarak yer almaktadır. Tarayıcıya girmeden doğrudan simgeye dokunarak internetsiz kullanabilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  {hasNativePrompt && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-center space-y-3">
                      <div className="inline-flex p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                        <Download className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Tek Dokunuşla Kurun
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          APK dosyası indirmeye ve bilinmeyen kaynak iznine gerek kalmadan resmi Android uygulama olarak kaydedilir.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Hemen Telefona Yükle</span>
                      </button>
                    </div>
                  )}

                  {/* Manuel Android & Chrome Kurulum Talimatı */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Android Telefon Kurulum Adımları (Chrome / Tarayıcı):
                    </h5>

                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Tarayıcı Menüsünü Açın
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Telefonunuzda Chrome ekranının sağ üst köşesindeki <strong>üç nokta (⋮)</strong> simgesine dokunun.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            "Uygulamayı Yükle" veya "Ana Ekrana Ekle"
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Açılan menüdeki <strong>"Uygulamayı Yükle"</strong> ya da <strong>"Ana Ekrana Ekle"</strong> butonuna dokunun.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Mobil Uygulama Hazır!
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Uygulama telefonun ana ekranında yeşil barkod ikonuyla belirir. Tam ekran açılır ve internet olmasa dahi yerel SQLite ile kesintisiz çalışır.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Avantajlar */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Virüs uyarısı olmadan güvenli</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Otomatik güncellenir</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <h4 className="font-bold flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>Bağımsız .apk Paketi Derleme Bilgisi</span>
                </h4>
                <p>
                  Bulut derleme sunucularında Android SDK/Java güvenlik nedeniyle kısıtlıdır. Projeyi bilgisayarınızda derleyip fiziksel bir APK üretmek için proje ZIP dosyasını indirmeniz yeterlidir.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                  3 Adımda Kendi Bilgisayarınızda APK Üretin:
                </h5>

                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 border border-slate-800">
                  <div className="text-slate-400"># 1. Projeyi derleyin</div>
                  <div className="text-emerald-400">npm run build</div>
                  <div className="text-slate-400"># 2. Capacitor Android ortamını hazırlayın</div>
                  <div className="text-emerald-400">npx cap sync android</div>
                  <div className="text-slate-400"># 3. APK'yı derleyin</div>
                  <div className="text-emerald-400">cd android && ./gradlew assembleDebug</div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Oluşan gerçek APK dosyası <strong>android/app/build/outputs/apk/debug/app-debug.apk</strong> dizininde hazır olacaktır.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
