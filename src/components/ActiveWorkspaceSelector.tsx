import React, { useState } from 'react';
import { Store, MapPin, Plus, Check } from 'lucide-react';

interface ActiveWorkspaceSelectorProps {
  currentOutlet: string;
  onSelectOutlet: (outlet: string) => void;
  availableOutlets: string[];
  currentLocation: string;
  onSelectLocation: (location: string) => void;
  availableLocations: string[];
}

const PRESET_LOCATIONS = ['Dapur', 'Service', 'Bar', 'Kasir', 'Gudang', 'Dining Area'];

export const ActiveWorkspaceSelector: React.FC<ActiveWorkspaceSelectorProps> = ({
  currentOutlet,
  onSelectOutlet,
  availableOutlets,
  currentLocation,
  onSelectLocation,
  availableLocations,
}) => {
  const [isAddingOutlet, setIsAddingOutlet] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Combine default preset locations with any custom locations in database
  const allLocations = Array.from(
    new Set([...PRESET_LOCATIONS, ...availableLocations.filter(Boolean)])
  );

  const handleAddNewOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOutletName.trim()) {
      onSelectOutlet(newOutletName.trim());
      setNewOutletName('');
      setIsAddingOutlet(false);
    }
  };

  const handleAddNewLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocationName.trim()) {
      onSelectLocation(newLocationName.trim());
      setNewLocationName('');
      setIsAddingLocation(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Pemilihan Target Audit: Nama Outlet & Lokasi Aset
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih outlet dan tempat (contohnya: <strong>Dapur</strong> atau <strong>Service</strong>) agar barcode yang discan otomatis tercatat ke lokasi tersebut.
          </p>
        </div>

        <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Target Aktif: <strong>{currentOutlet}</strong> — <strong>{currentLocation}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. SELEKTOR NAMA OUTLET */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>1. Nama Outlet / Cabang</span>
            </label>
            {!isAddingOutlet && (
              <button
                type="button"
                onClick={() => setIsAddingOutlet(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                Tambah Outlet Baru
              </button>
            )}
          </div>

          {isAddingOutlet ? (
            <form onSubmit={handleAddNewOutlet} className="flex gap-2">
              <input
                type="text"
                value={newOutletName}
                onChange={(e) => setNewOutletName(e.target.value)}
                placeholder="Ketik nama outlet baru..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-indigo-400 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
              >
                Pilih
              </button>
              <button
                type="button"
                onClick={() => setIsAddingOutlet(false)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600"
              >
                Batal
              </button>
            </form>
          ) : (
            <select
              value={currentOutlet}
              onChange={(e) => onSelectOutlet(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {availableOutlets.map(out => (
                <option key={out} value={out}>
                  {out}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. SELEKTOR NAMA TEMPAT (LOKASI ASET: DAPUR, SERVICE, DLL.) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>2. Lokasi Aset / Nama Tempat</span>
            </label>
            {!isAddingLocation && (
              <button
                type="button"
                onClick={() => setIsAddingLocation(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                Tambah Tempat Baru
              </button>
            )}
          </div>

          {isAddingLocation ? (
            <form onSubmit={handleAddNewLocation} className="flex gap-2">
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Ketik lokasi tempat baru (misal: Bar / Gudang Cold)..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-indigo-400 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
              >
                Pilih
              </button>
              <button
                type="button"
                onClick={() => setIsAddingLocation(false)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600"
              >
                Batal
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {allLocations.map(loc => {
                const isSelected = currentLocation === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => onSelectLocation(loc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{loc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
