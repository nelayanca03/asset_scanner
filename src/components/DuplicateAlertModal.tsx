import React from 'react';
import { AlertOctagon, ArrowRight, Eye, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { Asset } from '../types/asset';

interface DuplicateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  existingAsset: Asset | null;
  onViewOrEditAsset: (asset: Asset) => void;
  onScanAnother: () => void;
}

export const DuplicateAlertModal: React.FC<DuplicateAlertModalProps> = ({
  isOpen,
  onClose,
  barcode,
  existingAsset,
  onViewOrEditAsset,
  onScanAnother,
}) => {
  if (!isOpen || !existingAsset) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header with High-Contrast Error Indication */}
        <div className="bg-rose-50 dark:bg-rose-950/50 px-6 py-4 border-b border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-rose-900 dark:text-rose-100">
              Duplikat Barcode Ditolak!
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              Kode barcode <span className="font-mono font-bold bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">{barcode}</span> sudah terdaftar dalam sistem inventaris.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Asset Details Card */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Sistem mencegah duplikasi data untuk menjaga integritas pembukuan aset fisik. Berikut adalah rincian aset yang telah menggunakan kode ini:
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Nama Aset:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{existingAsset.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Kategori:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{existingAsset.category}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Status Operasional:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{existingAsset.status}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Nama Outlet:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{existingAsset.outlet}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Lokasi Aset:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{existingAsset.location || '-'}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Apakah Anda ingin memperbarui data aset yang sudah ada ini atau memindai barcode fisik lainnya?</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onScanAnother}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Pindai Barcode Lain
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onViewOrEditAsset(existingAsset);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Periksa / Perbarui Aset Ini
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
