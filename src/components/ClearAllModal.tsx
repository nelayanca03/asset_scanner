import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assetCount: number;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  assetCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-rose-50 dark:bg-rose-950/50 px-6 py-4 border-b border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-rose-900 dark:text-rose-100">
              Hapus Seluruh Data Aset?
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              Konfirmasi penghapusan massal inventaris
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Anda akan menghapus seluruh{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {assetCount} data aset
            </strong>{' '}
            yang saat ini tersimpan dalam sistem inventaris.
          </p>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
            Semua kode barcode, nama outlet, dan riwayat yang telah dikumpulkan akan dikosongkan. Tindakan ini tidak dapat dibatalkan.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Ya, Hapus Semua Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
