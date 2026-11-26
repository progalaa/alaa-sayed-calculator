// Formats a non-negative integer number of cents as "1,234.56": two decimals,
// comma thousands separators, no currency symbol, the same in every locale.
export function formatCents(cents: number): string {
  const whole = Math.floor(cents / 100).toString();
  const fraction = (cents % 100).toString().padStart(2, '0');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}
