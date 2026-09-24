export const formatCurrency = (amount: number, currency: string = '₼'): string => {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const formatted = new Intl.NumberFormat('az-Latn-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  return `${formatted} ${currency.trim()}`;
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeNum);
};

export const formatDate = (dateString: string): string => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
};

export const generateInvoiceNumber = (sequence: number): string => {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `ST-${year}-${padded}`;
};
