import React, { useRef, useEffect } from 'react';
import { X, Printer, Check } from 'lucide-react';
import { renderBarcodeToCanvas } from '../utils/barcode';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ code: string; label?: string; subtitle?: string }>;
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* Screen Container */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Pratinjau Cetak Label Barcode ({items.length} Label)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Siap dicetak pada kertas stiker / label Tom & Jerry atau printer thermal barcode.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Preview Grid */}
        <div className="p-6 overflow-y-auto space-y-4 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item, idx) => (
              <LabelTagCard key={idx} item={item} />
            ))}
          </div>
        </div>

        {/* Footer with Print Action */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total {items.length} label siap dicetak
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Cetak Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY VIEW: Clean stylesheet for browser printing */}
      <div className="print-only w-full bg-white text-black p-4">
        <div className="grid grid-cols-3 gap-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="border border-slate-400 p-2.5 rounded flex flex-col items-center justify-center text-center text-black"
              style={{ pageBreakInside: 'avoid' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-black">
                {item.label || 'PROPERTI PERUSAHAAN'}
              </div>
              <LabelCanvas code={item.code} />
              <div className="text-[11px] font-mono font-bold mt-1 text-black">
                {item.code}
              </div>
              {item.subtitle && (
                <div className="text-[9px] text-black mt-0.5 truncate max-w-full">
                  {item.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LabelTagCard: React.FC<{ item: { code: string; label?: string; subtitle?: string } }> = ({ item }) => {
  return (
    <div className="bg-white border-2 border-slate-700 rounded-lg p-3.5 flex flex-col items-center justify-center text-center shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-1 border-b border-slate-200 pb-0.5 w-full">
        {item.label || 'PROPERTI PERUSAHAAN'}
      </div>
      <div className="py-1">
        <LabelCanvas code={item.code} />
      </div>
      <div className="text-xs font-mono font-bold text-slate-900 mt-1">
        {item.code}
      </div>
      {item.subtitle && (
        <div className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[200px]">
          {item.subtitle}
        </div>
      )}
    </div>
  );
};

const LabelCanvas: React.FC<{ code: string }> = ({ code }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderBarcodeToCanvas(canvasRef.current, code, {
        height: 48,
        width: 1.6,
        displayValue: false,
        margin: 2,
      });
    }
  }, [code]);

  return <canvas ref={canvasRef} className="max-w-full" />;
};
