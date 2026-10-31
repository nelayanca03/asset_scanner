import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Asset } from '../types/asset';
import { sanitizeBarcode } from './validation';

export interface ExportPdfOptions {
  fileNamePrefix?: string;
  barcodeSize?: 'jumbo' | 'standard'; // 'jumbo': recommended for physical scanner guns & screen scan
  barcodeType?: 'CODE128' | 'QR';     // 'CODE128' (1D) or 'QR' (2D)
  layoutMode?: 'table' | 'cards';     // 'table' (A4 landscape) or 'cards' (A4 sticker cards)
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

  // 1. Try vector rendering via JsBarcode CODE128 module
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
          // Standard Code128 requires at least 10-12 modules quiet zone on both sides
          const quietZone = isJumbo ? 12 : 10;
          const totalModules = binaryData.length + quietZone * 2;

          // Available width within cell (leave margin from cell borders)
          const cellMargin = isJumbo ? 4 : 3;
          const availableWidth = cellWidth - cellMargin * 2;
          
          // Calculate module width (X dimension in mm) - allow up to 0.38mm for jumbo
          const maxModule = isJumbo ? 0.38 : 0.26;
          const moduleWidth = Math.min(maxModule, availableWidth / totalModules);
          const barcodeWidth = totalModules * moduleWidth;

          // Heights
          const textHeight = isJumbo ? 4.2 : 3.5;
          const verticalPadding = isJumbo ? 4 : 3;
          const barHeight = Math.max(isJumbo ? 16 : 9, cellHeight - textHeight - verticalPadding);

          // Center horizontally and vertically within cell
          const startX = cellX + (cellWidth - barcodeWidth) / 2 + quietZone * moduleWidth;
          const startY = cellY + 2;

          // 1. Draw solid white background to eliminate interference from cell borders
          doc.setFillColor(255, 255, 255);
          doc.rect(cellX + 0.5, cellY + 0.5, cellWidth - 1, cellHeight - 1, 'F');

          // 2. Draw black vector bars
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

          // 3. Draw human-readable code centered underneath the bars
          doc.setFont('courier', 'bold');
          doc.setFontSize(isJumbo ? 8.5 : 7.5);
          doc.setTextColor(15, 23, 42); // slate-900
          const textY = startY + barHeight + (isJumbo ? 3.8 : 3.2);
          doc.text(clean, cellX + cellWidth / 2, textY, { align: 'center' });
          return;
        }
      }
    }
  } catch (err) {
    console.warn('Vector barcode draw exception, falling back to canvas:', err);
  }

  // 2. Fallback: High-resolution Canvas rendering with preserved aspect ratio
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
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(225, 29, 72);
    doc.text(clean, cellX + cellWidth / 2, cellY + cellHeight / 2, { align: 'center' });
  }
}

/**
 * Draws a high-contrast QR code directly into the PDF cell.
 */
async function drawQrCode(
  doc: jsPDF,
  code: string,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  showText: boolean = true
): Promise<void> {
  const clean = sanitizeBarcode(code);
  if (!clean) return;

  try {
    const qrDataUrl = await QRCode.toDataURL(clean, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Fill white background in cell
    doc.setFillColor(255, 255, 255);
    doc.rect(cellX + 0.5, cellY + 0.5, cellWidth - 1, cellHeight - 1, 'F');

    const qrSize = Math.min(cellWidth - 6, cellHeight - (showText ? 7 : 4));
    const x = cellX + (cellWidth - qrSize) / 2;
    const y = cellY + (showText ? 2 : (cellHeight - qrSize) / 2);

    doc.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);

    if (showText) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(clean, cellX + cellWidth / 2, y + qrSize + 3.2, { align: 'center' });
    }
  } catch (err) {
    console.error('Failed to draw QR code in PDF:', err);
  }
}

/**
 * Generates an A4 Printable Asset Tag Stickers (8 cards per page).
 * Ideal for physical printing and instant scanner gun scanning from 30-50cm distance.
 */
