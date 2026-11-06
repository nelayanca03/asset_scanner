import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Asset } from '../types/asset';
import { sanitizeBarcode } from './validation';

export interface ExportPdfOptions {
  fileNamePrefix?: string;
  barcodeType?: 'CODE128' | 'QR';
  layoutMode?: 'minimal_qr' | 'cards' | 'table';
  barcodeSize?: 'small' | 'standard' | 'jumbo';
  columns?: 1 | 2 | 3;
  orientation?: 'portrait' | 'landscape';
  borderStyle?: 'solid' | 'dashed' | 'none';
  showOutlet?: boolean;
  customOutletName?: string;
  showLocation?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  documentTitle?: string;
  showDocumentHeader?: boolean;
  leftMargin?: number; // Gap kosong sebelah kiri (dalam mm), default 30mm (3 cm)
  rowDensity?: 'super_compact' | 'compact' | 'standard'; // default: super_compact
}

/**
 * Draws a crisp, standards-compliant Code128 vector barcode directly into the PDF.
 * Uses exact binary module patterns with quiet zones so every scanner can read it reliably.
 */
function drawVectorBarcode(
  doc: jsPDF,
  code: string,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  isJumbo: boolean = true
): void {
  const clean = sanitizeBarcode(code);
  if (!clean) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Tanpa Barcode', cellX + cellWidth / 2, cellY + cellHeight / 2, { align: 'center' });
    return;
  }

  try {
    const Code128Class = (JsBarcode as any).getModule
      ? (JsBarcode as any).getModule('CODE128')
      : null;

    if (Code128Class) {
      const encoder = new Code128Class(clean, {});
      if (encoder.valid()) {
        const encoded = encoder.encode();
        const binaryData: string = encoded.data;

        if (binaryData && binaryData.length > 0) {
          const quietZone = isJumbo ? 12 : 10;
          const totalModules = binaryData.length + quietZone * 2;

          const cellMargin = isJumbo ? 4 : 3;
          const availableWidth = cellWidth - cellMargin * 2;
          
          const maxModule = isJumbo ? 0.38 : 0.26;
          const moduleWidth = Math.min(maxModule, availableWidth / totalModules);
          const barcodeWidth = totalModules * moduleWidth;

          const textHeight = isJumbo ? 4.2 : 3.5;
          const verticalPadding = isJumbo ? 4 : 3;
          const barHeight = Math.max(isJumbo ? 16 : 9, cellHeight - textHeight - verticalPadding);

          const startX = cellX + (cellWidth - barcodeWidth) / 2 + quietZone * moduleWidth;
          const startY = cellY + 2;

          doc.setFillColor(255, 255, 255);
          doc.rect(cellX + 0.5, cellY + 0.5, cellWidth - 1, cellHeight - 1, 'F');

          doc.setFillColor(0, 0, 0);
          let i = 0;
          while (i < binaryData.length) {
            if (binaryData[i] === '1') {
              let runLength = 1;
              while (i + runLength < binaryData.length && binaryData[i + runLength] === '1') {
                runLength++;
              }
              doc.rect(startX + i * moduleWidth, startY, runLength * moduleWidth, barHeight, 'F');
              i += runLength;
            } else {
              i++;
            }
          }

          doc.setFont('courier', 'bold');
          doc.setFontSize(isJumbo ? 8.5 : 7.5);
          doc.setTextColor(15, 23, 42);
          const textY = startY + barHeight + (isJumbo ? 3.8 : 3.2);
          doc.text(clean, cellX + cellWidth / 2, textY, { align: 'center' });
          return;
        }
      }
    }
  } catch (err) {
    console.warn('Vector barcode draw exception, falling back to canvas:', err);
  }

  // Fallback: High-resolution Canvas rendering
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, clean, {
      format: 'CODE128',
      width: isJumbo ? 4 : 3,
      height: isJumbo ? 90 : 70,
      displayValue: true,
      fontSize: isJumbo ? 15 : 13,
      font: 'monospace',
      margin: isJumbo ? 16 : 12,
      background: '#ffffff',
      lineColor: '#000000',
    });

    const imgData = canvas.toDataURL('image/png');
    const aspect = canvas.width / canvas.height;

    let drawW = cellWidth - 4;
    let drawH = drawW / aspect;
    if (drawH > cellHeight - 2.5) {
      drawH = cellHeight - 2.5;
      drawW = drawH * aspect;
    }

    const x = cellX + (cellWidth - drawW) / 2;
    const y = cellY + (cellHeight - drawH) / 2;
    doc.addImage(imgData, 'PNG', x, y, drawW, drawH);
  } catch (err) {
    console.error('Canvas barcode fallback failed for:', clean, err);
  }
}

