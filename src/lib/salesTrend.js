import { addDays } from './format.js';

export function buildSalesTrend(rows, from, days = 7) {
  const salesByDay = new Map(rows.map((row) => [row.day, Number(row.total_centavos)]));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(from, index);
    return { day, total_centavos: salesByDay.get(day) ?? 0 };
  });
}
