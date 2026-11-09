import { Asset, ValidationResult } from '../types/asset';

// Format number to Indonesian Rupiah currency format
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Parse string with dots/currency to raw integer number
export function parseRupiahInput(input: string): number {
  const clean = input.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

// Convert string to Title Case
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Clean and sanitize barcode value (uppercase, trimmed, no invalid control chars)
export function sanitizeBarcode(code: string): string {
  return code.trim().toUpperCase().replace(/[\r\n\t]/g, '');
}

// Check if barcode is already taken or matches scanned "KODE ASET, NAMA ASET"
export function findDuplicateAsset(
  barcode: string,
  existingAssets: Asset[],
  excludeAssetId?: string
): Asset | undefined {
  const cleanCode = sanitizeBarcode(barcode);
  if (!cleanCode) return undefined;

  // 1. Direct exact match on barcode or combined "barcode, name"
  const directMatch = existingAssets.find(a => {
    if (a.id === excludeAssetId) return false;
    const aBarcode = sanitizeBarcode(a.barcode);
    if (aBarcode === cleanCode) return true;
    const aCombined = sanitizeBarcode(`${a.barcode}, ${a.name}`);
    return aCombined === cleanCode;
  });
  if (directMatch) return directMatch;

  // 2. If cleanCode contains comma "KODE ASET, NAMA ASET", match the KODE ASET part
  if (cleanCode.includes(',')) {
    const codePart = cleanCode.split(',')[0].trim();
    if (codePart) {
      const partMatch = existingAssets.find(
        a => sanitizeBarcode(a.barcode) === codePart && a.id !== excludeAssetId
      );
      if (partMatch) return partMatch;
    }
  }

  // 3. If an existing asset barcode has comma, check its code part against cleanCode
  return existingAssets.find(a => {
    if (a.id === excludeAssetId) return false;
    const aClean = sanitizeBarcode(a.barcode);
    if (aClean.includes(',')) {
      const aCodePart = aClean.split(',')[0].trim();
      return aCodePart === cleanCode;
    }
    return false;
  });
}

// Comprehensive real-time validation
export function validateAssetInput(
  data: Partial<Asset>,
  existingAssets: Asset[],
  excludeAssetId?: string
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // 1. Barcode validation
  if (!data.barcode || data.barcode.trim().length === 0) {
    errors.barcode = 'Kode Barcode wajib diisi atau discan';
  } else {
    const cleanCode = sanitizeBarcode(data.barcode);
    if (cleanCode.length < 3) {
      errors.barcode = 'Kode Barcode minimal 3 karakter';
    } else if (cleanCode.length > 50) {
      errors.barcode = 'Kode Barcode maksimal 50 karakter';
    } else if (!/^[A-Za-z0-9\-_./:]+$/.test(cleanCode)) {
      warnings.barcode = 'Kode barcode sebaiknya hanya huruf, angka, tanda minus (-), garis bawah (_), atau titik';
    }

    // DUPLICATE CHECK (Strictly enforced)
    const duplicate = findDuplicateAsset(cleanCode, existingAssets, excludeAssetId);
    if (duplicate) {
      errors.barcode = `DUPLIKAT! Barcode ini sudah terdaftar pada aset "${duplicate.name}" (${duplicate.outlet || '-'} - ${duplicate.location || '-'})`;
    }
  }

  // 2. Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Nama aset wajib diisi';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Nama aset terlalu pendek (minimal 3 karakter)';
  } else if (data.name.trim().length > 120) {
    errors.name = 'Nama aset terlalu panjang (maksimal 120 karakter)';
  }

  // 3. Category validation
  if (!data.category) {
    errors.category = 'Pilih kategori aset';
  }

  // 4. Outlet validation
  if (!data.outlet || data.outlet.trim().length === 0) {
    errors.outlet = 'Nama outlet / cabang penempatan aset wajib diisi';
  }

  // 5. Lokasi Aset (Tempat) validation
  if (!data.location || data.location.trim().length === 0) {
    errors.location = 'Lokasi aset / nama tempat wajib diisi (contoh: Dapur, Service)';
  }

  // 6. Status
  if (!data.status) {
    errors.status = 'Pilih status operasional aset';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

// Generate sequential next asset tag (e.g., AST-2026-0001)
export function generateNextBarcode(existingAssets: Asset[], prefix = 'AST'): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${prefix}-${currentYear}-`;
  
  const matchingNumbers = existingAssets
    .map(a => {
      const upper = a.barcode.toUpperCase();
      if (upper.startsWith(yearPrefix)) {
        const numPart = upper.substring(yearPrefix.length);
        const parsed = parseInt(numPart, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    })
    .filter(n => n > 0);

  const highest = matchingNumbers.length > 0 ? Math.max(...matchingNumbers) : 0;
  const nextNum = highest + 1;
  return `${yearPrefix}${String(nextNum).padStart(4, '0')}`;
}
