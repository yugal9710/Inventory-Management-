/**
 * Currency & Number Formatting for Nepal Iron Store
 */

export function formatNpr(amount?: number | null, includeSymbol: boolean = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return includeSymbol ? 'Rs. 0.00' : '0.00';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = (isNegative ? '-' : '') + formattedInt + '.' + decPart;
  return includeSymbol ? `Rs. ${formatted}` : formatted;
}

export function formatQty(qty?: number | null, unit?: string): string {
  if (qty === undefined || qty === null || isNaN(qty)) return '0';
  // If integer, don't show trailing .00
  const formatted = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function numberToWordsNpr(num?: number | null): string {
  if (num === undefined || num === null || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    let res = '';
    if (hundred) res += ones[hundred] + ' Hundred';
    if (rem) res += (res ? ' ' : '') + convertTwoDigits(rem);
    return res;
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let remaining = intPart;
  const parts: string[] = [];

  // South Asian numbering system:
  // Crores (1,00,00,000)
  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    parts.push(convertThreeDigits(crore) + ' Crore');
  }

  // Lakhs (1,00,000)
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    parts.push(convertTwoDigits(lakh) + ' Lakh');
  }

  // Thousands (1,000)
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    parts.push(convertTwoDigits(thousand) + ' Thousand');
  }

  // Hundreds & units
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  let words = parts.length > 0 ? parts.join(' ') + ' Rupees' : 'Zero Rupees';
  if (decPart > 0) {
    words += ' and ' + convertTwoDigits(decPart) + ' Paisa';
  }
  return words + ' Only';
}
