import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, X, Upload, Zap, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { Asset } from '../types/asset';
import { sanitizeBarcode, findDuplicateAsset } from '../utils/validation';
import { soundEffects } from '../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
  onDuplicateDetected: (code: string, existingAsset: Asset) => void;
  existingAssets: Asset[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onCodeScanned,
  onDuplicateDetected,
  existingAssets,
}) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'hardware' | 'image'>('camera');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  // Focus hardware scanner input when tab switched to hardware
  useEffect(() => {
    if (activeTab === 'hardware' && hardwareInputRef.current) {
      hardwareInputRef.current.focus();
    }
  }, [activeTab]);

  // Handle scanned raw string
  const processBarcodeResult = (rawCode: string) => {
    const cleanCode = sanitizeBarcode(rawCode);
    if (!cleanCode) return;

    setLastScannedCode(cleanCode);

    // Duplicate Check
    const duplicate = findDuplicateAsset(cleanCode, existingAssets);
    if (duplicate) {
      soundEffects.playDuplicateAlert();
      onDuplicateDetected(cleanCode, duplicate);
      return;
    }

    // New unique barcode!
    soundEffects.playScanSuccess();
    onCodeScanned(cleanCode);
  };

  // Start Camera
  const startCameraScanner = async (cameraIdToUse?: string) => {
    try {
      setCameraError(null);
      
      // Stop previous instance if any
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode('barcode-video-viewport', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      // Determine camera ID
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('Kamera tidak ditemukan pada perangkat Anda. Silakan gunakan input scanner fisik atau unggah gambar.');
        return;
      }

      setCameras(devices);
      const chosenId = cameraIdToUse || selectedCameraId || (devices[devices.length - 1]?.id ?? devices[0].id);
      setSelectedCameraId(chosenId);

      await scanner.start(
        chosenId,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          processBarcodeResult(decodedText);
        },
        () => {
          // Frame error, safe to ignore
        }
      );

      setScannerActive(true);
    } catch (err: unknown) {
      console.error('Camera scan error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Izin akses kamera ditolak. Silakan izinkan kamera di browser atau gunakan tab Barcode Gun / Manual.');
      } else {
        setCameraError('Tidak dapat membuka kamera. Perangkat mungkin sedang digunakan aplikasi lain atau tidak mendukung.');
      }
      setScannerActive(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  // Handle image file scan
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError(null);
      const html5QrCode = new Html5Qrcode('barcode-file-viewport', false);
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      processBarcodeResult(decodedText);
    } catch (err) {
      console.warn('Scan image failed:', err);
      setCameraError('Tidak dapat mendeteksi barcode pada foto ini. Pastikan gambar jelas dan tidak buram.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Handle manual / hardware gun submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processBarcodeResult(manualInput);
    setManualInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Scan Barcode Aset
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Arahkan ke barcode atau hubungkan alat scanner fisik (USB/Bluetooth)
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera Langsung
            </button>
            <button
              onClick={() => {
                setActiveTab('hardware');
                stopCamera();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'hardware'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Scanner Fisik / Input Cepat
            </button>
            <button
              onClick={() => {
                setActiveTab('image');
                stopCamera();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'image'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Foto
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Camera viewport container */}
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border border-slate-800 shadow-inner">
                <div id="barcode-video-viewport" className="w-full h-full" />
                
                {/* Visual scan target guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-36 border-2 border-dashed border-emerald-400/80 rounded-lg relative flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500/70 shadow-xs shadow-red-500 animate-pulse" />
                    <span className="absolute bottom-2 text-[10px] uppercase font-mono tracking-wider text-emerald-200 bg-slate-950/70 px-2 py-0.5 rounded">
                      Posisikan Barcode di Kotak
                    </span>
                  </div>
                </div>

                {!scannerActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-300 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-xs">Menyiapkan lensa kamera...</p>
                  </div>
                )}
              </div>

              {/* Camera switcher */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <label htmlFor="camera-select" className="text-slate-600 dark:text-slate-400 shrink-0">
                    Pilih Kamera:
                  </label>
                  <select
                    id="camera-select"
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startCameraScanner(e.target.value);
                    }}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{cameraError}</p>
                    <p className="text-rose-700/80 dark:text-rose-400/80">
                      Solusi: Beralih ke tab <strong>"Scanner Fisik / Input Cepat"</strong> untuk mengetik atau menembak barcode dengan scanner barcode gun.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HARDWARE / MANUAL TAB */}
          {activeTab === 'hardware' && (
            <div className="space-y-4 py-2">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 text-xs font-semibold">
                  <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Kompatibel dengan Barcode Scanner Fisik (USB / Bluetooth Laser Gun)
                </div>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
                  Arahkan scanner genggam Anda ke fisik barcode aset, lalu tekan pelatuk (trigger). Barcode akan langsung terinput otomatis tanpa perlu mengarahkan mouse.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Input / Hasil Tembakan Scanner:
                </label>
                <div className="flex gap-2">
                  <input
                    ref={hardwareInputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Contoh: AST-2026-0010 atau tembakkan scanner..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!manualInput.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    Proses Barcode
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* IMAGE UPLOAD TAB */}
          {activeTab === 'image' && (
            <div className="space-y-4 py-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
              >
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Klik untuk Memilih Foto Barcode
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Mendukung format PNG, JPG, JPEG, WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div id="barcode-file-viewport" className="hidden" />

              {cameraError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* Live Protection Info Note */}
          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Pencegahan Duplikat Aktif:
              </span>{' '}
              Sistem membandingkan kode hasil scan dengan {existingAssets.length} aset yang telah terdaftar. Barcode yang sama akan langsung dicegah dan dibunyikan nada peringatan.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            {lastScannedCode ? `Terakhir dipindai: ${lastScannedCode}` : 'Siap memindai'}
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
