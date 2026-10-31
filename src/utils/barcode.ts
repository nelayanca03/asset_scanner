import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { BarcodeType } from '../types/asset';

export interface RenderBarcodeOptions {
  format?: BarcodeType;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
}

// Render barcode to an HTML SVG element
export function renderBarcodeToSvg(
  svgElement: SVGSVGElement,
  text: string,
  options: RenderBarcodeOptions = {}
): boolean {
  if (!text || !svgElement) return false;

  const {
    format = 'CODE128',
    width = 2,
    height = 70,
    displayValue = true,
    fontSize = 14,
    background = '#ffffff',
    lineColor = '#0f172a',
    margin = 10,
  } = options;

  try {
    if (format === 'QR') {
      // Clear svg
      while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
      }
      return false;
    }

    // Map format to JsBarcode supported types
    const jsBarcodeFormat = format === 'CODE39' ? 'CODE39' : format === 'EAN13' ? 'EAN13' : format === 'UPC' ? 'UPC' : 'CODE128';

    JsBarcode(svgElement, text, {
      format: jsBarcodeFormat,
      width,
      height,
      displayValue,
      fontSize,
      font: 'monospace',
      background,
      lineColor,
      margin,
    });
    return true;
  } catch (error) {
    console.warn('Gagal merender barcode:', error);
    return false;
  }
}

// Render barcode to an HTML Canvas element
export async function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: RenderBarcodeOptions = {}
): Promise<boolean> {
  if (!text || !canvas) return false;

  const {
    format = 'CODE128',
    width = 2,
    height = 70,
    displayValue = true,
    fontSize = 14,
    background = '#ffffff',
    lineColor = '#0f172a',
    margin = 10,
  } = options;

  try {
    if (format === 'QR') {
      await QRCode.toCanvas(canvas, text, {
        width: Math.max(160, height * 2),
        margin: 2,
        color: {
          dark: lineColor,
          light: background,
        },
      });
      return true;
    }

    const jsBarcodeFormat = format === 'CODE39' ? 'CODE39' : format === 'EAN13' ? 'EAN13' : format === 'UPC' ? 'UPC' : 'CODE128';

    JsBarcode(canvas, text, {
      format: jsBarcodeFormat,
      width,
      height,
      displayValue,
      fontSize,
      font: 'monospace',
      background,
      lineColor,
      margin,
    });
    return true;
  } catch (error) {
    console.warn('Gagal merender barcode ke canvas:', error);
    return false;
  }
}

// Download canvas or svg as PNG file
export function downloadBarcodeImage(
  element: HTMLCanvasElement | SVGSVGElement,
  fileName: string,
  type: 'png' | 'svg' = 'png'
) {
  if (!element) return;

  if (type === 'svg' && element instanceof SVGSVGElement) {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(element);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // PNG download from canvas
  if (element instanceof HTMLCanvasElement) {
    const url = element.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (element instanceof SVGSVGElement) {
    // Convert SVG to Canvas then download PNG
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(element);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width || 300;
      tempCanvas.height = img.height || 120;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
}
