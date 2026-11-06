import { jsPDF } from 'jspdf';

type JsPdfOptions = ConstructorParameters<typeof jsPDF>[0];

const PDF_FONT_URL = `${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`;

let fontBase64Promise: Promise<string> | null = null;

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
};

/**
 * Yazı tipini bir kez indirir ve bellekte tutar.
 * Böylece PDF oluşturma hızlı biter ve paylaşım menüsü için gereken
 * "kullanıcı dokunuşu" süresi (yaklaşık 5 sn) dolmadan navigator.share çağrılabilir.
 */
export const loadPdfFontBase64 = (): Promise<string> => {
  if (!fontBase64Promise) {
    fontBase64Promise = fetch(PDF_FONT_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error('PDF font could not be loaded');
        return bytesToBase64(new Uint8Array(await response.arrayBuffer()));
      })
      .catch((error) => {
        fontBase64Promise = null;
        throw error;
      });
  }
  return fontBase64Promise;
};

export const preloadPdfFont = (): void => {
  void loadPdfFontBase64().catch(() => undefined);
};

// DejaVu Sans içinde Azerbaycan manatı simgesi (U+20BC) yok; PDF'te boş/kutu çıkmasın diye "AZN" yazılır.
const MANAT_SIGN = /\u20BC/g;

const replaceManat = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(MANAT_SIGN, 'AZN');
  if (Array.isArray(value)) return value.map(replaceManat);
  return value;
};

export const createPdfDocument = async (
  options: JsPdfOptions = { unit: 'mm', format: 'a4' },
): Promise<jsPDF> => {
  const doc = new jsPDF(options);
  const fontBase64 = await loadPdfFontBase64();
  doc.addFileToVFS('DejaVuSans.ttf', fontBase64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.setFont('DejaVuSans', 'normal');

  const originalText = doc.text.bind(doc) as unknown as (...args: unknown[]) => jsPDF;
  (doc as unknown as { text: (...args: unknown[]) => jsPDF }).text = (...args: unknown[]) =>
    originalText(...args.map((arg, index) => (index === 0 ? replaceManat(arg) : arg)));

  return doc;
};
