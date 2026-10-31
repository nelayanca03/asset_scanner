import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileUp,
  Sparkles,
  Info,
  Check,
  Store,
} from 'lucide-react';
import { Asset } from '../types/asset';
import {
  ParsedImportRow,
  parseExcelOrCsvFile,
  downloadImportExcelTemplate,
  USER_ATTACHMENT_SAMPLE_ROWS,
  extractAssetIds,
  inferCategoryFromName,
} from '../utils/importParser';
import { sanitizeBarcode, findDuplicateAsset } from '../utils/validation';
import { soundEffects } from '../utils/audio';

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAssets: Asset[];
  onImportSuccess: (importedAssets: Asset[]) => void;
  defaultOutlet?: string;
  defaultLocation?: string;
}

export const AssetImportModal: React.FC<AssetImportModalProps> = ({
  isOpen,
  onClose,
  existingAssets,
  onImportSuccess,
  defaultOutlet = 'Outlet Grand Indonesia',
  defaultLocation = 'Dapur',
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [customOutlet, setCustomOutlet] = useState(defaultOutlet);
  const [customLocation, setCustomLocation] = useState(defaultLocation);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle uploaded Excel or CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setFileName(file.name);
      const rows = await parseExcelOrCsvFile(file, existingAssets);
      setParsedRows(rows);
    } catch (err: unknown) {
      alert('Gagal membaca file Excel/CSV. Pastikan format tabel memiliki kolom NAMA dan ASSET ID / BARCODE.');
      console.error(err);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Load sample dataset from the user's attachment photo
  const handleLoadSampleFromPhoto = () => {
    const rows: ParsedImportRow[] = [];
    const processedInBatch = new Set<string>();

    for (const r of USER_ATTACHMENT_SAMPLE_ROWS) {
      const ids = extractAssetIds(r['ASSET ID']);
      let status: 'Aktif' | 'Dipinjam' | 'Dalam Perbaikan' | 'Diarsipkan / Afkir' = 'Aktif';
      if (r.QTY.includes('-> 0')) {
        status = 'Diarsipkan / Afkir';
      }

      for (const id of ids) {
        const clean = sanitizeBarcode(id);
        const isDbDup = !!findDuplicateAsset(clean, existingAssets);
        const isBatchDup = processedInBatch.has(clean);
        const isDup = isDbDup || isBatchDup;

        rows.push({
          barcode: clean,
          name: r.NAMA,
          outlet: defaultOutlet,
          location: r.LOKASI === 'SERVICE' ? 'Service' : 'Dapur',
          category: inferCategoryFromName(r.NAMA),
          status,
          notes: `Satuan: ${r.UOM}, Qty Ref: ${r.QTY}`,
          isDuplicate: isDup,
          isValid: !isDup && clean.length > 0,
          errorReason: isDbDup ? 'Sudah ada di database' : isBatchDup ? 'Duplikat dalam file' : undefined,
        });

        if (clean) processedInBatch.add(clean);
      }
    }

    setFileName('Data_Aset_Resto_Dapur_Sample.xlsx');
    setParsedRows(rows);
  };

  // Filter items to import based on settings
  const itemsToImport = parsedRows.filter(r => {
    if (!r.barcode || !r.name) return false;
    if (r.isDuplicate && skipDuplicates) return false;
    return true;
  });

  const validCount = itemsToImport.length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;

  // Execute import
  const handleConfirmImport = () => {
    if (itemsToImport.length === 0) {
      alert('Tidak ada data valid yang dapat diimpor.');
      return;
    }

    const now = new Date().toISOString();
    const assetsToAdd: Asset[] = itemsToImport.map((row, idx) => ({
      id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      barcode: row.barcode,
      name: row.name,
      outlet: row.outlet || customOutlet || defaultOutlet,
      location: row.location || customLocation || defaultLocation,
      category: row.category,
      status: row.status,
      serialNumber: row.serialNumber,
      notes: row.notes,
      createdAt: now,
      updatedAt: now,
    }));

    soundEffects.playSavedChime();
    onImportSuccess(assetsToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Import Data Aset dari Excel / CSV
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unggah file data aset (seperti format NAMA, QTY, UOM, LOKASI, ASSET ID).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Top Info & Template Helper Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Format kolom yang didukung: <strong>NAMA</strong>, <strong>LOKASI / OUTLET</strong>, <strong>ASSET ID / BARCODE</strong>, QTY, UOM.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleFromPhoto}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                title="Muat data dapur/resto sesuai screenshot user"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Gunakan Data Contoh (Foto)
              </button>

              <button
                type="button"
                onClick={downloadImportExcelTemplate}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Template Excel
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <FileUp className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isProcessing ? 'Sedang membaca file...' : 'Klik untuk Memilih File Excel atau CSV'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Format file yang didukung: .xlsx, .xls, .csv (Maksimal 5.000 baris)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            /* Parsed Summary & Preview Section */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {fileName}
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300">
                    · Berhasil membaca {parsedRows.length} item aset
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setFileName(null);
                    }}
                    className="text-emerald-800 dark:text-emerald-300 hover:underline font-medium"
                  >
                    Ganti File
                  </button>
                </div>
              </div>

              {/* Duplicate Prevention Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Lewati Barcode Duplikat ({duplicateCount} item terdeteksi)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {validCount}
                  </span>{' '}
                  aset baru siap diimpor
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Kode Aset (Barcode)</th>
                      <th className="py-2.5 px-3">Nama Aset</th>
                      <th className="py-2.5 px-3">Nama Outlet</th>
                      <th className="py-2.5 px-3">Lokasi Aset</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isDuplicate
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : !row.isValid
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                      >
                        <td className="py-2 px-3">
                          {row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Duplikat
                            </span>
                          ) : row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Siap
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {row.errorReason || 'Error'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {row.barcode || '-'}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                          {row.name}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          {row.outlet}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700">
                            {row.location || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {row.category}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          <span
                            className={
                              row.status === 'Aktif'
                                ? 'text-emerald-600'
                                : row.status === 'Diarsipkan / Afkir'
                                ? 'text-slate-400 font-medium'
                                : 'text-amber-600'
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            Batal
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={validCount === 0}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Impor {validCount} Aset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
