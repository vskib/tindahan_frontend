import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useFetch } from '../lib/hooks.js';
import { addDays, formatDateTime, todayYmd } from '../lib/format.js';
import { pesos } from '../lib/money.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Receipt from '../components/Receipt.jsx';
import { Empty, ErrorAlert, Loading } from '../components/Ui.jsx';

function SaleDetail({ id, onClose }) {
  const d = useFetch(() => api(`/api/sales/${id}`), [id]);
  const sale = d.data?.data;
  const receipt = sale ? { ...sale, cashier_name: sale.cashier?.full_name } : null;
  return (
    <Modal title="Sale details" onClose={onClose}
      footer={<><button className="btn btn-outline-secondary" onClick={() => window.print()} disabled={!receipt}>🖨 Print copy</button>
        <button className="btn btn-primary" onClick={onClose}>Close</button></>}>
      {d.loading && !receipt && <Loading />}
      <ErrorAlert error={d.error} onRetry={d.reload} />
      {receipt && <Receipt receipt={receipt} copy />}
    </Modal>
  );
}

export default function Sales() {
  const { isOwner } = useAuth();
  const today = todayYmd();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const pageSize = 20;
  const rangeError = !from || !to ? 'Choose both dates.' : to < from ? 'The end date is before the start date.' : null;

  const list = useFetch(() => (rangeError ? Promise.resolve(null) : api(`/api/sales?from=${from}&to=${to}&page=${page}&pageSize=${pageSize}`)), [from, to, page, rangeError]);
  const days = useFetch(() => (!isOwner || rangeError ? Promise.resolve(null) : api(`/api/reports/daily-sales?from=${from}&to=${to}`)), [from, to, isOwner, rangeError]);

  const setRange = (a, b) => { setFrom(a); setTo(b); setPage(1); };
  const rows = list.data?.data ?? [];
  const dayRows = days.data?.data ?? [];
  const grand = dayRows.reduce((s, r) => s + Number(r.total_centavos), 0);
  const grandCount = dayRows.reduce((s, r) => s + Number(r.txn_count), 0);
  return (
    <>
      <h1 className="page-title">Sales history</h1>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto"><label className="form-label mb-0 small" htmlFor="from">From</label><input id="from" type="date" className="form-control" value={from} max={today} onChange={(e) => setRange(e.target.value, to)} /></div>
        <div className="col-auto"><label className="form-label mb-0 small" htmlFor="to">To</label><input id="to" type="date" className="form-control" value={to} max={today} onChange={(e) => setRange(from, e.target.value)} /></div>
        <div className="col-auto d-flex gap-1">
          <button className="btn btn-outline-secondary" onClick={() => setRange(today, today)}>Today</button>
          <button className="btn btn-outline-secondary" onClick={() => setRange(addDays(today, -1), addDays(today, -1))}>Yesterday</button>
          <button className="btn btn-outline-secondary" onClick={() => setRange(addDays(today, -6), today)}>Last 7 days</button>
        </div>
      </div>
      {rangeError && <div className="alert alert-warning">{rangeError}</div>}
      <ErrorAlert error={list.error ?? days.error} onRetry={() => { list.reload(); days.reload(); }} />

      {isOwner && dayRows.length > 0 && (
        <div className="card shadow-sm mb-3">
          <div className="card-header d-flex justify-content-between"><strong>Daily sales</strong><span>{grandCount} sale(s) · <strong>{pesos(grand)}</strong></span></div>
          <table className="table table-sm mb-0"><thead><tr><th>Day</th><th className="text-end">Transactions</th><th className="text-end">Total sales</th></tr></thead>
            <tbody>{dayRows.map((r) => <tr key={r.day}><td>{r.day}</td><td className="money">{r.txn_count}</td><td className="money">{pesos(Number(r.total_centavos))}</td></tr>)}</tbody></table>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>Transaction no.</th><th>Date &amp; time</th><th>Cashier</th><th className="text-end">Total</th><th className="text-end">Cash</th><th className="text-end">Change</th><th /></tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s.id}><td className="text-nowrap">{s.txn_no}</td><td className="text-nowrap">{formatDateTime(s.created_at)}</td><td>{s.cashier?.full_name}</td>
                <td className="money fw-semibold">{pesos(s.total_centavos)}</td><td className="money">{pesos(s.cash_received_centavos)}</td><td className="money">{pesos(s.change_centavos)}</td>
                <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => setViewing(s.id)}>View</button></td></tr>))}</tbody>
          </table>
        </div>
        {list.loading && !list.data && <Loading />}
        {list.data && rows.length === 0 && <Empty>No sales in this period.</Empty>}
        <div className="card-footer"><Pagination page={page} pageSize={pageSize} total={list.data?.total ?? 0} onPage={setPage} /></div>
      </div>
      {!isOwner && <p className="text-muted small mt-2">You can see the sales you rang up.</p>}
      {viewing && <SaleDetail id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
