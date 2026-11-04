import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { addDays, formatDateTime, todayYmd } from '../lib/format.js';
import { pesos } from '../lib/money.js';
import { buildSalesTrend } from '../lib/salesTrend.js';
import { Empty, ErrorAlert, Loading } from '../components/Ui.jsx';

const Card = ({ label, value, icon, tone = 'primary' }) => {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-base-content';
  const iconClass = tone === 'warning' ? 'badge-warning' : tone === 'secondary' ? 'badge-neutral' : 'badge-primary';
  return (
    <div className="col-span-6 lg:col-span-3"><div className="card h-full border border-base-300 bg-base-100 shadow-sm"><div className="card-body gap-2 p-4">
      <div className="flex items-center justify-between"><div className="text-sm text-base-content/60">{label}</div><span className={`badge ${iconClass}`}>{icon}</span></div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div></div></div></div>
  );
};

const QuickLink = ({ to, icon, title, detail, primary = false }) => (
  <Link to={to} className={`card min-w-48 flex-row items-center gap-3 p-3 no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${primary ? 'bg-neutral text-neutral-content' : 'border border-base-300 bg-base-100 text-base-content'}`}>
    <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-lg ${primary ? 'bg-neutral-content/15' : 'bg-primary/10 text-primary'}`}>{icon}</span>
    <span><strong className="block text-sm">{title}</strong><small className={`text-xs ${primary ? 'opacity-70' : 'text-base-content/60'}`}>{detail}</small></span>
    <span className="ms-auto opacity-70">↗</span>
  </Link>
);

function SalesTrend({ rows, loading, failed }) {
  const values = rows.map((row) => row.total_centavos);
  const max = Math.max(...values, 0);
  const chartMax = max || 1;
  const left = 54; const right = 700; const top = 18; const bottom = 164;
  const points = rows.map((row, index) => ({
    ...row,
    x: left + (rows.length > 1 ? index * (right - left) / (rows.length - 1) : 0),
    y: bottom - (row.total_centavos / chartMax) * (bottom - top),
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${right} ${bottom} L ${left} ${bottom} Z`;
  const label = (day) => new Intl.DateTimeFormat('en-PH', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${day}T12:00:00Z`));

  return (
    <div className="card mb-3 border border-base-300 bg-base-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
        <strong>Sales trend · last 7 days</strong><span className="text-sm text-base-content/60">Daily totals</span>
      </div>
      {loading ? <Loading variant="detail" /> : failed ? <p className="p-4 text-sm text-base-content/60">Sales trend could not be loaded. Please retry.</p> : rows.every((row) => row.total_centavos === 0)
        ? <Empty>No sales during the last 7 days.</Empty>
        : <div className="p-3 sm:p-4">
          <div className="flex justify-between text-xs text-base-content/60"><span>{pesos(max)}</span><span>{pesos(0)}</span></div>
          <svg className="h-48 w-full overflow-visible" viewBox="0 0 720 205" role="img" aria-label="Daily sales trend for the last seven days">
            <title>Sales totals for the last seven days</title>
            {[top, (top + bottom) / 2, bottom].map((y) => <line key={y} x1={left} x2={right} y1={y} y2={y} stroke="currentColor" opacity=".12" />)}
            <path d={area} fill="currentColor" className="text-primary" opacity=".1" />
            <path d={line} fill="none" stroke="currentColor" className="text-primary" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((point) => (
              <g key={point.day}>
                <title>{point.day}: {pesos(point.total_centavos)}</title>
                <circle cx={point.x} cy={point.y} r="5" fill="currentColor" className="text-primary" />
                <text x={point.x} y="190" textAnchor="middle" fill="currentColor" fontSize="12" opacity=".7">{label(point.day)}</text>
              </g>
            ))}
          </svg>
          <div className="sr-only">
            {rows.map((row) => <span key={row.day}>{row.day}: {pesos(row.total_centavos)}. </span>)}
          </div>
        </div>}
    </div>
  );
}

export default function Dashboard() {
  const d = useFetch(() => api('/api/dashboard'), []);
  const today = todayYmd();
  const trendFrom = addDays(today, -6);
  const trend = useFetch(() => api(`/api/reports/daily-sales?from=${trendFrom}&to=${today}`), [trendFrom, today]);
  const x = d.data?.data;
  const trendRows = buildSalesTrend(trend.data?.data ?? [], trendFrom);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><div className="mb-1 text-xs font-bold tracking-widest text-base-content/50">OVERVIEW</div><h1 className="mb-0 text-2xl font-bold">Your store at a glance</h1></div>
        <button className="btn btn-outline btn-sm" onClick={() => { d.reload(); trend.reload(); }} disabled={d.loading || trend.loading}>↻ Refresh</button>
      </div>
      <ErrorAlert error={d.error} onRetry={d.reload} />
      {!x && d.loading && <Loading variant="dashboard" />}
      <ErrorAlert error={trend.error} onRetry={trend.reload} />
      {x && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <QuickLink to="/pos" icon="＋" title="New sale" detail="Open checkout" primary />
            <QuickLink to="/products" icon="▦" title="Products" detail="Browse catalog" />
            <QuickLink to="/inventory" icon="↗" title="Inventory" detail="Manage stock" />
          </div>
          <div className="mb-4 grid grid-cols-12 gap-3">
            <Card label="Today's sales" value={pesos(x.today_total_centavos)} icon="₱" tone="success" />
            <Card label="Transactions today" value={x.today_transactions} icon="↗" />
            <Card label="Active products" value={x.active_products} icon="▦" />
            <Card label="Low-stock products" value={x.low_stock_count} icon="!" tone={x.low_stock_count ? 'warning' : 'secondary'} />
          </div>
          <SalesTrend rows={trendRows} loading={trend.loading && !trend.data} failed={Boolean(trend.error)} />
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-5">
              <div className="card h-full border border-base-300 bg-base-100 shadow-sm">
                <div className="flex items-center justify-between border-b border-base-300 px-4 py-3"><strong>Stock to watch</strong><Link className="link link-primary text-sm" to="/inventory">View inventory <span aria-hidden="true">→</span></Link></div>
                {x.low_stock.length === 0 ? <Empty>Nothing is running low. ✔</Empty> : (
                  <table className="table table-xs"><tbody>{x.low_stock.map((p) => (
                    <tr key={p.id}><td>{p.name}</td><td className="money"><span className={`badge ${p.stock_qty === 0 ? 'badge-error' : 'badge-warning'}`}>{p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}</span></td></tr>))}</tbody></table>)}
                {x.low_stock_count > x.low_stock.length && <div className="border-t border-base-300 px-4 py-3 text-sm text-base-content/60">Showing {x.low_stock.length} of {x.low_stock_count}.</div>}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-7">
              <div className="card h-full border border-base-300 bg-base-100 shadow-sm">
                <div className="flex items-center justify-between border-b border-base-300 px-4 py-3"><strong>Recent sales</strong><Link className="link link-primary text-sm" to="/sales">All sales <span aria-hidden="true">→</span></Link></div>
                {x.recent_sales.length === 0 ? <Empty>No sales yet.</Empty> : (
                  <div className="overflow-x-auto"><table className="table table-xs"><tbody>{x.recent_sales.map((s) => (
                    <tr key={s.id}><td className="whitespace-nowrap">{s.txn_no}</td><td className="whitespace-nowrap">{formatDateTime(s.created_at)}</td><td>{s.cashier?.full_name}</td><td className="money font-semibold">{pesos(s.total_centavos)}</td></tr>))}</tbody></table></div>)}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
