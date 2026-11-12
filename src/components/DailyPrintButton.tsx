import React from 'react';
import { Loader2, Printer } from 'lucide-react';

interface DailyPrintButtonProps {
  label: string;
  isBusy: boolean;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}

export const DailyPrintButton: React.FC<DailyPrintButtonProps> = ({ label, isBusy, disabled, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-busy={isBusy}
    aria-label={label}
    title="Yazdır veya PDF olarak paylaş"
    className={`print:hidden flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-white shadow-sm transition-colors hover:bg-teal-800 active:bg-teal-900 disabled:opacity-60 ${className}`}
  >
    {isBusy
      ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      : <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />}
    <span className="text-xs font-black">Yazdır</span>
  </button>
);
