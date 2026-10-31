import * as XLSX from 'xlsx';
import { Asset, AssetCategory } from '../types/asset';
import { sanitizeBarcode, findDuplicateAsset } from './validation';

export interface ParsedImportRow {
  barcode: string;
  name: string;
  outlet: string;
  location: string; // Lokasi Aset (e.g. Dapur, Service)
  category: AssetCategory;
  serialNumber?: string;
  notes?: string;
  qty?: number;
  uom?: string;
  status: 'Aktif' | 'Dipinjam' | 'Dalam Perbaikan' | 'Diarsipkan / Afkir';
  isDuplicate: boolean;
  isValid: boolean;
  errorReason?: string;
}

// Infer category from asset name
export function inferCategoryFromName(name: string): AssetCategory {
  const upper = name.toUpperCase();
  if (
    upper.includes('MICROWAVE') ||
    upper.includes('TV') ||
    upper.includes('FINGER PRINT') ||
    upper.includes('POS') ||
    upper.includes('KOMPUTER') ||
    upper.includes('LAPTOP') ||
    upper.includes('PRINTER') ||
    upper.includes('EDC') ||
    upper.includes('ROUTER')
  ) {
    return 'Elektronik & IT';
  }
  if (
    upper.includes('SHOWCASE') ||
    upper.includes('FREEZER') ||
    upper.includes('CHILLER') ||
    upper.includes('STEAMER') ||
    upper.includes('PENGGORENGAN') ||
    upper.includes('KOMPOR') ||
    upper.includes('MESIN') ||
    upper.includes('OVEN')
  ) {
    return 'Mesin & Alat Berat';
  }
  if (
    upper.includes('LEMARI') ||
    upper.includes('MEJA') ||
    upper.includes('KURSI') ||
    upper.includes('RAK') ||
    upper.includes('DRAWER')
  ) {
    return 'Furnitur & Mebel';
  }
  if (
    upper.includes('KUNCI') ||
    upper.includes('TABUNG') ||
    upper.includes('APAR') ||
    upper.includes('TETAP') ||
    upper.includes('TROLLY') ||
    upper.includes('GEASTRAP')
  ) {
    return 'Peralatan Kantor';
  }
  return 'Peralatan Kantor';
}

// Split multiple asset IDs that might be concatenated
export function extractAssetIds(rawIdString: string): string[] {
  if (!rawIdString) return [];
  const trimmed = rawIdString.trim();

  // 1. Check if string has explicit delimiters
  if (/[,;\s\n|]/.test(trimmed)) {
    const split = trimmed.split(/[,;\s\n|]+/).map(s => s.trim()).filter(Boolean);
    if (split.length > 1) return split;
  }

  // 2. Check for standard patterned concatenation like FFE-YYYY-MM-DD-XXXX or prefix-YYYY-XXXX
  const regexPattern = /[A-Z0-9]+-\d{4}-\d{2}-\d{2}-\d{4}|[A-Z0-9]+-\d{4}-\d{4}|[A-Z0-9]+-\d{3,}/gi;
  const matches = trimmed.match(regexPattern);
  if (matches && matches.length > 1) {
    return matches;
  }

  return [trimmed];
}

