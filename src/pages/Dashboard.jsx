import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { formatDateTime } from '../lib/format.js';
import { pesos } from '../lib/money.js';
import { Empty, ErrorAlert, Loading } from '../components/Ui.jsx';

const Card = ({ label, value, icon, tone = 'primary' }) => (
  <div className="col-6 col-xl-3"><div className="card metric-card h-100"><div className="card-body">
    <div className="d-flex justify-content-between align-items-start"><div className="metric-label">{label}</div><span className={`metric-icon metric-${tone}`}>{icon}</span></div>
    <div className={`metric-value text-${tone}`}>{value}</div></div></div></div>
);

export default function Dashboard() {
  const d = useFetch(() => api('/api/dashboard'), []);
  const x = d.data?.data;
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div><div className="section-eyebrow">OVERVIEW</div><h1 className="page-title mb-0">Your store at a glance</h1></div>
        <button className="btn btn-outline-secondary btn-sm" onClick={d.reload} disabled={d.loading}>↻ Refresh</button>
      </div>
      <ErrorAlert error={d.error} onRetry={d.reload} />
      {!x && d.loading && <Loading variant="dashboard" />}
      {x && (
        <>
          <div className="quick-actions mb-4">
            <Link to="/pos" className="quick-action quick-action-primary"><span className="quick-action-icon">＋</span><span><strong>New sale</strong><small>Open checkout</small></span><span className="quick-action-arrow">↗</span></Link>
            <Link to="/products" className="quick-action"><span className="quick-action-icon">▦</span><span><strong>Products</strong><small>Browse catalog</small></span><span className="quick-action-arrow">↗</span></Link>
            <Link to="/inventory" className="quick-action"><span className="quick-action-icon">↗</span><span><strong>Inventory</strong><small>Manage stock</small></span><span className="quick-action-arrow">↗</span></Link>
          </div>
          <div className="row g-3 mb-4">
            <Card label="Today's sales" value={pesos(x.today_total_centavos)} icon="₱" tone="success" />
            <Card label="Transactions today" value={x.today_transactions} icon="↗" />
            <Card label="Active products" value={x.active_products} icon="▦" />
            <Card label="Low-stock products" value={x.low_stock_count} icon="!" tone={x.low_stock_count ? 'warning' : 'secondary'} />
          </div>
          <div className="row g-3">
            <div className="col-lg-5"><div className="card dashboard-card h-100">
              <div className="card-header d-flex justify-content-between align-items-center"><strong>Stock to watch</strong><Link to="/inventory">View inventory <span aria-hidden="true">→</span></Link></div>
              {x.low_stock.length === 0 ? <Empty>Nothing is running low. ✔</Empty> : (
                <table className="table table-sm dashboard-table mb-0"><tbody>{x.low_stock.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td className="money"><span className={`badge ${p.stock_qty === 0 ? 'bg-danger' : 'bg-warning text-dark'}`}>{p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}</span></td></tr>))}</tbody></table>)}
              {x.low_stock_count > x.low_stock.length && <div className="card-footer small text-muted">Showing {x.low_stock.length} of {x.low_stock_count}.</div>}
            </div></div>
            <div className="col-lg-7"><div className="card dashboard-card h-100">
              <div className="card-header d-flex justify-content-between align-items-center"><strong>Recent sales</strong><Link to="/sales">All sales <span aria-hidden="true">→</span></Link></div>
              {x.recent_sales.length === 0 ? <Empty>No sales yet.</Empty> : (
                <div className="table-responsive"><table className="table table-sm dashboard-table mb-0"><tbody>{x.recent_sales.map((s) => (
                  <tr key={s.id}><td className="text-nowrap">{s.txn_no}</td><td className="text-nowrap">{formatDateTime(s.created_at)}</td><td>{s.cashier?.full_name}</td><td className="money fw-semibold">{pesos(s.total_centavos)}</td></tr>))}</tbody></table></div>)}
            </div></div>
          </div>
        </>
      )}
    </>
  );
}
