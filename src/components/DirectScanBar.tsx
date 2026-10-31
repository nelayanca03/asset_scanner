import React, { useState, useRef, useEffect } from 'react';
import { Camera, Zap, ScanLine, X, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { sanitizeBarcode } from '../utils/validation';
import { soundEffects } from '../utils/audio';

interface DirectScanBarProps {
  onBarcodeDetected: (code: string) => void;
  lastScannedCode: string | null;
  currentOutlet?: string;
  currentLocation?: string;
}

export const DirectScanBar: React.FC<DirectScanBarProps> = ({
  onBarcodeDetected,
  lastScannedCode,
  currentOutlet = 'Outlet Grand Indonesia',
  currentLocation = 'Dapur',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Auto-focus input on load so physical scanner guns can shoot immediately!
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Global listener for fast barcode scanners (USB / Bluetooth gun)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing normally in a textarea or modal input
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      
      // If the user is currently typing in the main direct scan input, allow native behavior
      if (activeEl === inputRef.current) {
        return;
      }

      // If active element is inside another modal, do not intercept
      if (isInput && activeEl !== inputRef.current) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Barcode scanners type very rapidly (< 45ms per character)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const finalCode = sanitizeBarcode(buffer);
          onBarcodeDetected(finalCode);
          buffer = '';
          e.preventDefault();
        } else {
          buffer = '';
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 120) {
          // Reset buffer if delay too long (manual human typing)
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBarcodeDetected]);

  // Handle manual submit (Enter key or button)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const clean = sanitizeBarcode(manualCode);
    onBarcodeDetected(clean);
    setManualCode('');
  };

  // Toggle inline live camera
  const toggleCamera = async () => {
    if (cameraActive) {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {
          // ignore
        }
        html5QrCodeRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    try {
      setCameraError(null);
      const html5QrCode = new Html5Qrcode('direct-scan-camera-stream', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          const clean = sanitizeBarcode(decodedText);
          onBarcodeDetected(clean);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err: unknown) {
      setCameraError('Gagal membuka kamera perangkat. Periksa izin kamera browser.');
      setCameraActive(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 dark:border-indigo-500/30 rounded-xl p-4 shadow-sm space-y-3">
      {/* Top Banner with Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Scanner Siap Langsung Memindai
          </span>
          <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-medium border border-indigo-200 dark:border-indigo-800/80">
            Target: <strong>{currentOutlet}</strong> · Lokasi: <strong>{currentLocation}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastScannedCode && (
            <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Terakhir: {lastScannedCode}
            </span>
          )}

          <button
            onClick={toggleCamera}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              cameraActive
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{cameraActive ? 'Tutup Kamera' : 'Nyalakan Kamera Langsung'}</span>
          </button>
        </div>
      </div>

      {/* Main Scan Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="w-5 h-5 text-indigo-600 dark:text-indigo-400 absolute left-3.5 top-2.5" />
          <input
            ref={inputRef}
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Arahkan barcode gun ke sini & tembakkan, atau ketik kode barcode lalu tekan Enter..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-indigo-400/60 dark:border-indigo-500/60 rounded-lg pl-11 pr-4 py-2.5 text-sm font-mono tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 placeholder:text-slate-400 font-medium"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!manualCode.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Proses Scan</span>
        </button>
      </form>

      {/* Embedded Live Camera Stream (Visible if toggled) */}
      {cameraActive && (
        <div className="pt-2">
          <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-16/9 max-w-md mx-auto border border-slate-800">
            <div id="direct-scan-camera-stream" className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-28 border-2 border-dashed border-emerald-400/80 rounded relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
};