/**
 * Pre-renders QR codes into base64 Data URLs for fast and crisp placement into jsPDF.
 */
async function generateQrDataUrlMap(assets: Asset[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    assets.map(async (asset) => {
      const clean = sanitizeBarcode(asset.barcode);
      if (!clean) return;
      try {
        const url = await QRCode.toDataURL(clean, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 320,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        map.set(asset.id || asset.barcode, url);
      } catch (e) {
        console.warn('Failed to generate QR data URL for:', clean, e);
      }
    })
  );
  return map;
}

/**
 * Layout: MINIMALIST 2D QR (User Request)
 * Clean, modern layout:
 * - Left side: 2D QR Code
 * - Right side:
 *     1. Kode Aset (bold monospace)
 *     2. Nama Aset (bold clean text)
 *     3. Nama Outlet (clean outlet text)
 * - Minimalist borders, generous whitespace, high readability.
 */
async function generateMinimalistQrPdf(
  assets: Asset[],
  options: ExportPdfOptions
): Promise<jsPDF> {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cols = options.columns || 2;
  // Gap kosong sebelah kiri 3 cm (30 mm) sesuai permintaan user untuk jilid/staples
  const leftMargin = options.leftMargin !== undefined ? options.leftMargin : 30;
  const rightMargin = 8;
  const marginY = 10;
  const colGap = cols === 1 ? 0 : 3.5;
  const rowGap = 2.2;

  const qrMap = await generateQrDataUrlMap(assets);

  // Card dimensions based on columns and orientation with 3 cm left gap
  const printableWidth = pageWidth - leftMargin - rightMargin - (cols - 1) * colGap;
  const cardWidth = printableWidth / cols;
  
  // Dibuat dipersempit dan rapat tanpa sisa ruang kosong (compact row height)
  // Memuat 24 - 36+ item per lembar A4
  const isSuperCompact = options.rowDensity !== 'standard';
  let cardHeight = cols === 1 ? 16 : isSuperCompact ? 19 : 24;
  let qrSize = cols === 1 ? 14 : isSuperCompact ? 15.5 : 19;

  if (options.barcodeSize === 'small') {
    qrSize = 13.5;
    cardHeight = Math.max(16, cardHeight - 2.5);
  } else if (options.barcodeSize === 'jumbo') {
    qrSize = 17;
    cardHeight = cardHeight + 2;
  }

  let currentY = marginY;

  // Header (Optional, user configurable) - respects 3 cm left margin
  if (options.showDocumentHeader !== false) {
    const title = options.documentTitle || 'LABEL ASET QR CODE';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, leftMargin, currentY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    doc.text(
      `Total: ${assets.length} Aset · Dicetak: ${dateStr} (Gap Kiri: 3 cm)`,
      pageWidth - rightMargin,
      currentY + 3.5,
      { align: 'right' }
    );

    // Subtle divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, currentY + 6, pageWidth - rightMargin, currentY + 6);

    currentY += 9;
  }

  let colIndex = 0;

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];

    // Check if new row exceeds page bottom
    if (currentY + cardHeight > pageHeight - marginY) {
      doc.addPage();
      currentY = marginY;
      colIndex = 0;
    }

    const cardX = leftMargin + colIndex * (cardWidth + colGap);
    const cardY = currentY;

    // 1. Draw Card Border / Guideline
    if (options.borderStyle === 'solid') {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.2, 1.2, 'S');
    } else if (options.borderStyle === 'dashed') {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([1.2, 1.2], 0);
      doc.rect(cardX, cardY, cardWidth, cardHeight, 'S');
      doc.setLineDashPattern([], 0);
    }

    // 2. Draw 2D QR Code on the LEFT
    const qrUrl = qrMap.get(asset.id || asset.barcode);
    const qrPadding = 1.5;
    const qrX = cardX + qrPadding;
    const qrY = cardY + (cardHeight - qrSize) / 2;

    if (qrUrl) {
      doc.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(qrX, qrY, qrSize, qrSize, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text('QR', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
    }

    // 3. Draw Details on the RIGHT side of QR Code
    // Disusun dalam row kompak yang sama agar dipersempit dan memuat banyak item per lembar
    const textStartX = qrX + qrSize + 2.5;
    const availableTextWidth = cardWidth - (qrSize + qrPadding * 2 + 4);
    const effectiveOutlet = options.customOutletName?.trim() || asset.outlet?.trim() || '';

    if (cols === 1) {
      // 1 Kolom: 1 Baris Horizontal Penuh (Semua sejajar dalam 1 row!)
      const midY = cardY + cardHeight / 2 + 1;
      
      // KODE ASET - STRICT 1 BARIS (JANGAN DIWRAP)
      const cleanBarcode = asset.barcode || '-';
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanBarcode, textStartX, midY);

      // NAMA ASET (tengah) - Wrap / Fleksibel
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const nameX = textStartX + 42;
      const cleanName = doc.splitTextToSize(asset.name || 'Aset', Math.max(20, availableTextWidth - 80));
      doc.text(cleanName[0] || '', nameX, midY);

      // Outlet (kanan) - User: Boleh wraptext!
      if (options.showOutlet !== false && effectiveOutlet) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const outletLines = doc.splitTextToSize(`Outlet: ${effectiveOutlet}`, 45);
        const outletY = outletLines.length > 1 ? midY - 1.8 : midY;
        doc.text(outletLines, cardX + cardWidth - 2.5, outletY, { align: 'right' });
      }
    } else {
      // 2 atau 3 Kolom: Row 1 Kode Aset & Outlet Sejajar (Same Row), Row 2 Nama Aset
      const row1Y = cardY + 5.2;
      
      // Row 1 - Kiri: KODE ASET - STRICT 1 BARIS (JANGAN PERNAH DI-WRAPTEXT!)
      const cleanBarcode = asset.barcode || '-';
      doc.setFont('courier', 'bold');
      let barcodeFontSize = cols === 3 ? 7.2 : 8.5;
      doc.setFontSize(barcodeFontSize);

      let barcodeWidth = doc.getTextWidth(cleanBarcode);
      const hasOutlet = options.showOutlet !== false && Boolean(effectiveOutlet);
      const maxBarcodeWidth = hasOutlet ? availableTextWidth * 0.65 : availableTextWidth;

      // Auto-scale jika kode barcode sangat panjang agar TETAP 1 BARIS UTUH tanpa wrap
      while (barcodeWidth > maxBarcodeWidth && barcodeFontSize > 5.2) {
        barcodeFontSize -= 0.3;
        doc.setFontSize(barcodeFontSize);
        barcodeWidth = doc.getTextWidth(cleanBarcode);
      }

      doc.setTextColor(15, 23, 42);
      // Dicetak langsung sebagai satu baris tunggal (tanpa pemecahan baris)
      doc.text(cleanBarcode, textStartX, row1Y);

      // Row 1 - Kanan: NAMA OUTLET (User request: Boleh wraptext!)
      if (hasOutlet) {
        doc.setFont('helvetica', 'normal');
        let outletFontSize = cols === 3 ? 6.2 : 7.2;
        doc.setFontSize(outletFontSize);
        doc.setTextColor(71, 85, 105);
        const outletText = `Outlet: ${effectiveOutlet}`;
        const maxOutletWidth = Math.max(14, availableTextWidth - barcodeWidth - 1.5);
        // Boleh wraptext multi-baris jika nama outlet panjang
        const outletLines: string[] = doc.splitTextToSize(outletText, maxOutletWidth);
        const displayOutletLines = outletLines.slice(0, 2);
        doc.text(displayOutletLines, cardX + cardWidth - 2, row1Y, { align: 'right' });
      }

      // Row 2: NAMA ASET (HANYA NAMA ASET YANG BOLEH DI-WRAP TEXT!)
      const row2Y = cardY + 9.8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(cols === 3 ? 7.2 : 8.2);
      doc.setTextColor(30, 41, 59);
      // Nama Aset di-wrap rapi menjadi maksimal 2 baris
      const nameLines: string[] = doc.splitTextToSize(asset.name || 'Aset', availableTextWidth);
      const displayLines = nameLines.slice(0, 2);
      doc.text(displayLines, textStartX, row2Y);

      // Lokasi Aset inline badge jika diaktifkan
      if (options.showLocation && asset.location) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(180, 83, 9);
        doc.text(`[${asset.location}]`, textStartX, cardY + cardHeight - 1.5);
      }
    }

    // Advance column / row
    colIndex++;
    if (colIndex >= cols) {
      colIndex = 0;
      currentY += cardHeight + rowGap;
    }
  }

  // Footer page number
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} dari ${totalPages} — Label Aset Minimalis 2D QR`,
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generates an A4 Printable Asset Tag Stickers (8 cards per page).
 */
async function generateAssetCardsPdf(
  assets: Asset[],
  options: ExportPdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cols = options.columns || 2;
  const rows = 4;
  const marginX = 10;
  const marginY = 12;
  const colGap = 6;
  const rowGap = 5;

  const cardWidth = (pageWidth - marginX * 2 - colGap * (cols - 1)) / cols;
  const cardHeight = (pageHeight - marginY * 2 - rowGap * (rows - 1)) / rows;
  const cardsPerPage = cols * rows;

  const qrMap = options.barcodeType === 'QR' ? await generateQrDataUrlMap(assets) : null;

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];
    const cardInPageIndex = idx % cardsPerPage;

    if (idx > 0 && cardInPageIndex === 0) {
      doc.addPage();
    }

    const col = cardInPageIndex % cols;
    const row = Math.floor(cardInPageIndex / cols);

    const x = marginX + col * (cardWidth + colGap);
    const y = marginY + row * (cardHeight + rowGap);

    // 1. Outer Card Box
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    // 2. Header Banner: Outlet Badge & Lokasi Aset
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + 1, y + 1, cardWidth - 2, 10, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202);
    const outletText = options.customOutletName?.trim() || asset.outlet?.trim() || '';
    if (outletText) {
      doc.text(outletText.toUpperCase(), x + 3.5, y + 7.5);
    }

    const locationText = asset.location || 'UMUM';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`LOKASI: ${locationText.toUpperCase()}`, x + cardWidth - 3.5, y + 7.5, { align: 'right' });

    // 3. Asset Name (WRAP TEXT)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const maxNameWidth = cardWidth - 7;
    const nameLines: string[] = doc.splitTextToSize(asset.name || 'Aset', maxNameWidth);
    doc.text(nameLines.slice(0, 2), x + 3.5, y + 15.5);

    // 4. Barcode or QR Code
    if (options.barcodeType === 'QR') {
      const qrBoxSize = 34;
      const qrX = x + cardWidth - qrBoxSize - 4;
      const qrY = y + 23;
      const qrUrl = qrMap?.get(asset.id || asset.barcode);
      if (qrUrl) {
        doc.addImage(qrUrl, 'PNG', qrX, qrY, qrBoxSize, qrBoxSize);
      }

      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(asset.barcode, x + 3.5, y + 27);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Kategori: ${asset.category || '-'}`, x + 3.5, y + 33);
      doc.text(`Status: ${asset.status || 'Aktif'}`, x + 3.5, y + 38);
    } else {
      const barcodeBoxX = x + 2.5;
      const barcodeBoxY = y + 23;
      const barcodeBoxW = cardWidth - 5;
      const barcodeBoxH = 34;
      drawVectorBarcode(doc, asset.barcode, barcodeBoxX, barcodeBoxY, barcodeBoxW, barcodeBoxH, true);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${asset.category || 'Aset'} · Status: ${asset.status || 'Aktif'}`,
        x + cardWidth / 2,
        y + cardHeight - 2.5,
        { align: 'center' }
      );
    }
  }

  return doc;
}

/**
 * Main export function for PDF.
 * Supports Minimalist QR (User requested), Cards Layout, and Table Layout.
 */
export async function exportAssetsToPDF(
  assets: Asset[],
  options: ExportPdfOptions = {}
): Promise<string> {
  if (assets.length === 0) {
    throw new Error('Tidak ada data aset untuk diekspor.');
  }

  const {
    fileNamePrefix = 'Laporan_Inventaris_Aset',
    barcodeSize = 'standard',
    barcodeType = 'QR',
    layoutMode = 'minimal_qr',
  } = options;

  const isJumbo = barcodeSize === 'jumbo';
  let doc: jsPDF;

  if (layoutMode === 'minimal_qr') {
    doc = await generateMinimalistQrPdf(assets, { ...options, barcodeSize, barcodeType, layoutMode });
  } else if (layoutMode === 'cards') {
    doc = await generateAssetCardsPdf(assets, { ...options, barcodeSize, barcodeType, layoutMode });
  } else {
    // Standard / Jumbo Table in A4 Landscape (297mm x 210mm)
    doc = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(options.documentTitle || 'LAPORAN DATA INVENTARIS ASET OUTLET', 10, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const modeBadge = barcodeSize === 'jumbo' ? 'Barcode Jumbo' : 'Standar';
    const typeBadge = barcodeType === 'QR' ? '2D QR Code' : '1D Code 128';
    doc.text(
      `Format: ${modeBadge} · Tipe: ${typeBadge} | Dicetak: ${currentDate} | Total: ${assets.length} Aset Terdaftar`,
      10,
      20.5
    );

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(10, 23, pageWidth - 10, 23);

    const tableRows = assets.map((asset, index) => [
      index + 1,
      '',
      options.customOutletName?.trim() || asset.outlet || '-',
      asset.barcodeName || asset.location || '-',
      asset.barcode,
      asset.name,
      asset.status,
      asset.barcode,
    ]);

    const barcodeColWidth = barcodeType === 'QR' ? (isJumbo ? 40 : 32) : (isJumbo ? 84 : 56);
    const rowMinHeight = barcodeType === 'QR' ? (isJumbo ? 32 : 24) : (isJumbo ? 28 : 18);

    autoTable(doc, {
      startY: 26,
      head: [['No', barcodeType === 'QR' ? 'QR Code Tag' : 'Barcode Tag', 'Nama Outlet', 'Nama Aset 1 (Barcode)', 'Kode Aset', 'Nama Aset 2 (Ekspor)', 'Status']],
      body: tableRows,
      theme: 'grid',
      margin: { left: 10, right: 10, bottom: 12 },
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        valign: 'middle',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: barcodeColWidth, minCellHeight: rowMinHeight, halign: 'center' },
        2: { cellWidth: 38, fontStyle: 'bold' },
        3: { cellWidth: 26, fontStyle: 'bold' },
        4: { cellWidth: 38, font: 'courier', fontStyle: 'bold', overflow: 'ellipsize' },
        6: { cellWidth: 20, halign: 'center' },
      },
      didDrawCell: (data) => {
        if (data.column.index === 1 && data.section === 'body') {
          const rawRow = data.row.raw as any[];
          const assetCode = String(rawRow[7] || rawRow[4] || '');
          if (barcodeType === 'QR') {
            try {
              const canvas = document.createElement('canvas');
              QRCode.toCanvas(canvas, assetCode, {
                width: 180,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
              }, (err) => {
                if (!err) {
                  const imgData = canvas.toDataURL('image/png');
                  const size = Math.min(data.cell.width - 6, data.cell.height - 8);
                  const x = data.cell.x + (data.cell.width - size) / 2;
                  const y = data.cell.y + 2;
                  doc.setFillColor(255, 255, 255);
                  doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                  doc.addImage(imgData, 'PNG', x, y, size, size);
                  doc.setFont('courier', 'bold');
                  doc.setFontSize(7);
                  doc.setTextColor(15, 23, 42);
                  doc.text(assetCode, data.cell.x + data.cell.width / 2, y + size + 3, { align: 'center' });
                }
              });
            } catch (err) {
              console.error('Error drawing QR in table:', err);
            }
          } else {
            drawVectorBarcode(doc, assetCode, data.cell.x, data.cell.y, data.cell.width, data.cell.height, isJumbo);
          }
        }
      },
    });

    const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Halaman ${i} dari ${totalPages} — Sistem Inventaris Barcode Aset Pro`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
  const typeTag = barcodeType === 'QR' ? 'QR2D' : 'Barcode1D';
  const layoutTag = layoutMode === 'minimal_qr' ? 'MinimalisQR' : layoutMode === 'cards' ? 'StikerLabel' : 'Tabel';
  const fullFileName = `${fileNamePrefix}_${layoutTag}_${typeTag}_${dateStr}_${timeStr}.pdf`;

  doc.save(fullFileName);
  return fullFileName;
}
