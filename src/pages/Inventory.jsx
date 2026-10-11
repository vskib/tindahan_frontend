import { useState } from 'react';
import { api } from '../lib/api.js';
import { useDebounced, useFetch } from '../lib/hooks.js';
import { REASONS, formatDateTime } from '../lib/format.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { Empty, ErrorAlert, Loading, Spin } from '../components/Ui.jsx';

const ADJUST_REASONS = ['new_delivery', 'damaged', 'expired', 'stock_count_correction', 'other'];
const LABEL = {
  new_delivery: 'Quantity received', damaged: 'Quantity damaged (removed)', expired: 'Quantity expired (removed)',
  stock_count_correction: 'Actual counted quantity', other: 'Quantity',
};

function AdjustModal({ product, onClose, onSaved }) {
  // Load the CURRENT stock so a count correction is computed from fresh numbers.
  const fresh = useFetch(() => api(`/api/products/${product.id}`), [product.id]);
  const current = fresh.data?.data.stock_qty ?? null;
  const [reason, setReason] = useState('new_delivery');
  const [qty, setQty] = useState('');
  const [dir, setDir] = useState('add');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const n = /^\d{1,7}$/.test(qty.trim()) ? Number(qty.trim()) : null;
  let delta = null;
  if (n !== null && current !== null) {
    if (reason === 'new_delivery') delta = n;
    else if (reason === 'damaged' || reason === 'expired') delta = -n;
    else if (reason === 'stock_count_correction') delta = n - current;
    else delta = dir === 'add' ? n : -n;
  }
  const after = delta !== null ? current + delta : null;
  let problem = null;
  if (qty !== '' && n === null) problem = 'Enter a whole number.';
  else if (delta === 0) problem = 'That is the same as the current stock.';
  else if (after !== null && after < 0) problem = `That would make stock negative (only ${current} in stock).`;
  else if (reason === 'other' && !note.trim()) problem = null;
  const needsNote = reason === 'other' && !note.trim();
  const canSave = delta !== null && delta !== 0 && !problem && !needsNote && !busy;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      await api(`/api/products/${product.id}/stock-adjustments`, { method: 'POST', body: { delta, reason, ...(note.trim() ? { note: note.trim() } : {}) } });
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal title={`Adjust stock: ${product.name}`} onClose={onClose}
      footer={<><button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!canSave}>{busy && <Spin />}Save</button></>}>
      {fresh.loading && !fresh.data ? <Loading /> : <ErrorAlert error={fresh.error} onRetry={fresh.reload} />}
      {current !== null && <p>Currently in stock: <strong>{current}</strong></p>}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="mb-3"><label className="form-label" htmlFor="reason">Reason</label>
        <select id="reason" className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
          {ADJUST_REASONS.map((r) => <option key={r} value={r}>{REASONS[r]}</option>)}</select></div>
      {reason === 'other' && <div className="mb-3"><label className="form-label" htmlFor="dir">Direction</label>
        <select id="dir" className="form-select" value={dir} onChange={(e) => setDir(e.target.value)}><option value="add">Add to stock</option><option value="remove">Remove from stock</option></select></div>}
      <div className="mb-3"><label className="form-label" htmlFor="qty">{LABEL[reason]}</label>
        <input id="qty" className={`form-control ${problem ? 'is-invalid' : ''}`} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
        {problem && <div className="invalid-feedback">{problem}</div>}</div>
      <div className="mb-3"><label className="form-label" htmlFor="note">Note {reason === 'other' ? '(required)' : '(optional)'}</label>
        <input id="note" className="form-control" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {after !== null && !problem && delta !== 0 && <div className="alert alert-info mb-0">Stock will change from <strong>{current}</strong> to <strong>{after}</strong> ({delta > 0 ? '+' : ''}{delta}).</div>}
    </Modal>
  );
}

