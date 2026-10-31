import * as XLSX from 'xlsx';
import { Asset } from '../types/asset';

export function exportAssetsToExcel(assets: Asset[], fileNamePrefix = 'Data_Inventaris_Aset') {
  if (assets.length === 0) {
    throw new Error('Tidak ada data aset untuk diekspor.');
  }

  // 1. Prepare main assets data rows
  const assetRows = assets.map((asset, index) => ({
    'No': index + 1,
    'Kode Aset': asset.barcode,
    'Nama Aset': asset.name,
    'Nama Outlet': asset.outlet,
    'Lokasi Aset': asset.location,
    'Kategori': asset.category,
    'Status': asset.status,
    'Nomor Seri': asset.serialNumber || '-',
    'Catatan': asset.notes || '-',
    'Waktu Pendataan': new Date(asset.createdAt).toLocaleString('id-ID'),
  }));

  // Create main worksheet
  const wsAssets = XLSX.utils.json_to_sheet(assetRows);

  // Auto-calculate column widths
  const colWidths = [
    { wch: 6 },   // No
    { wch: 24 },  // Kode Aset
    { wch: 38 },  // Nama Aset
    { wch: 26 },  // Nama Outlet
    { wch: 20 },  // Lokasi Aset (Dapur/Service)
    { wch: 22 },  // Kategori
    { wch: 18 },  // Status
    { wch: 20 },  // Nomor Seri
    { wch: 28 },  // Catatan
    { wch: 22 },  // Waktu
  ];
  wsAssets['!cols'] = colWidths;

  // 2. Prepare Summary Sheet
  const categoryMap = new Map<string, number>();
  assets.forEach(a => {
    categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
  });

  const outletMap = new Map<string, number>();
  assets.forEach(a => {
    outletMap.set(a.outlet, (outletMap.get(a.outlet) || 0) + 1);
  });

  const locationMap = new Map<string, number>();
  assets.forEach(a => {
    locationMap.set(a.location, (locationMap.get(a.location) || 0) + 1);
  });

  const summaryOverview = [
    { 'Metrik Inventaris': 'Total Jumlah Aset Terdaftar', 'Nilai / Keterangan': `${assets.length} Unit` },
    { 'Metrik Inventaris': 'Tanggal Ekspor', 'Nilai / Keterangan': new Date().toLocaleString('id-ID') },
    { 'Metrik Inventaris': '', 'Nilai / Keterangan': '' },
    { 'Metrik Inventaris': '--- RINGKASAN PER OUTLET ---', 'Nilai / Keterangan': '' },
  ];

  outletMap.forEach((count, out) => {
    summaryOverview.push({
      'Metrik Inventaris': `Outlet: ${out}`,
      'Nilai / Keterangan': `${count} unit (${Math.round((count / assets.length) * 100)}%)`,
    });
  });

  summaryOverview.push(
    { 'Metrik Inventaris': '', 'Nilai / Keterangan': '' },
    { 'Metrik Inventaris': '--- RINGKASAN PER LOKASI ASET (TEMPAT) ---', 'Nilai / Keterangan': '' }
  );

  locationMap.forEach((count, loc) => {
    summaryOverview.push({
      'Metrik Inventaris': `Lokasi: ${loc}`,
      'Nilai / Keterangan': `${count} unit (${Math.round((count / assets.length) * 100)}%)`,
    });
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryOverview);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 32 }];

  // 3. Create Workbook and append sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Daftar Aset');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan & Lokasi');

  // 4. Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
  const fullFileName = `${fileNamePrefix}_${dateStr}_${timeStr}.xlsx`;

  XLSX.writeFile(wb, fullFileName);
  return fullFileName;
}

// Export as simple CSV
export function exportAssetsToCSV(assets: Asset[], fileName = 'Data_Inventaris_Aset.csv') {
  if (assets.length === 0) return;
  const header = ['No', 'Kode Aset', 'Nama Aset', 'Nama Outlet', 'Lokasi Aset', 'Kategori', 'Status', 'Nomor Seri', 'Catatan'];
  const rows = assets.map((a, i) => [
    i + 1,
    `"${a.barcode}"`,
    `"${a.name.replace(/"/g, '""')}"`,
    `"${a.outlet.replace(/"/g, '""')}"`,
    `"${(a.location || '').replace(/"/g, '""')}"`,
    `"${a.category}"`,
    `"${a.status}"`,
    `"${(a.serialNumber || '').replace(/"/g, '""')}"`,
    `"${(a.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
