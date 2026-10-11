import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { formatDateTime } from '../lib/format.js';
import { pesos } from '../lib/money.js';
import { Empty, ErrorAlert, Loading } from '../components/Ui.jsx';

const Card = ({ label, value, tone = 'primary' }) => (
  <div className="col-6 col-lg-3"><div className="card shadow-sm h-100"><div className="card-body">
    <div className="text-muted small">{label}</div><div className={`fs-3 fw-bold text-${tone}`}>{value}</div></div></div></div>
);

export default function Dashboard() {
  const d = useFetch(() => api('/api/dashboard'), []);
  const x = d.data?.data;
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="page-title mb-0">Dashboard</h1>
        <button className="btn btn-outline-secondary btn-sm" onClick={d.reload} disabled={d.loading}>↻ Refresh</button>
      </div>
      <ErrorAlert error={d.error} onRetry={d.reload} />
      {!x && d.loading && <Loading />}
      {x && (
        <>
          <div className="row g-3 mb-3">
            <Card label="Today's sales" value={pesos(x.today_total_centavos)} tone="success" />
            <Card label="Transactions today" value={x.today_transactions} />
            <Card label="Active products" value={x.active_products} />
            <Card label="Low-stock products" value={x.low_stock_count} tone={x.low_stock_count ? 'warning' : 'secondary'} />
          </div>
          <div className="row g-3">
            <div className="col-lg-5"><div className="card shadow-sm h-100">
              <div className="card-header d-flex justify-content-between"><strong>⚠ Low stock</strong><Link to="/inventory">Manage stock</Link></div>
              {x.low_stock.length === 0 ? <Empty>Nothing is running low. ✔</Empty> : (
                <table className="table table-sm mb-0"><tbody>{x.low_stock.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td className="money"><span className={`badge ${p.stock_qty === 0 ? 'bg-danger' : 'bg-warning text-dark'}`}>{p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}</span></td></tr>))}</tbody></table>)}
              {x.low_stock_count > x.low_stock.length && <div className="card-footer small text-muted">Showing {x.low_stock.length} of {x.low_stock_count}.</div>}
            </div></div>
            <div className="col-lg-7"><div className="card shadow-sm h-100">
              <div className="card-header d-flex justify-content-between"><strong>Recent sales</strong><Link to="/sales">All sales</Link></div>
              {x.recent_sales.length === 0 ? <Empty>No sales yet.</Empty> : (
                <div className="table-responsive"><table className="table table-sm mb-0"><tbody>{x.recent_sales.map((s) => (
                  <tr key={s.id}><td className="text-nowrap">{s.txn_no}</td><td className="text-nowrap">{formatDateTime(s.created_at)}</td><td>{s.cashier?.full_name}</td><td className="money fw-semibold">{pesos(s.total_centavos)}</td></tr>))}</tbody></table></div>)}
            </div></div>
          </div>
        </>
      )}
    </>
  );
}
