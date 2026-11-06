import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  QrCode,
  Barcode,
  TableProperties,
  LayoutGrid,
  Columns,
  Sparkles,
  Download,
  Printer,
  Sliders,
  Eye,
  Check,
  RotateCcw,
  Edit3,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Store,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Asset } from '../types/asset';
import { exportAssetsToPDF, ExportPdfOptions } from '../utils/pdf';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onSuccessToast: (msg: string) => void;
}

// Mini QR renderer for live preview cards
const LivePreviewQr: React.FC<{ code: string; size?: number }> = ({ code, size = 64 }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (!code) return;
    QRCode.toDataURL(code, {
      margin: 1,
      width: size * 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-[9px] text-slate-400 shrink-0"
      >
        QR
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR"
      style={{ width: size, height: size }}
      className="shrink-0 object-contain rounded-xs border border-slate-100 dark:border-slate-800"
    />
  );
};

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  assets,
  onSuccessToast,
}) => {
  // 1. Layout Mode & Barcode Type
  // Default to user's requested minimalist 2D QR layout!
  const [layoutMode, setLayoutMode] = useState<'minimal_qr' | 'cards' | 'table'>('minimal_qr');
  const [barcodeType, setBarcodeType] = useState<'QR' | 'CODE128'>('QR');

  // 2. Editable Layout Parameters
  const [columns, setColumns] = useState<1 | 2 | 3>(2);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [barcodeSize, setBarcodeSize] = useState<'small' | 'standard' | 'jumbo'>('standard');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'none'>('solid');

  // 3. Field Visibility & Custom Outlet Name (Diinput manual saat mengedit, tidak dari default)
  const [showOutlet, setShowOutlet] = useState<boolean>(true);
  const [outletNameInput, setOutletNameInput] = useState<string>('');
  const [showLocation, setShowLocation] = useState<boolean>(false);
  const [showDocumentHeader, setShowDocumentHeader] = useState<boolean>(true);
  const [documentTitle, setDocumentTitle] = useState<string>('LABEL ASET QR CODE');

  // 4. Quick Data Editor & Item Selection (allows editing text before export)
  const [editableAssets, setEditableAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDataEditorOpen, setIsDataEditorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize editable list from props
  useEffect(() => {
    if (isOpen) {
      setEditableAssets(assets.map((a) => ({ ...a })));
      setSelectedAssetIds(new Set(assets.map((a) => a.id)));
    }
  }, [isOpen, assets]);

  // Active items to print/export
  const activeAssets = useMemo(() => {
    return editableAssets.filter((a) => selectedAssetIds.has(a.id));
  }, [editableAssets, selectedAssetIds]);

  if (!isOpen) return null;

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.size === editableAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(editableAssets.map((a) => a.id)));
    }
  };

  // Inline edit asset text
  const handleUpdateItemField = (id: string, field: 'name' | 'barcode' | 'outlet' | 'location', value: string) => {
    setEditableAssets((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Reset to default layout
  const handleResetLayout = () => {
    setLayoutMode('minimal_qr');
    setBarcodeType('QR');
    setColumns(2);
    setOrientation('portrait');
    setBarcodeSize('standard');
    setBorderStyle('solid');
    setShowOutlet(true);
    setOutletNameInput('');
    setShowLocation(false);
    setShowDocumentHeader(true);
    setDocumentTitle('LABEL ASET QR CODE');
  };

  // Generate & Download PDF
  const handleExportPDF = async () => {
    if (activeAssets.length === 0) {
      alert('Pilih minimal 1 aset untuk diekspor ke PDF.');
      return;
    }
    if (showOutlet && !outletNameInput.trim()) {
      alert('Silakan masukkan Nama Outlet pada kolom input di panel kiri sebelum mengekspor PDF.');
      return;
    }
    setIsExporting(true);
    try {
      const options: ExportPdfOptions = {
        layoutMode,
        barcodeType,
        columns,
        orientation,
        barcodeSize,
        borderStyle,
        showOutlet,
        customOutletName: outletNameInput.trim(),
        showLocation,
        showDocumentHeader,
        documentTitle,
      };
      const fileName = await exportAssetsToPDF(activeAssets, options);
      onSuccessToast(`PDF berhasil dibuat & diunduh: ${fileName}`);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal membuat file PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Direct print via browser print dialog
  const handleDirectPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Editor Tata Letak & Ekspor PDF Aset
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {activeAssets.length} Aset Terpilih
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesuaikan tata letak, kolom, dan teks label sebelum dokumen PDF resmi dibuat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetLayout}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Kembalikan pengaturan tata letak ke standar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Layout</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Split View: Left Controls / Right Live Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* LEFT PANEL: Layout Controls & Data Editor (5 Columns) */}
          <div className="lg:col-span-5 p-5 space-y-5 overflow-y-auto max-h-[75vh] bg-slate-50/50 dark:bg-slate-950/30">
            {/* 1. Template Layout Selector */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
                1. Format & Tata Letak
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Minimalist QR (User's primary request) */}
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode('minimal_qr');
                    setBarcodeType('QR');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    layoutMode === 'minimal_qr' && barcodeType === 'QR'
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                    <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>QR Minimalis</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    QR di kiri, keterangan kode & outlet di kanan.
                  </p>
                </button>

                {/* Sticker Label Cards */}
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode('cards');
                    setBarcodeType('CODE128');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    layoutMode === 'cards'
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                    <LayoutGrid className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Stiker Kartu</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    Format stiker aset berbingkai siap potong/tempel.
                  </p>
                </button>

                {/* Classic Table */}
                <button
                  type="button"
                  onClick={() => setLayoutMode('table')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    layoutMode === 'table'
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                    <TableProperties className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Tabel Kolom</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    Format tabel inventaris horizontal lengkap.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Grid & Paper Layout Controls */}
            {layoutMode !== 'table' && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>2. Pengaturan Kolom & Kertas</span>
                  <span className="text-[10px] font-normal text-slate-500">Live Customizer</span>
                </div>

                {/* Column Count */}
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                    Jumlah Kolom Kartu per Halaman:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 2, 3] as const).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColumns(col)}
                        className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all ${
                          columns === col
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {col === 1 ? '1 Kolom (Penuh)' : `${col} Kolom`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation & Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Orientasi Kertas:
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                    >
                      <option value="portrait">Portrait (Tegak A4)</option>
                      <option value="landscape">Landscape (Mendatar A4)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Ukuran QR/Barcode:
                    </label>
                    <select
                      value={barcodeSize}
                      onChange={(e) => setBarcodeSize(e.target.value as 'small' | 'standard' | 'jumbo')}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                    >
                      <option value="small">Kecil (Hemat Ruang)</option>
                      <option value="standard">Sedang (Optimal)</option>
                      <option value="jumbo">Jumbo (Scan Jarak Jauh)</option>
                    </select>
                  </div>
                </div>

                {/* Border Style */}
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                    Garis Tepi Kartu:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBorderStyle('solid')}
                      className={`py-1 px-2 text-[11px] font-medium rounded-md border ${
                        borderStyle === 'solid'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Garis Halus
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorderStyle('dashed')}
                      className={`py-1 px-2 text-[11px] font-medium rounded-md border ${
                        borderStyle === 'dashed'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Garis Gunting
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorderStyle('none')}
                      className={`py-1 px-2 text-[11px] font-medium rounded-md border ${
                        borderStyle === 'none'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Tanpa Garis
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Fields & Text Elements to Display */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                3. Informasi Samping Kanan QR
              </label>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Kode Aset</span> (Format Monospace Tebal)
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong className="text-slate-900 dark:text-slate-100">Nama Aset:</strong>{' '}
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      Wrap Text Aktif (Tidak terpotong)
                    </span>
                  </span>
                </div>
                {/* Dedicated Outlet Name Input (Diinput saat mengedit ekspor) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Nama Outlet (Input Saat Mengedit Ekspor):</span>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOutlet}
                        onChange={(e) => setShowOutlet(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Tampilkan</span>
                    </label>
                  </div>

                  {showOutlet && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={outletNameInput}
                        onChange={(e) => setOutletNameInput(e.target.value)}
                        placeholder="Ketik Nama Outlet untuk dicetak (contoh: Outlet Senayan City, Dapur Utama...)"
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-600 focus:border-indigo-600 rounded-lg p-2 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden"
                      />
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          *Diinput manual saat mengedit, tidak menggunakan default
                        </span>
                        {outletNameInput.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditableAssets((prev) =>
                                prev.map((item) => ({ ...item, outlet: outletNameInput.trim() }))
                              );
                            }}
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            Terapkan ke baris tabel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={showLocation}
                    onChange={(e) => setShowLocation(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>
                    Tampilkan <strong>Lokasi Aset</strong> (Dapur / Service)
                  </span>
                </label>
              </div>

              {/* Document Title Header */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Header Judul Dokumen:
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDocumentHeader}
                      onChange={(e) => setShowDocumentHeader(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600"
                    />
                    <span>Aktifkan Header</span>
                  </label>
                </div>
                {showDocumentHeader && (
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Contoh: LABEL ASET OUTLET"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </div>

            {/* 4. Quick Inline Text Editor Accordion */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsDataEditorOpen((prev) => !prev)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    4. Edit Data Sebelum Dicetak ({activeAssets.length} Dipilih)
                  </span>
                </div>
                {isDataEditorOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isDataEditorOpen && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 max-h-56 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      {selectedAssetIds.size === editableAssets.length ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>Pilih Semua ({editableAssets.length})</span>
                    </button>
                    <span>Edit teks langsung pada kotak</span>
                  </div>

                  {editableAssets.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-colors ${
                        selectedAssetIds.has(item.id)
                          ? 'border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={item.barcode}
                          onChange={(e) => handleUpdateItemField(item.id, 'barcode', e.target.value)}
                          className="flex-1 font-mono text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5"
                          title="Kode Aset"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pl-5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                          placeholder="Nama Aset"
                          className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5"
                          title="Nama Aset"
                        />
                        <input
                          type="text"
                          value={item.outlet || ''}
                          onChange={(e) => handleUpdateItemField(item.id, 'outlet', e.target.value)}
                          placeholder="Nama Outlet"
                          className="text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5"
                          title="Nama Outlet"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Live Interactive Visual Preview (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 overflow-hidden">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pratinjau Nyata Lembar Cetak A4 ({orientation === 'portrait' ? 'Tegak' : 'Mendatar'} · {columns} Kolom)
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                Kertas A4 (210 × 297 mm)
              </span>
            </div>

            {/* Simulated A4 Paper Container with Real Live Preview Rendering */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-200/60 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <div
                className={`bg-white text-slate-900 shadow-xl transition-all overflow-hidden p-6 ${
                  orientation === 'portrait'
                    ? 'w-full max-w-[560px] min-h-[720px]'
                    : 'w-full max-w-[720px] min-h-[500px]'
                }`}
                style={{
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* Header in Preview */}
                {showDocumentHeader && (
                  <div className="pb-3 mb-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-slate-900">
                        {documentTitle || 'LABEL ASET QR CODE'}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Tata Letak: Minimalis QR 2D · {activeAssets.length} Aset Terdaftar
                      </p>
                    </div>
                    <span className="text-[9px] font-medium text-slate-400">
                      Dicetak: {new Date().toLocaleDateString('id-ID')}
                    </span>
                  </div>
                )}

                {/* Empty State */}
                {activeAssets.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    Tidak ada aset yang dipilih untuk dicetak. Centang aset pada panel kiri.
                  </div>
                ) : layoutMode === 'table' ? (
                  /* Live Table Preview */
                  <div className="border border-slate-200 rounded-sm overflow-hidden text-[10px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-indigo-600 text-white font-bold text-[9px]">
                          <th className="p-1.5 text-center w-6">No</th>
                          <th className="p-1.5 w-24">QR Code</th>
                          <th className="p-1.5">Kode Aset</th>
                          <th className="p-1.5">Nama Aset</th>
                          <th className="p-1.5">Nama Outlet</th>
                          <th className="p-1.5">Lokasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeAssets.slice(0, 8).map((asset, idx) => (
                          <tr key={asset.id} className="hover:bg-slate-50">
                            <td className="p-1.5 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-1.5">
                              <LivePreviewQr code={asset.barcode} size={32} />
                            </td>
                            <td className="p-1.5 font-mono font-bold">{asset.barcode}</td>
                            <td className="p-1.5 font-semibold text-slate-800">{asset.name}</td>
                            <td className="p-1.5 text-slate-700 font-medium">
                              {outletNameInput.trim() || asset.outlet || <span className="text-rose-500 italic">Belum diinput</span>}
                            </td>
                            <td className="p-1.5 text-amber-700 font-semibold">{asset.location || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Live Minimalist QR Cards Grid (Exact requested layout) */
                  <div
                    className={`grid gap-2.5 ${
                      columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}
                  >
                    {activeAssets.slice(0, 16).map((asset) => (
                      <div
                        key={asset.id}
                        className={`p-2.5 rounded-sm flex items-center gap-3 transition-all ${
                          borderStyle === 'solid'
                            ? 'border border-slate-300'
                            : borderStyle === 'dashed'
                            ? 'border border-dashed border-slate-400'
                            : 'border-b border-slate-100'
                        }`}
                      >
                        {/* 2D QR Code on the LEFT */}
                        <div className="shrink-0 flex items-center justify-center">
                          <LivePreviewQr
                            code={asset.barcode}
                            size={
                              barcodeSize === 'small'
                                ? columns === 3
                                  ? 36
                                  : 42
                                : barcodeSize === 'jumbo'
                                ? columns === 3
                                  ? 52
                                  : 64
                                : columns === 3
                                ? 44
                                : 52
                            }
                          />
                        </div>

                        {/* Details on the RIGHT SIDE (Sesuai request: kode aset, nama aset, nama outlet) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
                          {/* 1. KODE ASET */}
                          <span className="font-mono font-bold text-[11px] text-slate-900 tracking-tight truncate">
                            {asset.barcode}
                          </span>

                          {/* 2. NAMA ASET (Wrap Text Otomatis) */}
                          <span className="font-bold text-[10.5px] text-slate-800 leading-snug break-words mt-0.5">
                            {asset.name}
                          </span>

                          {/* 3. NAMA OUTLET (Diinput saat mengedit, tidak dari default) */}
                          {showOutlet && (
                            <span
                              className={`text-[9.5px] leading-snug break-words mt-0.5 ${
                                (outletNameInput.trim() || asset.outlet?.trim())
                                  ? 'text-slate-600 font-medium'
                                  : 'text-rose-500 font-semibold italic'
                              }`}
                            >
                              {(outletNameInput.trim() || asset.outlet?.trim())
                                ? `Outlet: ${outletNameInput.trim() || asset.outlet?.trim()}`
                                : '⚠️ Outlet belum diinput (Ketik di panel kiri)'}
                            </span>
                          )}

                          {/* Optional: LOKASI ASET */}
                          {showLocation && asset.location && (
                            <span className="text-[9px] font-bold text-amber-700 leading-snug break-words mt-0.5">
                              Lokasi: {asset.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* More indicator if list is long */}
                {activeAssets.length > 16 && (
                  <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
                    + {activeAssets.length - 16} aset lainnya akan dicetak pada halaman berikutnya secara rapi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="font-medium">Total Dokumen:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {activeAssets.length} dari {assets.length} Aset
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>
              Format: <strong>{layoutMode === 'minimal_qr' ? 'Minimalis QR 2D' : layoutMode === 'cards' ? 'Stiker Kartu' : 'Tabel'}</strong> ({columns} Kolom, {orientation})
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isExporting || activeAssets.length === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Cetak langsung ke printer fisik thermal / kertas HVS"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak (Print)</span>
            </button>

            {/* Generate & Download PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting || activeAssets.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Buat & Unduh PDF Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
