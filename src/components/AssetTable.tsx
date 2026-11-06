import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Printer,
  Trash2,
  Eye,
  Edit2,
  FileSpreadsheet,
  FileText,
  Plus,
  CheckSquare,
  Square,
  Store,
} from 'lucide-react';
import { Asset } from '../types/asset';

interface AssetTableProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onExportExcel: (subset?: Asset[]) => void;
  onExportPDF: (subset?: Asset[]) => void;
  onExportCSV: (subset?: Asset[]) => void;
  onPrintLabels: (items: Array<{ code: string; label?: string; subtitle?: string }>) => void;
  onOpenNewAssetModal: () => void;
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  onSelectAsset,
  onEditAsset,
  onDeleteAsset,
  onBulkDelete,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  onPrintLabels,
  onOpenNewAssetModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'name' | 'barcode' | 'outlet' | 'location'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Distinct outlets for filter dropdown
  const uniqueOutlets = useMemo(() => {
    const list = Array.from(new Set(assets.map(a => a.outlet).filter(Boolean)));
    return list.sort();
  }, [assets]);

  // Distinct locations for filter dropdown (e.g. Dapur, Service)
  const uniqueLocations = useMemo(() => {
    const list = Array.from(new Set(assets.map(a => a.location).filter(Boolean)));
    return list.sort();
  }, [assets]);

  // Filter & Search Logic
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          item.barcode.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          (item.outlet && item.outlet.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // Outlet filter
      if (outletFilter !== 'all' && item.outlet !== outletFilter) {
        return false;
      }

      // Location filter (Lokasi Aset: Dapur, Service, dll.)
      if (locationFilter !== 'all' && item.location !== locationFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'createdAt') {
        comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === 'barcode') {
        comp = a.barcode.localeCompare(b.barcode);
      } else if (sortField === 'outlet') {
        comp = (a.outlet || '').localeCompare(b.outlet || '');
      } else if (sortField === 'location') {
        comp = (a.location || '').localeCompare(b.location || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [assets, searchQuery, outletFilter, locationFilter, categoryFilter, statusFilter, sortField, sortOrder]);

  // Bulk selection handling
  const allFilteredSelected =
    filteredAssets.length > 0 && filteredAssets.every(a => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredAssets.forEach(a => next.add(a.id));
      setSelectedIds(next);
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Selected items array
  const selectedAssetList = useMemo(() => {
    return assets.filter(a => selectedIds.has(a.id));
  }, [assets, selectedIds]);

  const handleBulkPrint = () => {
    if (selectedAssetList.length === 0) return;
    onExportPDF(selectedAssetList);
  };

  const handleBulkExportExcel = () => {
    onExportExcel(selectedAssetList.length > 0 ? selectedAssetList : undefined);
  };

  const handleBulkExportPDF = () => {
    onExportPDF(selectedAssetList.length > 0 ? selectedAssetList : undefined);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Yakin ingin menghapus ${selectedIds.size} aset yang dipilih?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode aset (AST-...), nama barang, nama outlet, departemen..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Outlet Filter */}
            {uniqueOutlets.length > 0 && (
              <select
                value={outletFilter}
                onChange={(e) => setOutletFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="all">Semua Outlet</option>
                {uniqueOutlets.map(out => (
                  <option key={out} value={out}>
                    {out}
                  </option>
                ))}
              </select>
            )}

            {/* Lokasi Aset Filter (Dapur, Service, dll) */}
            {uniqueLocations.length > 0 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="all">Semua Lokasi Aset</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>
                    Lokasi: {loc}
                  </option>
                ))}
              </select>
            )}

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">Semua Kategori</option>
              <option value="Elektronik & IT">Elektronik & IT</option>
              <option value="Peralatan Kantor">Peralatan Kantor</option>
              <option value="Furnitur & Mebel">Furnitur & Mebel</option>
              <option value="Kendaraan Operasional">Kendaraan Operasional</option>
              <option value="Mesin & Alat Berat">Mesin & Alat Berat</option>
              <option value="Perangkat Jaringan">Perangkat Jaringan</option>
              <option value="Alat Medis & Lab">Alat Medis & Lab</option>
              <option value="Lainnya">Lainnya</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Dipinjam">Dipinjam</option>
              <option value="Dalam Perbaikan">Dalam Perbaikan</option>
              <option value="Diarsipkan / Afkir">Diarsipkan / Afkir</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Strip (Visible when items selected) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
              <span className="font-semibold">{selectedIds.size}</span> aset terpilih
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkPrint}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                Cetak Stiker ({selectedIds.size})
              </button>
              <button
                onClick={handleBulkExportPDF}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Export PDF Terpilih
              </button>
              <button
                onClick={handleBulkExportExcel}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel Terpilih
              </button>
              <button
                onClick={handleBulkDeleteConfirm}
                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer Aset & Barcode Banner */}
      <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs flex items-start gap-2.5 shadow-xs">
        <span className="text-amber-600 dark:text-amber-400 font-bold text-sm mt-0.5">⚠️</span>
        <div className="text-amber-900 dark:text-amber-200 space-y-0.5">
          <span className="font-bold">Disclaimer Format Aset & Barcode:</span>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            Untuk sekarang nama aset yang dijadikan barcode. Kolom <strong>Lokasi</strong> telah diubah menjadi <strong>Nama Aset 1 (Nama Barcode)</strong>, lalu tersedia <strong>Nama Aset 2 (Untuk Ekspor)</strong> untuk cetak label & dokumen.
          </p>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => {
                    setSortField('barcode');
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Kode Aset (Barcode)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('name');
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Aset 2 (Ekspor) & Kategori</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('outlet');
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Outlet</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('location');
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <div>
                      <span>Nama Aset 1 (Barcode)</span>
                      <span className="block text-[9.5px] font-normal text-slate-400 dark:text-slate-500">
                        (Sebelumnya Lokasi)
                      </span>
                    </div>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Status</th>
                <th
                  onClick={() => {
                    setSortField('createdAt');
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Waktu Pendataan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Tidak ada aset yang sesuai
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || outletFilter !== 'all'
                            ? 'Coba ubah kata kunci pencarian atau reset filter outlet/kategori.'
                            : 'Belum ada data aset yang terdaftar. Mulai dengan memindai barcode di atas.'}
                        </p>
                      </div>
                      <button
                        onClick={onOpenNewAssetModal}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Aset Pertama
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => {
                  const isSelected = selectedIds.has(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectItem(asset.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Barcode Tag */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700 whitespace-nowrap inline-block">
                          {asset.barcode}
                        </span>
                      </td>

                      {/* Name & Category */}
                      <td className="py-3 px-3">
                        <div>
                          <div
                            onClick={() => onSelectAsset(asset)}
                            className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          >
                            {asset.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{asset.category}</span>
                            {asset.serialNumber && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono">SN: {asset.serialNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nama Outlet */}
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{asset.outlet}</span>
                        </span>
                      </td>

                      {/* Nama Aset 1 (Barcode) */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px] border border-indigo-200 dark:border-indigo-800">
                          {asset.barcodeName || asset.location || '-'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            asset.status === 'Aktif'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : asset.status === 'Dipinjam'
                              ? 'text-sky-600 dark:text-sky-400'
                              : asset.status === 'Dalam Perbaikan'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {asset.status}
                        </span>
                      </td>

                      {/* Waktu Registrasi */}
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(asset.createdAt).toLocaleDateString('id-ID')}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectAsset(asset)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                            title="Lihat Detail & Barcode"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditAsset(asset)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Ubah Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              onPrintLabels([
                                {
                                  code: asset.barcode,
                                  label: asset.name,
                                  subtitle: `${asset.outlet} · ${asset.category}`,
                                },
                              ])
                            }
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Cetak Stiker Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus aset "${asset.name}" (${asset.barcode})?`)) {
                                onDeleteAsset(asset.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Counts & Direct Export Links */}
        <div className="px-4 py-3 bg-slate-50/75 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredAssets.length}</strong> dari{' '}
            <strong>{assets.length}</strong> total aset
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onExportPDF()}
              className="text-rose-600 dark:text-rose-400 hover:underline transition-colors flex items-center gap-1 font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              Download Format PDF (Barcode + Outlet + Kode + Nama)
            </button>
            <button
              onClick={() => onExportExcel()}
              className="text-emerald-600 dark:text-emerald-400 hover:underline transition-colors flex items-center gap-1 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