async function generateAssetCardsPdf(
  assets: Asset[],
  options: ExportPdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // 2 columns x 4 rows = 8 cards per page
  const cols = 2;
  const rows = 4;
  const marginX = 10;
  const marginY = 12;
  const colGap = 6;
  const rowGap = 5;

  const cardWidth = (pageWidth - marginX * 2 - colGap * (cols - 1)) / cols; // ~92mm
  const cardHeight = (pageHeight - marginY * 2 - rowGap * (rows - 1)) / rows; // ~63.25mm

  const cardsPerPage = cols * rows;

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];
    const pageIndex = Math.floor(idx / cardsPerPage);
    const cardInPageIndex = idx % cardsPerPage;

    if (idx > 0 && cardInPageIndex === 0) {
      doc.addPage();
    }

    const col = cardInPageIndex % cols;
    const row = Math.floor(cardInPageIndex / cols);

    const x = marginX + col * (cardWidth + colGap);
    const y = marginY + row * (cardHeight + rowGap);

    // 1. Outer Card Box with rounded rectangle
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    // 2. Header Banner: Outlet Badge & Lokasi Aset
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(x + 1, y + 1, cardWidth - 2, 10, 1.5, 1.5, 'F');

    // Outlet text (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202); // Indigo 700
    const outletText = asset.outlet || 'SEMUA OUTLET';
    doc.text(outletText.toUpperCase(), x + 3.5, y + 7.5);

    // Lokasi Aset badge (Right)
    const locationText = asset.location || 'UMUM';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text(`LOKASI: ${locationText.toUpperCase()}`, x + cardWidth - 3.5, y + 7.5, { align: 'right' });

    // 3. Asset Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // Slate 900
    const truncatedName = asset.name.length > 34 ? asset.name.substring(0, 32) + '...' : asset.name;
    doc.text(truncatedName, x + 3.5, y + 16.5);

    // 4. Asset Code Header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('KODE ASET / BARCODE:', x + 3.5, y + 21);

    // 5. Draw Giant Barcode or QR Code
    if (options.barcodeType === 'QR') {
      // Draw QR Code on right, metadata on left
      const qrBoxSize = 34;
      const qrX = x + cardWidth - qrBoxSize - 4;
      const qrY = y + 23;
      await drawQrCode(doc, asset.barcode, qrX, qrY, qrBoxSize, qrBoxSize, false);

      // Left metadata block
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(asset.barcode, x + 3.5, y + 27);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Kategori: ${asset.category || '-'}`, x + 3.5, y + 33);
      doc.text(`Status: ${asset.status || 'Aktif'}`, x + 3.5, y + 38);
      if (asset.serialNumber) {
        doc.text(`S/N: ${asset.serialNumber}`, x + 3.5, y + 43);
      }
    } else {
      // Giant 1D Code128 Barcode: 84mm width x 28mm height
      const barcodeBoxX = x + 2.5;
      const barcodeBoxY = y + 23;
      const barcodeBoxW = cardWidth - 5; // ~87mm
      const barcodeBoxH = 34; // Generous height for instant laser gun scan
      drawVectorBarcode(doc, asset.barcode, barcodeBoxX, barcodeBoxY, barcodeBoxW, barcodeBoxH, true);

      // Bottom sub-info
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
 * Supports Table Layout (A4 Landscape with jumbo barcode column) and Sticker Cards Layout.
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
    barcodeSize = 'jumbo',
    barcodeType = 'CODE128',
    layoutMode = 'table',
  } = options;

  const isJumbo = barcodeSize === 'jumbo';
  let doc: jsPDF;

  if (layoutMode === 'cards') {
    doc = await generateAssetCardsPdf(assets, { ...options, barcodeSize, barcodeType, layoutMode });
  } else {
    // Standard / Jumbo Table in A4 Landscape (297mm x 210mm)
    doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // 1. Header Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('LAPORAN DATA INVENTARIS ASET OUTLET', 10, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    const modeBadge = barcodeSize === 'jumbo' ? 'Barcode Jumbo (Ekstra Lebar & Tinggi)' : 'Barcode Standar';
    const typeBadge = barcodeType === 'QR' ? '2D QR Code' : '1D Code 128';
    doc.text(
      `Format: ${modeBadge} · Tipe: ${typeBadge} | Dicetak: ${currentDate} | Total: ${assets.length} Aset Terdaftar`,
      10,
      20.5
    );

    // Decorative hairline
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(10, 23, pageWidth - 10, 23);

    // 2. Prepare table rows
    // Row contains: [0: No, 1: Barcode Placeholder, 2: Outlet, 3: Lokasi, 4: Kode, 5: Nama, 6: Status, 7: Raw Code for safe draw]
    const tableRows = assets.map((asset, index) => [
      index + 1,
      '', // Barcode graphic column, drawn via didDrawCell
      asset.outlet || '-',
      asset.location || '-',
      asset.barcode,
      asset.name,
      asset.status,
      asset.barcode, // Exact barcode passed directly inside row data
    ]);

    // Dimensions: Jumbo barcode column width is 84mm with 28mm row height
    // This allows module width of 0.30mm - 0.35mm (12-14 mils) and 18mm bar height,
    // which scans instantly on physical laser scanner guns and phone cameras without delay.
    const barcodeColWidth = barcodeType === 'QR' ? (isJumbo ? 40 : 32) : (isJumbo ? 84 : 56);
    const rowMinHeight = barcodeType === 'QR' ? (isJumbo ? 32 : 24) : (isJumbo ? 28 : 18);

    // 3. Generate AutoTable
    autoTable(doc, {
      startY: 26,
      head: [['No', barcodeType === 'QR' ? 'QR Code Tag' : 'Barcode Tag (Jumbo)', 'Nama Outlet', 'Lokasi Aset', 'Kode Aset', 'Nama Aset', 'Status']],
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
        fillColor: [79, 70, 229], // Indigo 600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, // No
        1: { cellWidth: barcodeColWidth, minCellHeight: rowMinHeight, halign: 'center' }, // Barcode Tag
        2: { cellWidth: 38, fontStyle: 'bold' }, // Nama Outlet
        3: { cellWidth: 26, fontStyle: 'bold' }, // Lokasi Aset (Dapur/Service)
        4: { cellWidth: 36, font: 'courier', fontStyle: 'bold' }, // Kode Aset
        // 5: Nama Aset (Auto-expanded to fill remaining space without overflow)
        6: { cellWidth: 20, halign: 'center' }, // Status
      },
      didDrawCell: (data) => {
        // Draw Barcode in Column 1 for each body row
        if (data.column.index === 1 && data.section === 'body') {
          const rawRow = data.row.raw as any[];
          const assetCode = String(rawRow[7] || rawRow[4] || '');
          if (barcodeType === 'QR') {
            // Note: Since didDrawCell is synchronous in jspdf-autotable,
            // we use synchronous Canvas-to-DataURL for QR code fallback or vector barcode
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
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [100, 116, 139],
        fontStyle: 'bold',
      },
    });

    // 4. Page numbering footer
    const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Halaman ${i} dari ${totalPages} — Sistem Inventaris Barcode Aset Pro (Barcode Ekstra Lebar & Mudah Discan)`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }
  }

  // 5. Save & trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
  const typeTag = barcodeType === 'QR' ? 'QR' : isJumbo ? 'BarcodeJumbo' : 'Barcode';
  const layoutTag = layoutMode === 'cards' ? 'StikerLabel' : 'Tabel';
  const fullFileName = `${fileNamePrefix}_${layoutTag}_${typeTag}_${dateStr}_${timeStr}.pdf`;

  doc.save(fullFileName);
  return fullFileName;
}
