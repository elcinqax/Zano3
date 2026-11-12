/**
 * Ortak dosya paylaşım yardımcısı.
 *
 * Sıra:
 *  1) APK içindeki yerel köprü (window.AndroidShare) varsa onunla paylaşır.
 *  2) Tarayıcı / TWA / PWA'da Web Share API (dosya paylaşımı) ile "hangi uygulamayla paylaş" menüsünü açar.
 *  3) İkisi de yoksa dosyayı indirir.
 */

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded';

export interface ShareOptions {
  title?: string;
  text?: string;
}

interface NativeShareBridge {
  sharePdf?: (base64Pdf: string, fileName: string) => void;
  shareFile?: (base64Data: string, fileName: string, mimeType: string) => void;
}

const getNativeBridge = (): NativeShareBridge | undefined =>
  (window as unknown as { AndroidShare?: NativeShareBridge }).AndroidShare;

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okunamadı'));
    reader.readAsDataURL(blob);
  });

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const isMobileDevice = (): boolean =>
  Boolean(getNativeBridge()) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const shareOrDownloadBlob = async (
  blob: Blob,
  fileName: string,
  options: ShareOptions = {},
): Promise<ShareOutcome> => {
  const mimeType = blob.type || 'application/octet-stream';

  const bridge = getNativeBridge();
  if (bridge) {
    try {
      const base64 = await blobToBase64(blob);
      if (typeof bridge.shareFile === 'function') {
        bridge.shareFile(base64, fileName, mimeType);
        return 'shared';
      }
      if (mimeType === 'application/pdf' && typeof bridge.sharePdf === 'function') {
        bridge.sharePdf(base64, fileName);
        return 'shared';
      }
    } catch (error) {
      console.error('Yerel paylaşım köprüsü başarısız oldu:', error);
    }
  }

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: options.title ?? fileName,
          ...(options.text ? { text: options.text } : {}),
        });
        return 'shared';
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      console.error('Paylaşım menüsü açılamadı, indirmeye geçiliyor:', error);
    }
  }

  downloadBlob(blob, fileName);
  return 'downloaded';
};

/** PDF'i gizli bir çerçevede açıp tarayıcının yazdırma penceresini gösterir (bilgisayar tarayıcıları için). */
export const printPdfBlob = (blob: Blob): Promise<void> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    const cleanup = () => {
      frame.remove();
      URL.revokeObjectURL(url);
    };
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.onload = () => {
      try {
        const target = frame.contentWindow;
        if (!target) throw new Error('Yazdırma çerçevesi açılamadı');
        target.focus();
        target.print();
        window.setTimeout(cleanup, 60_000);
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    frame.onerror = () => {
      cleanup();
      reject(new Error('PDF yazdırma için yüklenemedi'));
    };
    frame.src = url;
    document.body.appendChild(frame);
  });

/** Telefonda paylaşım menüsünü, bilgisayarda doğrudan indirmeyi kullanır (Excel/CSV/yedek için). */
export const saveOrShareBlob = async (
  blob: Blob,
  fileName: string,
  options: ShareOptions = {},
): Promise<ShareOutcome> => {
  if (isMobileDevice()) return shareOrDownloadBlob(blob, fileName, options);
  downloadBlob(blob, fileName);
  return 'downloaded';
};
