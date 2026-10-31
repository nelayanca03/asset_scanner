import React, { useState } from 'react';
import {
  X,
  FileText,
  Barcode,
  QrCode,
  TableProperties,
  LayoutGrid,
  CheckCircle2,
  Sparkles,
  Download,
  ShieldCheck,
  Smartphone,
  Scan,
} from 'lucide-react';
import { Asset } from '../types/asset';
import { exportAssetsToPDF, ExportPdfOptions } from '../utils/pdf';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onSuccessToast: (msg: string) => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  assets,
  onSuccessToast,
}) => {
  const [barcodeSize, setBarcodeSize] = useState<'jumbo' | 'standard'>('jumbo');
  const [barcodeType, setBarcodeType] = useState<'CODE128' | 'QR'>('CODE128');
  const [layoutMode, setLayoutMode] = useState<'table' | 'cards'>('table');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (assets.length === 0) return;
    setIsExporting(true);
    try {
      const options: ExportPdfOptions = {
        barcodeSize,
        barcodeType,
        layoutMode,
      };
      const fileName = await exportAssetsToPDF(assets, options);
      onSuccessToast(`PDF berhasil diunduh: ${fileName}`);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengekspor file PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-6 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Opsi Ekspor PDF Inventaris
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {assets.length} Aset
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih ukuran dan tata letak agar barcode 100% instan dipindai oleh scanner fisik & kamera HP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Solution Explanation Alert Box */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3">
            <Scan className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <span className="font-bold">Kenapa barcode terkadang tidak terbaca?</span> Barcode 1D dengan kode panjang (seperti <code>FFE-2024-...</code>) memiliki lebih dari 240 garis tipis. Jika ukuran kolom terlalu kecil, garis menjadi terlalu rapat (&lt;0.2mm) sehingga scanner fisik dan kamera HP kesulitan membidik.
              <span className="block mt-1 font-semibold text-blue-800 dark:text-blue-300">
                Solusi: Gunakan opsi <span className="underline">Barcode Jumbo</span> atau <span className="underline">Lembar Kartu Stiker</span> di bawah. Garis dibuat lebih tebal (0.35mm) & tinggi (18mm) sehingga terbaca instan dalam 1x klik.
              </span>
            </div>
          </div>

          {/* 1. Barcode Size Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
              1. Ukuran Barcode pada PDF
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Jumbo Barcode Option */}
              <button
                type="button"
                onClick={() => setBarcodeSize('jumbo')}
                className={`text-left p-3.5 rounded-xl border-2 transition-all relative ${
                  barcodeSize === 'jumbo'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Barcode Jumbo (Lebar 84mm)</span>
                  </div>
                  {barcodeSize === 'jumbo' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Garis ekstra tebal & tinggi 18mm. <strong>Sangat direkomendasikan</strong> untuk scanner gun fisik (USB/Bluetooth) dan pembacaan langsung dari layar monitor.
                </p>
                <div className="mt-2 text-[10px] inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-sm">
                  <ShieldCheck className="w-3 h-3" /> Akurasi Scan 99.9%
                </div>
              </button>

              {/* Standard Barcode Option */}
              <button
                type="button"
                onClick={() => setBarcodeSize('standard')}
                className={`text-left p-3.5 rounded-xl border-2 transition-all relative ${
                  barcodeSize === 'standard'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Barcode className="w-4 h-4 text-slate-500" />
                    <span>Barcode Standar (Lebar 56mm)</span>
                  </div>
                  {barcodeSize === 'standard' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Format tabel ringkas. Cocok untuk menghemat kertas cetak saat mencetak puluhan hingga ratusan baris data aset sekaligus.
                </p>
                <div className="mt-2 text-[10px] inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">
                  Kompak & Hemat Kertas
                </div>
              </button>
            </div>
          </div>

          {/* 2. Format / Type Code Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
              2. Tipe Kode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Code 128 */}
              <button
                type="button"
                onClick={() => setBarcodeType('CODE128')}
                className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  barcodeType === 'CODE128'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <Barcode className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">1D Barcode (Code 128)</span>
                    {barcodeType === 'CODE128' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Garis batang 1D standar retail, gudang, dan barcode scanner gun optik.
                  </p>
                </div>
              </button>

              {/* QR Code */}
              <button
                type="button"
                onClick={() => setBarcodeType('QR')}
                className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  barcodeType === 'QR'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">2D QR Code</span>
                    {barcodeType === 'QR' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Kotak 2D anti pantulan silau layar. Super cepat discan via kamera HP dan scanner 2D.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Layout Mode Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
              3. Tata Letak Dokumen PDF
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Table Layout */}
              <button
                type="button"
                onClick={() => setLayoutMode('table')}
                className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  layoutMode === 'table'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <TableProperties className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Tabel Laporan Lengkap</span>
                    {layoutMode === 'table' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    A4 Landscape dengan kolom: No, Barcode Tag, Nama Outlet, Lokasi Aset, Kode Aset, Nama Aset, dan Status.
                  </p>
                </div>
              </button>

              {/* Printable Asset Sticker Cards */}
              <button
                type="button"
                onClick={() => setLayoutMode('cards')}
                className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  layoutMode === 'cards'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <LayoutGrid className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Lembar Stiker Kartu Aset</span>
                    {layoutMode === 'cards' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    A4 Portrait 8 kartu stiker/halaman siap gunting/tempel langsung ke fisik barang (barcode ekstra jumbo 87mm).
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total siap diekspor: <span className="font-bold text-slate-800 dark:text-slate-200">{assets.length} aset</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || assets.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh File PDF Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
