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
  name: string;              // Nama Aset 2 (Untuk Ekspor)
  outlet: string;            // Nama Outlet / Cabang (e.g. Outlet Grand Indonesia)
  location: string;          // Nama Aset 1 (Yang Dijadikan Barcode, sebelumnya Lokasi Aset)
  barcodeName?: string;      // Alias Nama Aset 1 (Nama Barcode)
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
