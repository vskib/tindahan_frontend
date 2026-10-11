const TZ = 'Asia/Manila';   // receipts and reports use Philippine time regardless of the device's clock
const dt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
export const formatDateTime = (iso) => dt.format(new Date(iso));
export const todayYmd = () => ymd.format(new Date());
export const REASONS = {
  sale: 'Sale', initial_stock: 'Starting stock', new_delivery: 'New delivery', damaged: 'Damaged goods',
  expired: 'Expired products', stock_count_correction: 'Stock-count correction', other: 'Other',
};
export const addDays = (ymdStr, n) => new Date(Date.parse(`${ymdStr}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