function StockTab() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const low = useFetch(() => api('/api/inventory/low-stock'), []);
  const list = useFetch(() => api(`/api/products?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(q)}`), [page, q]);
  const [adjusting, setAdjusting] = useState(null);
  const done = () => { setAdjusting(null); low.reload(); list.reload(); };
  const rows = list.data?.data ?? [];
  return (
    <>
      <div className="card shadow-sm mb-3">
        <div className="card-header"><strong>⚠ Low stock</strong> {low.data && <span className="badge bg-warning text-dark ms-1">{low.data.total}</span>}</div>
        <div className="card-body">
          <ErrorAlert error={low.error} onRetry={low.reload} />
          {low.data && low.data.data.length === 0 && <span className="text-success">All products are above their low-stock level. ✔</span>}
          <div className="d-flex flex-wrap gap-2">
            {low.data?.data.map((p) => <button key={p.id} className="btn btn-sm btn-outline-warning text-dark" onClick={() => setAdjusting(p)}>{p.name}: <strong>{p.stock_qty}</strong> left</button>)}
          </div>
        </div>
      </div>
      <input className="form-control mb-3" placeholder="Search products to adjust…" aria-label="Search products" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      <ErrorAlert error={list.error} onRetry={list.reload} />
      <div className="card shadow-sm"><div className="table-responsive">
        <table className="table table-hover mb-0"><thead><tr><th>Product</th><th className="text-end">In stock</th><th className="text-end">Warn at</th><th /></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id}><td>{p.name}</td>
              <td className="money">{p.stock_qty} {p.stock_qty <= p.low_stock_threshold && <span className="badge bg-warning text-dark ms-1">{p.stock_qty === 0 ? 'Out' : 'Low'}</span>}</td>
              <td className="money">{p.low_stock_threshold}</td>
              <td className="text-end"><button className="btn btn-sm btn-primary" onClick={() => setAdjusting(p)}>Add / adjust stock</button></td></tr>))}</tbody></table></div>
        {list.loading && !list.data && <Loading />}
        {list.data && rows.length === 0 && <Empty>No products found.</Empty>}
        <div className="card-footer"><Pagination page={page} pageSize={pageSize} total={list.data?.total ?? 0} onPage={setPage} /></div></div>
      {adjusting && <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} onSaved={done} />}
    </>
  );
}

function HistoryTab() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const list = useFetch(() => api(`/api/inventory/movements?page=${page}&pageSize=${pageSize}`), [page]);
  const rows = list.data?.data ?? [];
  return (
    <>
      <ErrorAlert error={list.error} onRetry={list.reload} />
      <div className="card shadow-sm"><div className="table-responsive">
        <table className="table table-sm mb-0"><thead><tr><th>When</th><th>Product</th><th className="text-end">Change</th><th className="text-end">Stock after</th><th>Reason</th><th>Note</th><th>By</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id}><td className="text-nowrap">{formatDateTime(m.created_at)}</td><td>{m.product?.name}</td>
              <td className={`money fw-semibold ${m.delta > 0 ? 'text-success' : 'text-danger'}`}>{m.delta > 0 ? '+' : ''}{m.delta}</td>
              <td className="money">{m.qty_after}</td><td>{REASONS[m.reason] ?? m.reason}</td><td>{m.note ?? ''}</td><td>{m.user?.full_name}</td></tr>))}</tbody></table></div>
        {list.loading && !list.data && <Loading />}
        {list.data && rows.length === 0 && <Empty>No stock movements yet.</Empty>}
        <div className="card-footer"><Pagination page={page} pageSize={pageSize} total={list.data?.total ?? 0} onPage={setPage} /></div></div>
    </>
  );
}

export default function Inventory() {
  const [tab, setTab] = useState('stock');
  return (
    <>
      <h1 className="page-title">Inventory</h1>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Stock levels</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Movement history</button></li>
      </ul>
      {tab === 'stock' ? <StockTab /> : <HistoryTab />}
    </>
  );
}
