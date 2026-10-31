import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  Copy,
  PlusCircle,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Check,
  Settings2,
  QrCode,
  Tag,
} from 'lucide-react';
import { BarcodeType, Asset } from '../types/asset';
import { renderBarcodeToCanvas, downloadBarcodeImage } from '../utils/barcode';
import { sanitizeBarcode, findDuplicateAsset } from '../utils/validation';

interface BarcodeGeneratorProps {
  onRegisterAssetWithCode: (code: string) => void;
  onOpenPrintLabels: (codes: Array<{ code: string; label?: string }>) => void;
  existingAssets: Asset[];
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  onRegisterAssetWithCode,
  onOpenPrintLabels,
  existingAssets,
}) => {
  const [activeMode, setActiveMode] = useState<'single' | 'batch'>('single');

  // Single word to barcode state
  const [inputText, setInputText] = useState('AST-2026-0099');
  const [labelTitle, setLabelTitle] = useState('PROPERTI PERUSAHAAN');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeType>('CODE128');
  const [barHeight, setBarHeight] = useState(65);
  const [barWidth, setBarWidth] = useState(2);
  const [displayValue, setDisplayValue] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Batch generator state
  const [batchPrefix, setBatchPrefix] = useState('AST-2026-');
  const [batchStartNum, setBatchStartNum] = useState(1);
  const [batchCount, setBatchCount] = useState(10);
  const [batchPadding, setBatchPadding] = useState(4);
  const [batchItems, setBatchItems] = useState<Array<{ code: string; isDuplicate: boolean }>>([]);

  // Live render single barcode to canvas
  useEffect(() => {
    if (canvasRef.current && inputText.trim()) {
      renderBarcodeToCanvas(canvasRef.current, inputText.trim(), {
        format: barcodeFormat,
        height: barHeight,
        width: barWidth,
        displayValue,
        fontSize,
      });
    }
  }, [inputText, barcodeFormat, barHeight, barWidth, displayValue, fontSize]);

  // Recalculate batch items
  useEffect(() => {
    const list: Array<{ code: string; isDuplicate: boolean }> = [];
    const count = Math.min(Math.max(1, batchCount), 50); // limit 50 at once for UI smoothness
    for (let i = 0; i < count; i++) {
      const num = batchStartNum + i;
      const numStr = String(num).padStart(batchPadding, '0');
      const code = sanitizeBarcode(`${batchPrefix}${numStr}`);
      const isDup = !!findDuplicateAsset(code, existingAssets);
      list.push({ code, isDuplicate: isDup });
    }
    setBatchItems(list);
  }, [batchPrefix, batchStartNum, batchCount, batchPadding, existingAssets]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (canvasRef.current) {
      downloadBarcodeImage(canvasRef.current, `Barcode_${sanitizeBarcode(inputText)}`, 'png');
    }
  };

  const isCurrentDuplicate = !!findDuplicateAsset(inputText, existingAssets);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Generator Barcode Aset
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ubah kata, kode barang, atau serial number apa pun menjadi barcode berstandar industri
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          <button
            onClick={() => setActiveMode('single')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeMode === 'single'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Satu Kata / Kode
          </button>
          <button
            onClick={() => setActiveMode('batch')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeMode === 'batch'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Batch Urut (Massal)
          </button>
        </div>
      </div>

      {/* SINGLE BARCODE GENERATOR MODE */}
      {activeMode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Kata / Kode / Teks Barcode</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Bisa angka, huruf, atau tanda minus
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ketik kata yang ingin dibuat barcode..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                    title="Salin Kode Teks"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Duplicate check warning */}
              {isCurrentDuplicate && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    Perhatian: Kode ini sudah digunakan oleh aset yang terdaftar di sistem.
                  </span>
                </div>
              )}

              {/* Label Header Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Judul Stiker / Perusahaan (Opsional)
                </label>
                <input
                  type="text"
                  value={labelTitle}
                  onChange={(e) => setLabelTitle(e.target.value)}
                  placeholder="Contoh: PT MAKMUR JAYA ABADI / ASET IT"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Format selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Format Simbologi
                  </label>
                  <select
                    value={barcodeFormat}
                    onChange={(e) => setBarcodeFormat(e.target.value as BarcodeType)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CODE128">CODE128 (Universal Alphanumeric)</option>
                    <option value="CODE39">CODE39 (Standar Industri)</option>
                    <option value="QR">QR Code (2D Barcode)</option>
                    <option value="EAN13">EAN-13 (13 Digit Angka)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tinggi Barcode
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="range"
                      min={40}
                      max={120}
                      value={barHeight}
                      onChange={(e) => setBarHeight(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <span className="text-xs font-mono text-slate-500 w-8">{barHeight}px</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={displayValue}
                    onChange={(e) => setDisplayValue(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tampilkan Teks Nilai di Bawah Garis</span>
                </label>

                {displayValue && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Ukuran font:</span>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <option value={10}>10pt</option>
                      <option value={12}>12pt</option>
                      <option value={14}>14pt</option>
                      <option value={16}>16pt</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barcode Output & Action Buttons */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
              {/* Sticker Label Preview Box */}
              <div className="bg-white border-2 border-slate-800 rounded-lg p-5 shadow-sm max-w-sm w-full text-slate-900">
                {labelTitle && (
                  <div className="text-[11px] font-bold tracking-wider uppercase border-b border-slate-200 pb-1 mb-2 text-slate-800">
                    {labelTitle}
                  </div>
                )}

                <div className="flex items-center justify-center min-h-[100px] overflow-hidden">
                  <canvas ref={canvasRef} className="max-w-full" />
                </div>

                <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  Sistem Inventaris Aset Terdaftar
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full pt-2">
                <button
                  onClick={handleDownloadPNG}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Gambar PNG
                </button>

                <button
                  onClick={() =>
                    onOpenPrintLabels([
                      { code: inputText, label: labelTitle || 'Label Barcode Aset' },
                    ])
                  }
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Format Stiker
                </button>

                <button
                  onClick={() => onRegisterAssetWithCode(inputText)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Daftarkan Jadi Aset Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCH GENERATOR MODE */}
      {activeMode === 'batch' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Awalan Kode (Prefix)
                </label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  placeholder="Contoh: AST-2026-"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor Mulai
                </label>
                <input
                  type="number"
                  min={1}
                  value={batchStartNum}
                  onChange={(e) => setBatchStartNum(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jumlah Barcode
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Panjang Angka (Padding)
                </label>
                <select
                  value={batchPadding}
                  onChange={(e) => setBatchPadding(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value={3}>3 digit (001)</option>
                  <option value={4}>4 digit (0001)</option>
                  <option value={5}>5 digit (00001)</option>
                  <option value={6}>6 digit (000001)</option>
                </select>
              </div>
            </div>

            {/* Batch summary and print action */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Akan menghasilkan{' '}
                <strong className="text-slate-900 dark:text-white">
                  {batchItems.length} kode barcode
                </strong>{' '}
                dari <span className="font-mono">{batchItems[0]?.code}</span> hingga{' '}
                <span className="font-mono">{batchItems[batchItems.length - 1]?.code}</span>.
              </div>

              <button
                onClick={() =>
                  onOpenPrintLabels(
                    batchItems.map(item => ({
                      code: item.code,
                      label: 'STIKER ASET PERUSAHAAN',
                    }))
                  )
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar Stiker Barcode ({batchItems.length} Tag)
              </button>
            </div>
          </div>

          {/* Grid of Batch Items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {batchItems.map((item, idx) => (
              <div
                key={idx}
                className={`bg-white dark:bg-slate-900 border rounded-lg p-3 text-center space-y-2 relative transition-all ${
                  item.isDuplicate
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <BatchBarcodeCard code={item.code} />
                <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate">
                  {item.code}
                </div>
                {item.isDuplicate ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Sudah terdaftar
                  </span>
                ) : (
                  <button
                    onClick={() => onRegisterAssetWithCode(item.code)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 w-full"
                  >
                    <PlusCircle className="w-3 h-3" />
                    Daftarkan
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mini barcode canvas renderer for batch grid
const BatchBarcodeCard: React.FC<{ code: string }> = ({ code }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderBarcodeToCanvas(canvasRef.current, code, {
        height: 40,
        width: 1.5,
        displayValue: false,
        margin: 2,
      });
    }
  }, [code]);

  return (
    <div className="flex items-center justify-center bg-white p-1 rounded border border-slate-100">
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  );
};
