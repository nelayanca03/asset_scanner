import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Camera,
  Printer,
  RefreshCw,
  CheckCircle2,
  Upload,
  Trash2,
} from 'lucide-react';
import { Asset } from './types/asset';
import { INITIAL_ASSETS } from './data/sampleAssets';
import { Navbar } from './components/Navbar';
import { ActiveWorkspaceSelector } from './components/ActiveWorkspaceSelector';
import { DirectScanBar } from './components/DirectScanBar';
import { AssetTable } from './components/AssetTable';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { AssetFormModal } from './components/AssetFormModal';
import { DuplicateAlertModal } from './components/DuplicateAlertModal';
import { AssetDetailModal } from './components/AssetDetailModal';
import { AssetImportModal } from './components/AssetImportModal';
import { ClearAllModal } from './components/ClearAllModal';
import { BarcodeGenerator } from './components/BarcodeGenerator';
import { PrintLabelModal } from './components/PrintLabelModal';
import { PdfExportModal } from './components/PdfExportModal';
import { exportAssetsToExcel, exportAssetsToCSV } from './utils/excel';
import { exportAssetsToPDF } from './utils/pdf';
import { sanitizeBarcode } from './utils/validation';
import { soundEffects } from './utils/audio';

const STORAGE_KEY = 'assetscan_inventory_v1';
const THEME_KEY = 'assetscan_theme_v1';

