// All money is handled as integer centavos. Floating point is used ONLY to display.
const fmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const pesos = (centavos) => fmt.format(centavos / 100);

/** "1,234.50" / "₱50" -> integer centavos, or null if it is not a clean peso amount (max 2 decimals). */
export function parsePesos(input) {
  if (typeof input !== 'string') return null;
  const s = input.replace(/[₱,\s]/g, '');
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

export const centavosToInput = (centavos) => (centavos / 100).toFixed(2);
