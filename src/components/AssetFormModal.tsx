import React, { useState, useEffect, useRef } from 'react';
import { X, Check, AlertCircle, Wand2, Barcode as BarcodeIcon, ShieldAlert, Store } from 'lucide-react';
import { Asset, AssetCategory, AssetStatus } from '../types/asset';
import {
  toTitleCase,
  sanitizeBarcode,
  validateAssetInput,
  generateNextBarcode,
} from '../utils/validation';
import { renderBarcodeToSvg } from '../utils/barcode';
import { soundEffects } from '../utils/audio';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  existingAssets: Asset[];
  initialBarcode?: string;
  assetToEdit?: Asset | null;
  defaultOutlet?: string;
  defaultLocation?: string;
}

const CATEGORIES: AssetCategory[] = [
  'Elektronik & IT',
  'Peralatan Kantor',
  'Furnitur & Mebel',
  'Kendaraan Operasional',
  'Mesin & Alat Berat',
  'Perangkat Jaringan',
  'Alat Medis & Lab',
  'Lainnya',
];

const STATUSES: AssetStatus[] = [
  'Aktif',
  'Dipinjam',
  'Dalam Perbaikan',
  'Diarsipkan / Afkir',
];

const QUICK_LOCATIONS = ['Dapur', 'Service', 'Bar', 'Kasir', 'Gudang', 'Area Makan / Dining'];

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingAssets,
  initialBarcode = '',
  assetToEdit = null,
  defaultOutlet = 'Outlet Grand Indonesia',
  defaultLocation = 'Dapur',
}) => {
  const [formData, setFormData] = useState<Partial<Asset>>({
    barcode: '',
    name: '',
    outlet: defaultOutlet,
    location: defaultLocation,
    category: 'Elektronik & IT',
    status: 'Aktif',
    serialNumber: '',
    notes: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      if (assetToEdit) {
        setFormData({ ...assetToEdit });
      } else {
        const nextCode = initialBarcode ? sanitizeBarcode(initialBarcode) : generateNextBarcode(existingAssets);
        setFormData({
          barcode: nextCode,
          name: '',
          outlet: defaultOutlet,
          location: defaultLocation,
          category: 'Elektronik & IT',
          status: 'Aktif',
          serialNumber: '',
          notes: '',
        });
      }
      setTouched({});
    }
  }, [isOpen, initialBarcode, assetToEdit, existingAssets, defaultOutlet, defaultLocation]);

  // Real-time validation computation
  const validation = validateAssetInput(formData, existingAssets, assetToEdit?.id);

  // Render barcode preview in real time
  useEffect(() => {
    if (barcodeSvgRef.current && formData.barcode) {
      renderBarcodeToSvg(barcodeSvgRef.current, formData.barcode, {
        height: 50,
        width: 1.8,
        fontSize: 12,
        margin: 5,
      });
    }
  }, [formData.barcode]);

  const handleAutoTitleCase = () => {
    if (formData.name) {
      setFormData(prev => ({ ...prev, name: toTitleCase(prev.name || '') }));
    }
  };

  const handleGenerateNextCode = () => {
    const nextCode = generateNextBarcode(existingAssets);
    setFormData(prev => ({ ...prev, barcode: nextCode }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      barcode: true,
      name: true,
      outlet: true,
      location: true,
      category: true,
      status: true,
    });

    if (!validation.isValid) {
      soundEffects.playDuplicateAlert();
      return;
    }

    const now = new Date().toISOString();
    const finalAsset: Asset = {
      id: assetToEdit?.id || `asset-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      barcode: sanitizeBarcode(formData.barcode || ''),
      name: formData.name?.trim() || '',
      outlet: formData.outlet?.trim() || defaultOutlet,
      location: formData.location?.trim() || defaultLocation,
      category: formData.category || 'Elektronik & IT',
      status: formData.status || 'Aktif',
      serialNumber: formData.serialNumber?.trim() || '',
      notes: formData.notes?.trim() || '',
      createdAt: assetToEdit?.createdAt || now,
      updatedAt: now,
    };

    soundEffects.playSavedChime();
    onSave(finalAsset);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarcodeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {assetToEdit ? 'Ubah Data Aset' : 'Registrasi & Simpan Data Aset'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {assetToEdit
                ? `Mengedit data inventaris untuk kode aset ${assetToEdit.barcode}`
                : 'Lengkapi nama aset dan outlet, lalu klik Simpan Aset.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[78vh]">
          {/* SECTION 1: BARCODE & PREVIEW */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Kode Aset / Barcode Tag</span>
                <span className="text-rose-500">*</span>
              </label>
              {!assetToEdit && (
                <button
                  type="button"
                  onClick={handleGenerateNextCode}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Auto-Generate Kode Tag
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, barcode: sanitizeBarcode(e.target.value) }));
                  setTouched(prev => ({ ...prev, barcode: true }));
                }}
                placeholder="Contoh: AST-2026-0001"
                className={`flex-1 bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2 text-sm font-mono tracking-wider uppercase text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                  validation.errors.barcode
                    ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* Barcode Validation Alerts */}
            {validation.errors.barcode && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{validation.errors.barcode}</span>
              </div>
            )}

            {!validation.errors.barcode && formData.barcode && (
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 pt-1">
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Barcode siap digunakan (belum terdaftar)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Format: {formData.barcode.length} karakter
                </span>
              </div>
            )}

            {/* Live Barcode Graphic Preview */}
            {formData.barcode && !validation.errors.barcode && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                <svg ref={barcodeSvgRef} className="max-w-full" />
                <span className="text-[10px] text-slate-400 mt-1">Preview Barcode Real-time (CODE128)</span>
              </div>
            )}
          </div>

          {/* SECTION 2: INFORMASI UTAMA ASET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Aset */}
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Aset / Barang <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoTitleCase}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Rapikan Huruf Kapital
                </button>
              </div>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  setTouched(prev => ({ ...prev, name: true }));
                }}
                placeholder="Contoh: Mesin Kasir POS Touchscreen / Kulkas Display"
                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                  touched.name && validation.errors.name
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                }`}
              />
              {touched.name && validation.errors.name && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validation.errors.name}
                </p>
              )}
            </div>

            {/* Nama Outlet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-indigo-500" />
                <span>Nama Outlet / Cabang</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.outlet || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, outlet: e.target.value }));
                  setTouched(prev => ({ ...prev, outlet: true }));
                }}
                placeholder="Contoh: Outlet Sudirman / Outlet Senayan City"
                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                  touched.outlet && validation.errors.outlet
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                }`}
              />
              {touched.outlet && validation.errors.outlet && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validation.errors.outlet}
                </p>
              )}
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kategori Aset <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as AssetCategory }))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Operasional */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Penggunaan <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AssetStatus }))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {STATUSES.map(stat => (
                  <option key={stat} value={stat}>
                    {stat}
                  </option>
                ))}
              </select>
            </div>

            {/* Lokasi Aset / Nama Tempat */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lokasi Aset / Nama Tempat <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Contoh: Dapur, Service, Bar</span>
              </div>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, location: e.target.value }));
                  setTouched(prev => ({ ...prev, location: true }));
                }}
                placeholder="Contoh: Dapur / Service / Bar / Gudang"
                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                  touched.location && validation.errors.location
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                }`}
              />
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK_LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, location: loc }));
                      setTouched(prev => ({ ...prev, location: true }));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors border ${
                      formData.location === loc
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
              {touched.location && validation.errors.location && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validation.errors.location}
                </p>
              )}
            </div>

            {/* Nomor Seri Pabrik */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Seri Pabrik (S/N - Opsional)
              </label>
              <input
                type="text"
                value={formData.serialNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="Contoh: SN-883902-X"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Catatan Tambahan */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan / Spesifikasi Aset
              </label>
              <textarea
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Tambahkan keterangan peruntukan aset atau spesifikasi khusus..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Validation Warnings */}
          {Object.keys(validation.warnings).length > 0 && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
              {Object.values(validation.warnings).map((warn, i) => (
                <p key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {warn}
                </p>
              ))}
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!validation.isValid}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Aset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
