export type AssetCategory = 
  | 'Elektronik & IT'
  | 'Peralatan Kantor'
  | 'Furnitur & Mebel'
  | 'Kendaraan Operasional'
  | 'Mesin & Alat Berat'
  | 'Perangkat Jaringan'
  | 'Alat Medis & Lab'
  | 'Lainnya';

export type AssetStatus = 'Aktif' | 'Dipinjam' | 'Dalam Perbaikan' | 'Diarsipkan / Afkir';

export interface Asset {
  id: string;
  barcode: string;           // Kode Aset / Barcode Tag (e.g. AST-2026-0001)
  name: string;              // Nama Aset
  outlet: string;            // Nama Outlet / Cabang (e.g. Outlet Grand Indonesia)
  location: string;          // Lokasi Aset / Nama Tempat (e.g. Dapur, Service, Bar, Gudang)
  category: AssetCategory;   // Kategori
  status: AssetStatus;       // Status operasional
  serialNumber?: string;     // Nomor Seri Pabrik (Opsional)
  notes?: string;            // Catatan (Opsional)
  createdAt: string;         // Timestamp registrasi (ISO)
  updatedAt: string;         // Timestamp update (ISO)
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export type BarcodeType = 'CODE128' | 'EAN13' | 'CODE39' | 'UPC' | 'QR';