export default function App() {
  // Asset state with local storage
  const [assets, setAssets] = useState<Asset[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ASSETS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize items with outlet and location
          return parsed.map(item => ({
            ...item,
            outlet: item.outlet || 'Outlet Grand Indonesia',
            location: item.location || item.department || 'Dapur',
          }));
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_ASSETS;
  });

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'dark';
  });

  // Active top view: 'inventory' | 'generator'
  const [activeTab, setActiveTab] = useState<'inventory' | 'generator'>('inventory');

  // Active Workspace: Outlet & Lokasi Aset (Dapur / Service dll.)
  const [currentOutlet, setCurrentOutlet] = useState<string>('Outlet Grand Indonesia');
  const [currentLocation, setCurrentLocation] = useState<string>('Dapur');

  // Dynamic available outlets and locations derived from assets
  const availableOutlets = useMemo(() => {
    const defaults = ['Outlet Grand Indonesia', 'Outlet Senayan City', 'Outlet Sudirman', 'Outlet Kelapa Gading'];
    const fromData = assets.map(a => a.outlet).filter(Boolean);
    return Array.from(new Set([...defaults, ...fromData])).sort();
  }, [assets]);

  const availableLocations = useMemo(() => {
    const defaults = ['Dapur', 'Service', 'Bar', 'Kasir', 'Gudang', 'Area Makan / Dining'];
    const fromData = assets.map(a => a.location).filter(Boolean);
    return Array.from(new Set([...defaults, ...fromData])).sort();
  }, [assets]);

  // Scanner & Form state
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formInitialBarcode, setFormInitialBarcode] = useState('');
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  // Duplicate alert modal state
  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateBarcode, setDuplicateBarcode] = useState('');
  const [duplicateAsset, setDuplicateAsset] = useState<Asset | null>(null);

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);

  // Print label modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLabelItems, setPrintLabelItems] = useState<Array<{ code: string; label?: string; subtitle?: string }>>([]);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Clear all data modal state
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // PDF Export modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfExportSubset, setPdfExportSubset] = useState<Asset[] | undefined>(undefined);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  // Sync assets with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [assets]);

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // DIRECT BARCODE DETECTION (Directly from gun scanner, camera, or quick bar)
  // "saat membuka web ini. dan langsung saya scan barcodenya. bisa langsung memunculkan datanya. lalu save dahulu."
  const handleDirectBarcodeDetected = useCallback((rawCode: string) => {
    const clean = sanitizeBarcode(rawCode);
    if (!clean) return;

    setLastScannedBarcode(clean);

    // Check if barcode already exists in inventory
    const existing = assets.find(a => sanitizeBarcode(a.barcode) === clean);

    if (existing) {
      // Barcode already exists: "bisa langsung memunculkan datanya"
      soundEffects.playScanSuccess();
      setSelectedAssetForDetail(existing);
      setIsDetailModalOpen(true);
      showToast(`Data Ditemukan: ${existing.name} (${existing.outlet} · ${existing.location || '-'})`);
    } else {
      // New barcode: Open registration form so user can fill in details and "save dahulu"
      soundEffects.playScanSuccess();
      setAssetToEdit(null);
      setFormInitialBarcode(clean);
      setIsFormModalOpen(true);
      showToast(`Barcode ${clean} terdeteksi! Siap didata ke ${currentOutlet} · ${currentLocation}`);
    }
  }, [assets, currentOutlet, currentLocation]);

  // Save asset (Create or Update)
  const handleSaveAsset = (newAsset: Asset) => {
    setAssets(prev => {
      const idx = prev.findIndex(a => a.id === newAsset.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newAsset;
        return updated;
      } else {
        return [newAsset, ...prev];
      }
    });
    showToast(`Aset "${newAsset.name}" di ${newAsset.outlet} berhasil disimpan!`);
  };

  // Handle imported assets from Excel/CSV
  const handleImportSuccess = (importedAssets: Asset[]) => {
    setAssets(prev => [...importedAssets, ...prev]);
    showToast(`Berhasil mengimpor ${importedAssets.length} aset dari file Excel!`);
  };

  // Delete single asset
  const handleDeleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    showToast('Aset berhasil dihapus dari inventaris.');
  };

  // Bulk delete
  const handleBulkDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    setAssets(prev => prev.filter(a => !idSet.has(a.id)));
    showToast(`${ids.length} aset berhasil dihapus.`);
  };

  // Clear all data confirmed
  const handleConfirmClearAll = () => {
    const count = assets.length;
    setAssets([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    soundEffects.playDuplicateAlert();
    showToast(`Seluruh data aset (${count} item) telah berhasil dihapus.`);
  };

  // Reset to initial sample data
  const handleResetSampleData = () => {
    if (confirm('Kembalikan ke data contoh inventaris awal? Perubahan saat ini akan digantikan.')) {
      setAssets(INITIAL_ASSETS);
      showToast('Data inventaris berhasil direset ke contoh awal.');
    }
  };

  // Clear all data
  const handleClearAll = () => {
    if (confirm('Hapus seluruh data aset inventaris? Tindakan ini tidak dapat dibatalkan.')) {
      setAssets([]);
      showToast('Seluruh data aset telah dibersihkan.');
    }
  };

  // Export Excel
  const handleExportExcel = (subset?: Asset[]) => {
    const listToExport = subset || assets;
    if (listToExport.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    try {
      const fileName = exportAssetsToExcel(listToExport);
      showToast(`File Excel berhasil diunduh: ${fileName}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengekspor file Excel');
    }
  };

  // Export PDF with format: Barcode, Nama Outlet, Kode Aset, Nama Aset
  const handleExportPDF = (subset?: Asset[]) => {
    const listToExport = subset || assets;
    if (listToExport.length === 0) {
      alert('Tidak ada data untuk diekspor ke PDF.');
      return;
    }
    setPdfExportSubset(subset);
    setIsPdfModalOpen(true);
  };

  // Export CSV
  const handleExportCSV = (subset?: Asset[]) => {
    const listToExport = subset || assets;
    if (listToExport.length === 0) return;
    exportAssetsToCSV(listToExport);
    showToast('File CSV berhasil diunduh.');
  };

  // Open Print modal for specific items
  const handlePrintLabels = (items: Array<{ code: string; label?: string; subtitle?: string }>) => {
    setPrintLabelItems(items);
    setIsPrintModalOpen(true);
  };

  // Quick register from Barcode Generator tab
  const handleRegisterFromGenerator = (code: string) => {
    handleDirectBarcodeDetected(code);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workspace Mode: INVENTARIS ASET */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Header with Title and Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Data Inventaris Aset
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pindai barcode secara langsung, verifikasi data aset outlet, lalu ekspor ke Excel atau PDF.
                </p>
              </div>

              {/* Action Buttons: PDF, Excel, Input Manual, Cetak */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Export PDF Button (Highlighted with format: Barcode, Outlet, Kode, Nama) */}
                <button
                  onClick={() => handleExportPDF()}
                  className="px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  title="Ekspor PDF resmi berformat: Barcode, Nama Outlet, Kode Aset, Nama Aset"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ekspor PDF (.pdf)</span>
                </button>

                {/* Export Excel Button */}
                <button
                  onClick={() => handleExportExcel()}
                  className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  title="Ekspor seluruh data aset ke file Excel .xlsx"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>

                {/* Import Excel Button */}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  title="Import data aset dari file Excel atau CSV"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Data (Excel)</span>
                </button>

                {/* Input Manual Button */}
                <button
                  onClick={() => {
                    setAssetToEdit(null);
                    setFormInitialBarcode('');
                    setIsFormModalOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Aset Manual</span>
                </button>

                {/* Print All Labels */}
                <button
                  onClick={() =>
                    handlePrintLabels(
                      assets.map(a => ({
                        code: a.barcode,
                        label: a.name,
                        subtitle: `${a.outlet} · ${a.category}`,
                      }))
                    )
                  }
                  className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Cetak stiker barcode untuk semua aset"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cetak Label</span>
                </button>

                {/* Hapus Semua Data Button */}
                {assets.length > 0 && (
                  <button
                    onClick={() => setIsClearAllModalOpen(true)}
                    className="px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                    title="Hapus seluruh data aset inventaris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua Data</span>
                  </button>
                )}

                {/* Reset / Sample Menu */}
                <button
                  onClick={handleResetSampleData}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                  title="Muat Ulang Contoh Data Aset"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PEMILIHAN NAMA OUTLET & LOKASI ASET (DAPUR, SERVICE, DLL.) */}
            <ActiveWorkspaceSelector
              currentOutlet={currentOutlet}
              onSelectOutlet={setCurrentOutlet}
              availableOutlets={availableOutlets}
              currentLocation={currentLocation}
              onSelectLocation={setCurrentLocation}
              availableLocations={availableLocations}
            />

            {/* DIRECT SCANNER BAR (Prominent, always listening, camera-toggle ready) */}
            <DirectScanBar
              onBarcodeDetected={handleDirectBarcodeDetected}
              lastScannedCode={lastScannedBarcode}
              currentOutlet={currentOutlet}
              currentLocation={currentLocation}
            />

            {/* Assets Table Component */}
            <AssetTable
              assets={assets}
              onSelectAsset={(asset) => {
                setSelectedAssetForDetail(asset);
                setIsDetailModalOpen(true);
              }}
              onEditAsset={(asset) => {
                setAssetToEdit(asset);
                setIsFormModalOpen(true);
              }}
              onDeleteAsset={handleDeleteAsset}
              onBulkDelete={handleBulkDelete}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              onExportCSV={handleExportCSV}
              onPrintLabels={handlePrintLabels}
              onOpenNewAssetModal={() => {
                setAssetToEdit(null);
                setFormInitialBarcode('');
                setIsFormModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Workspace Mode: GENERATOR BARCODE */}
        {activeTab === 'generator' && (
          <BarcodeGenerator
            onRegisterAssetWithCode={handleRegisterFromGenerator}
            onOpenPrintLabels={handlePrintLabels}
            existingAssets={assets}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AssetScan Pro — Sistem Manajemen Barcode & Inventarisasi Aset Outlet
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>{assets.length} aset tersimpan</span>
            <span>·</span>
            <span>Scanner Aktif & Siap Pindai</span>
            <span>·</span>
            <button
              onClick={handleClearAll}
              className="text-rose-500 hover:underline"
            >
              Hapus Semua Data
            </button>
          </div>
        </div>
      </footer>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-70 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL 1: FULLSCREEN BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={handleDirectBarcodeDetected}
        onDuplicateDetected={(code, existing) => {
          setIsScannerOpen(false);
          setSelectedAssetForDetail(existing);
          setIsDetailModalOpen(true);
          showToast(`Data Ditemukan: ${existing.name} (${existing.outlet})`);
        }}
        existingAssets={assets}
      />

      {/* MODAL 2: ASSET REGISTRATION & EDIT FORM (Save Dahulu) */}
      <AssetFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setAssetToEdit(null);
        }}
        onSave={handleSaveAsset}
        existingAssets={assets}
        initialBarcode={formInitialBarcode}
        assetToEdit={assetToEdit}
        defaultOutlet={currentOutlet}
        defaultLocation={currentLocation}
      />

      {/* MODAL 3: DUPLICATE ALERT MODAL */}
      <DuplicateAlertModal
        isOpen={isDuplicateAlertOpen}
        onClose={() => setIsDuplicateAlertOpen(false)}
        barcode={duplicateBarcode}
        existingAsset={duplicateAsset}
        onViewOrEditAsset={(asset) => {
          setSelectedAssetForDetail(asset);
          setIsDetailModalOpen(true);
        }}
        onScanAnother={() => {
          setIsDuplicateAlertOpen(false);
          setIsScannerOpen(true);
        }}
      />

      {/* MODAL 4: ASSET DETAIL & SPECIFICATION MODAL */}
      <AssetDetailModal
        asset={selectedAssetForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedAssetForDetail(null);
        }}
        onEdit={(asset) => {
          setAssetToEdit(asset);
          setIsFormModalOpen(true);
        }}
        onDelete={handleDeleteAsset}
        onPrintLabel={(asset) => {
          handlePrintLabels([
            {
              code: asset.barcode,
              label: asset.name,
              subtitle: `${asset.outlet} · ${asset.category}`,
            },
          ]);
        }}
      />

      {/* MODAL 5: PRINT STICKER LABEL SHEET MODAL */}
      <PrintLabelModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={printLabelItems}
      />

      {/* MODAL 6: IMPORT ASSETS FROM EXCEL / CSV */}
      <AssetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingAssets={assets}
        onImportSuccess={handleImportSuccess}
        defaultOutlet={currentOutlet}
        defaultLocation={currentLocation}
      />

      {/* MODAL 7: CLEAR ALL ASSETS CONFIRMATION */}
      <ClearAllModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={handleConfirmClearAll}
        assetCount={assets.length}
      />

      {/* MODAL 8: PDF EXPORT OPTIONS (JUMBO BARCODE, QR, CARDS) */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setPdfExportSubset(undefined);
        }}
        assets={pdfExportSubset || assets}
        onSuccessToast={showToast}
      />
    </div>
  );
}
