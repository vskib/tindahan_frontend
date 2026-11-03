import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { formatDateTime } from '../lib/format.js';
import { pesos } from '../lib/money.js';
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

export default function Dashboard() {
  const d = useFetch(() => api('/api/dashboard'), []);
  const x = d.data?.data;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><div className="mb-1 text-xs font-bold tracking-widest text-base-content/50">OVERVIEW</div><h1 className="mb-0 text-2xl font-bold">Your store at a glance</h1></div>
        <button className="btn btn-outline btn-sm" onClick={d.reload} disabled={d.loading}>↻ Refresh</button>
      </div>
      <ErrorAlert error={d.error} onRetry={d.reload} />
      {!x && d.loading && <Loading variant="dashboard" />}
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
