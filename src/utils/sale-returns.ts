import { Product, Sale, SaleReturnItem } from '../types';

// Sales recorded before returns were stored on the sale only carry them in the note,
// written as "İade: <ürün> <miktar> <birim>, ...".
const LEGACY_RETURN_NOTE = /İade: (.+)$/;
const LEGACY_RETURN_ENTRY = /^(.+) (\d+(?:\.\d+)?) (Adet|Kg|Paket|Koli|Metre|Litre)$/;

export const getSaleReturns = (sale: Sale, products: Product[] = []): SaleReturnItem[] => {
  if (sale.returns) return sale.returns;
  const legacyNote = sale.notes?.match(LEGACY_RETURN_NOTE)?.[1];
  if (!legacyNote) return [];

  return legacyNote.split(', ').flatMap((entry) => {
    const match = entry.match(LEGACY_RETURN_ENTRY);
    if (!match) return [];
    const [, productName, quantity, unit] = match;
    const productId =
      sale.items.find((item) => item.productName === productName)?.productId ??
      products.find((product) => product.name === productName)?.id ??
      `legacy-${productName}`;
    return [{ productId, productName, quantity: Number(quantity), unit }];
  });
};

export const getSaleReturnedQuantity = (sale: Sale, products: Product[] = []): number =>
  getSaleReturns(sale, products).reduce((sum, item) => sum + item.quantity, 0);

export const formatQuantity = (value: number): string => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
