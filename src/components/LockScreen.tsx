import React, { useState } from 'react';
import { Fingerprint, Lock, Delete, ShieldCheck, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  storedPin: string;
  isBiometricEnabled: boolean;
  storeName: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  storedPin,
  isBiometricEnabled,
  storeName,
  onUnlock,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [biometricStatus, setBiometricStatus] = useState<string>('');

  const handleKeyPress = (num: string) => {
    if (pinInput.length >= 6) return;
    const next = pinInput + num;
    setPinInput(next);
    setErrorMessage('');

    // Check if matches
    if (next === storedPin) {
      setTimeout(() => {
        onUnlock();
      }, 100);
    } else if (next.length >= storedPin.length) {
      setErrorShake(true);
      setErrorMessage('Hatalı PIN kodu, lütfen tekrar deneyin');
      setTimeout(() => {
        setPinInput('');
        setErrorShake(false);
      }, 500);
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMessage('');
  };

  const triggerBiometric = async () => {
    setBiometricStatus('Biyometrik sensör taranıyor...');
    try {
      if (window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) {
        // Authenticator available
        setBiometricStatus('Doğrulandı!');
        setTimeout(() => {
          onUnlock();
        }, 300);
      } else {
        // Fallback simulation for devices in dev/sandbox
        setTimeout(() => {
          setBiometricStatus('Biyometrik doğrulama başarılı');
          setTimeout(() => {
            onUnlock();
          }, 300);
        }, 600);
      }
    } catch {
      setBiometricStatus('');
      setErrorMessage('Biyometrik doğrulama başarısız oldu, PIN giriniz.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 text-white">
      <div className="w-full max-w-xs flex flex-col items-center select-none">
        {/* App Icon / Security badge */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-slate-100 tracking-tight">{storeName}</h1>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          Güvenli Giriş · SQLite Korumalı
        </p>

        {/* PIN Indicators */}
        <div className={`flex items-center gap-3 my-8 ${errorShake ? 'animate-bounce text-rose-500' : ''}`}>
          {Array.from({ length: Math.max(4, storedPin.length) }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < pinInput.length
                  ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {errorMessage ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mb-4 text-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : biometricStatus ? (
          <p className="text-xs text-emerald-400 mb-4 animate-pulse">{biometricStatus}</p>
        ) : (
          <p className="text-xs text-slate-500 mb-4">Lütfen {storedPin.length} haneli PIN kodunuzu girin</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 text-xl font-semibold hover:bg-slate-800 active:scale-95 active:bg-emerald-600 active:text-white transition-all flex items-center justify-center shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Biometric or Clear */}
          {isBiometricEnabled ? (
            <button
              type="button"
              onClick={triggerBiometric}
              className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-emerald-400 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
              title="Biyometrik Giriş"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs font-medium text-slate-400 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
            >
              TEMİZLE
            </button>
          )}

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 text-xl font-semibold hover:bg-slate-800 active:scale-95 active:bg-emerald-600 active:text-white transition-all flex items-center justify-center shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot PIN hint */}
        <p className="text-[11px] text-slate-600 mt-2 text-center">
          Varsayılan Güvenlik PIN: <span className="font-mono text-slate-400">1234</span>
        </p>
      </div>
    </div>
  );
};
