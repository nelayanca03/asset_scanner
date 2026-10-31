import React from 'react';
import { Camera, Sun, Moon, Barcode } from 'lucide-react';

interface NavbarProps {
  activeTab: 'inventory' | 'generator';
  setActiveTab: (tab: 'inventory' | 'generator') => void;
  onOpenScanner: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Barcode className="w-5 h-5" />
            </div>
            <a
              href="#inventory"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('inventory');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
            >
              AssetScan Pro
            </a>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'inventory'
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                  : ''
              }`}
            >
              Inventaris Aset
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'generator'
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                  : ''
              }`}
            >
              Generator Barcode
            </button>
            <button
              onClick={onOpenScanner}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Scanner Langsung
            </button>
          </nav>

          {/* Zone 3: 1 primary action + dark mode toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors"
              title="Ganti Tema Terang/Gelap"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenScanner}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Barcode</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