// Parse uploaded Excel or CSV file
export async function parseExcelOrCsvFile(
  file: File,
  existingAssets: Asset[],
  defaultOutlet = 'Outlet Grand Indonesia'
): Promise<ParsedImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
  });

  const parsedItems: ParsedImportRow[] = [];
  const processedBarcodesInThisBatch = new Set<string>();

  for (const row of rawRows) {
    const keys = Object.keys(row);
    const findVal = (possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const foundKey = keys.find(k => k.trim().toUpperCase() === name.toUpperCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    const rawName = findVal(['NAMA', 'NAMA ASET', 'NAMA BARANG', 'NAME', 'ITEM', 'DESKRIPSI']);
    const rawAssetId = findVal(['ASSET ID', 'KODE ASET', 'BARCODE', 'ASSET_ID', 'TAG', 'KODE', 'ID']);
    const rawLokasi = findVal(['LOKASI', 'LOKASI ASET', 'TEMPAT', 'NAMA TEMPAT', 'RUANGAN']);
    const rawOutlet = findVal(['OUTLET', 'NAMA OUTLET', 'CABANG', 'STORE']);
    const rawQty = findVal(['QTY', 'JUMLAH', 'QUANTITY']);
    const rawUom = findVal(['UOM', 'SATUAN', 'UNIT']);
    const rawKategori = findVal(['KATEGORI', 'CATEGORY']);
    const rawStatus = findVal(['STATUS', 'KONDISI']);
    const rawSerial = findVal(['SERIAL', 'SERIAL NUMBER', 'SN', 'NO SERI']);

    if (!rawName && !rawAssetId) {
      continue;
    }

    let assetStatus: 'Aktif' | 'Dipinjam' | 'Dalam Perbaikan' | 'Diarsipkan / Afkir' = 'Aktif';
    if (rawQty.includes('-> 0') || rawQty === '0' || rawStatus.toUpperCase().includes('AFKIR') || rawStatus.toUpperCase().includes('RUSAK')) {
      assetStatus = 'Diarsipkan / Afkir';
    } else if (rawStatus.toUpperCase().includes('PINJAM')) {
      assetStatus = 'Dipinjam';
    } else if (rawStatus.toUpperCase().includes('PERBAIKAN')) {
      assetStatus = 'Dalam Perbaikan';
    }

    const individualIds = extractAssetIds(rawAssetId);
    const outletName = rawOutlet || defaultOutlet;
    const locationName = rawLokasi || 'Dapur';
    const inferredCategory = rawKategori ? (rawKategori as AssetCategory) : inferCategoryFromName(rawName);

    if (individualIds.length === 0 || (individualIds.length === 1 && !individualIds[0])) {
      parsedItems.push({
        barcode: '',
        name: rawName || 'Tanpa Nama',
        outlet: outletName,
        location: locationName,
        category: inferredCategory,
        serialNumber: rawSerial,
        notes: rawUom ? `UOM: ${rawUom}` : undefined,
        status: assetStatus,
        isDuplicate: false,
        isValid: false,
        errorReason: 'Kode Aset (Barcode) kosong',
      });
      continue;
    }

    for (const singleId of individualIds) {
      const cleanBarcode = sanitizeBarcode(singleId);
      const isAlreadyInDb = !!findDuplicateAsset(cleanBarcode, existingAssets);
      const isAlreadyInBatch = processedBarcodesInThisBatch.has(cleanBarcode);
      const isDuplicate = isAlreadyInDb || isAlreadyInBatch;

      let isValid = true;
      let errorReason: string | undefined = undefined;

      if (!cleanBarcode) {
        isValid = false;
        errorReason = 'Kode barcode tidak valid';
      } else if (!rawName) {
        isValid = false;
        errorReason = 'Nama aset kosong';
      } else if (isDuplicate) {
        isValid = false;
        errorReason = isAlreadyInDb ? 'Barcode sudah ada di sistem' : 'Barcode duplikat dalam file impor';
      }

      parsedItems.push({
        barcode: cleanBarcode,
        name: rawName,
        outlet: outletName,
        location: locationName,
        category: inferredCategory,
        serialNumber: rawSerial,
        notes: rawUom ? `Satuan: ${rawUom}${rawQty ? `, Qty: ${rawQty}` : ''}` : undefined,
        status: assetStatus,
        isDuplicate,
        isValid,
        errorReason,
      });

      if (cleanBarcode) {
        processedBarcodesInThisBatch.add(cleanBarcode);
      }
    }
  }

  return parsedItems;
}

// Sample dataset based on the user's Excel attachment image
export const USER_ATTACHMENT_SAMPLE_ROWS = [
  { NAMA: 'LEMARI S/S 4 LACI 2 PINTU 190*42*75', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2024-06-03-0001' },
  { NAMA: 'BRACKET TV', QTY: '1', UOM: 'UNIT', LOKASI: 'SERVICE', 'ASSET ID': 'FFE-2022-12-30-0001' },
  { NAMA: 'SHOWCASE DINGIN GMP-RTW-60L (87*62*57)', QTY: '1', UOM: 'UNIT', LOKASI: 'SERVICE', 'ASSET ID': 'FFE-2022-12-21-0003' },
  { NAMA: 'SHOWCASE HOT (90*44*62)', QTY: '1', UOM: 'UNIT', LOKASI: 'SERVICE', 'ASSET ID': 'FFE-2022-12-18-0001' },
  { NAMA: 'STEAMER DIMSUM 8 LUBANG', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-10-01-0004' },
  { NAMA: 'LEMARI 2 TKT 1 PINTU + 2 LACI (107*62*120)', QTY: '1 -> 0', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2024-11-30-0003' },
  { NAMA: 'MICROWAVE PANASONIC M-ST324M', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2022-12-19-0002' },
  { NAMA: 'RAK SS 260*36*24', QTY: '2', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-10-01-0006FFE-2023-10-01-0007' },
  { NAMA: 'RAK SS 70*36*24', QTY: '2', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-10-01-0008FFE-2023-10-01-0009' },
  { NAMA: 'MEJA SS 2 TKT (128*44*80)', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2022-12-21-0002' },
  { NAMA: 'PENGGORENGAN ELEKTRIK GETRA', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2022-12-13-0001' },
  { NAMA: 'KOTAK FINGER PRINT (20*20*10)', QTY: '1', UOM: 'UNIT', LOKASI: 'SERVICE', 'ASSET ID': 'FFE-2023-10-01-0010' },
  { NAMA: 'FREEZER 2 PINTU (170*64*80)', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2017-04-30-0009' },
  { NAMA: 'MEJA SS 3 TKT (110*70*86)', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-10-01-0011' },
  { NAMA: 'LEMARI GANTUNG SS 2 PINTU (150*70*48)', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-01-04-0003' },
  { NAMA: 'KOMPOR HIGH PRESS 2 JALUR', QTY: '4', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-10-01-0012FFE-2023-10-01-0013FFE-2023-10-01-0014FFE-2023-10-01-0015' },
  { NAMA: 'KUNCI MONYET 12"', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2025-07-01-0001' },
  { NAMA: 'GEASTRAP', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2023-10-01-0016' },
  { NAMA: 'TABUNG RACUN API 6 KG', QTY: '2', UOM: 'UNIT', LOKASI: 'SERVICE', 'ASSET ID': 'FFE-2022-12-03-0001FFE-2023-10-01-0017' },
  { NAMA: 'TEMPAT KOMPOR (45*45*15)', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2025-10-01-0007' },
  { NAMA: 'TROLLY GAS', QTY: '1', UOM: 'UNIT', LOKASI: 'DAPUR', 'ASSET ID': 'FFE-2025-10-01-0006' },
];

// Download sample Excel template
export function downloadImportExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet(USER_ATTACHMENT_SAMPLE_ROWS);
  ws['!cols'] = [
    { wch: 42 }, // NAMA
    { wch: 10 }, // QTY
    { wch: 8 },  // UOM
    { wch: 18 }, // LOKASI
    { wch: 48 }, // ASSET ID
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Aset');
  XLSX.writeFile(wb, 'Template_Import_Data_Aset.xlsx');
}
