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
