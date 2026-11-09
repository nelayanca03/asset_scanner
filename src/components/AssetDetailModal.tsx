import React, { useRef, useEffect } from 'react';
import { X, Printer, Edit2, Trash2, Download, MapPin, Building2, ShieldCheck } from 'lucide-react';
import { Asset } from '../types/asset';
import { renderBarcodeToCanvas, downloadBarcodeImage, getBarcodeText } from '../utils/barcode';

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onPrintLabel: (asset: Asset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPrintLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen && asset && canvasRef.current) {
      renderBarcodeToCanvas(canvasRef.current, getBarcodeText(asset), {
        height: 60,
        width: 2,
        displayValue: true,
        fontSize: 13,
      });
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const handleDownload = () => {
    if (canvasRef.current) {
      downloadBarcodeImage(canvasRef.current, `Barcode_${asset.barcode}`, 'png');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {asset.barcode}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {asset.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {asset.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Barcode Graphic Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-center shadow-xs">
              <canvas ref={canvasRef} className="max-w-full" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Barcode (PNG)
              </button>
              <button
                onClick={() => onPrintLabel(asset)}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Stiker Label
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Nama Outlet / Cabang
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block text-sm">
                {asset.outlet}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Status Operasional
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block text-sm">
                {asset.status}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                Nama Aset 1 (Barcode) / Lokasi
              </span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300 block text-sm">
                {asset.barcodeName || asset.location || '-'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block">
                Nomor Seri Pabrik (S/N)
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 block text-sm">
                {asset.serialNumber || '-'}
              </span>
            </div>
          </div>

          {/* Notes */}
          {asset.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Catatan & Spesifikasi:
              </span>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {asset.notes}
              </p>
            </div>
          )}

          {/* Timestamp footer metadata */}
          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Didaftarkan: {new Date(asset.createdAt).toLocaleDateString('id-ID')}</span>
            <span>·</span>
            <span>Update Terakhir: {new Date(asset.updatedAt).toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Yakin ingin menghapus aset "${asset.name}" (${asset.barcode})?`)) {
                onDelete(asset.id);
                onClose();
              }
            }}
            className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Aset
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(asset);
              }}
              className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Ubah Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
