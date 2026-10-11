import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useDebounced, useFetch } from '../lib/hooks.js';
import { pesos, parsePesos, centavosToInput } from '../lib/money.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { Empty, ErrorAlert, FieldError, Loading, Spin } from '../components/Ui.jsx';

// Defined at module level on purpose: a component defined INSIDE another component gets a new identity on every
// render, which makes React remount its inputs and drop keyboard focus after each keystroke.
const Field = ({ id, label, hint, error, children }) => (
  <div className="mb-3"><label className="form-label" htmlFor={id}>{label}</label>{children}
    {hint && !error && <div className="form-text">{hint}</div>}<FieldError msg={error} /></div>
);

const FIELD_MAP = { price_centavos: 'price', cost_centavos: 'cost', initial_stock: 'stock' };

function ProductForm({ product, onSaved, onClose }) {
  const isNew = !product;
  const [f, setF] = useState({
    name: product?.name ?? '', barcode: product?.barcode ?? '',
    price: product ? centavosToInput(product.price_centavos) : '',
    cost: product?.cost_centavos != null ? centavosToInput(product.cost_centavos) : '',
    stock: '0', threshold: String(product?.low_stock_threshold ?? 5),
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const intOk = (s) => /^\d{1,7}$/.test(s.trim());

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Enter the product name.';
    else if (f.name.trim().length > 120) e.name = 'Name is too long (120 characters max).';
    if (f.barcode.trim().length > 64) e.barcode = 'Too long (64 characters max).';
    const price = parsePesos(f.price);
    if (price === null || price < 1) e.price = 'Enter a selling price like 12 or 12.50.';
    const cost = parsePesos(f.cost);
    if (cost === null) e.cost = 'Enter the cost price (0 if unknown).';
    if (isNew && !intOk(f.stock)) e.stock = 'Enter a whole number, 0 or more.';
    if (!intOk(f.threshold)) e.threshold = 'Enter a whole number, 0 or more.';
    return { e, price, cost };
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const { e, price, cost } = validate();
    setErrors(e); setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    const common = { name: f.name.trim(), barcode: f.barcode.trim() || null, price_centavos: price, cost_centavos: cost, low_stock_threshold: Number(f.threshold) };
    try {
      if (isNew) await api('/api/products', { method: 'POST', body: { ...common, initial_stock: Number(f.stock) } });
      else await api(`/api/products/${product.id}`, { method: 'PUT', body: common });
      onSaved();
    } catch (err) {
      if (err.code === 'DUPLICATE_BARCODE') setErrors({ barcode: err.message });
      else if (err.fields?.length) { setErrors(Object.fromEntries(err.fields.map((x) => [FIELD_MAP[x.path] ?? x.path, x.message]))); setFormError('Please fix the highlighted fields.'); }
      else setFormError(err.message);
      setBusy(false);
    }
  };
  const cls = (k) => `form-control ${errors[k] ? 'is-invalid' : ''}`;
  return (
    <Modal title={isNew ? 'Add product' : 'Edit product'} onClose={onClose}
      footer={<><button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" form="product-form" disabled={busy}>{busy && <Spin />}Save</button></>}>
      <form id="product-form" onSubmit={submit} noValidate>
        {formError && <div className="alert alert-danger">{formError}</div>}
        <Field id="name" error={errors.name} label="Product name"><input id="name" className={cls('name')} value={f.name} onChange={set('name')} /></Field>
        <Field id="barcode" error={errors.barcode} label="Barcode / SKU (optional)"><input id="barcode" className={cls('barcode')} value={f.barcode} onChange={set('barcode')} /></Field>
        <div className="row">
          <div className="col"><Field id="price" error={errors.price} label="Selling price (₱)"><input id="price" inputMode="decimal" className={cls('price')} value={f.price} onChange={set('price')} /></Field></div>
          <div className="col"><Field id="cost" error={errors.cost} label="Cost price (₱)"><input id="cost" inputMode="decimal" className={cls('cost')} value={f.cost} onChange={set('cost')} /></Field></div>
        </div>
        <div className="row">
          {isNew && <div className="col"><Field id="stock" error={errors.stock} label="Starting stock"><input id="stock" inputMode="numeric" className={cls('stock')} value={f.stock} onChange={set('stock')} /></Field></div>}
          <div className="col"><Field id="threshold" error={errors.threshold} label="Low-stock warning at" hint="Warn when stock is this number or lower."><input id="threshold" inputMode="numeric" className={cls('threshold')} value={f.threshold} onChange={set('threshold')} /></Field></div>
        </div>
        {!isNew && <div className="form-text">To change the amount in stock, use the Inventory page so the change is recorded.</div>}
      </form>
    </Modal>
  );
}

export default function Products() {
  const { isOwner } = useAuth();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const list = useFetch(() => api(`/api/products?page=${page}&pageSize=${pageSize}&status=${status}&search=${encodeURIComponent(q)}`), [page, status, q]);
  const [editing, setEditing] = useState(null);   // null | 'new' | product
  const [archiving, setArchiving] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const toggleArchive = async () => {
    setArchiveBusy(true); setActionError(null);
    try { await api(`/api/products/${archiving.id}/${archiving.is_active ? 'archive' : 'restore'}`, { method: 'POST' }); setArchiving(null); list.reload(); }
    catch (e) { setActionError(e.message); }
    finally { setArchiveBusy(false); }
  };
  const rows = list.data?.data ?? [];
  return (
    <>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h1 className="page-title mb-0">Products</h1>
        {isOwner && <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add product</button>}
      </div>
      <div className="row g-2 mb-3">
        <div className="col-md-6"><input className="form-control" placeholder="Search by name or barcode…" aria-label="Search products" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        {isOwner && <div className="col-md-3"><select className="form-select" aria-label="Show" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="active">Active products</option><option value="archived">Archived products</option><option value="all">All products</option></select></div>}
      </div>
      <ErrorAlert error={list.error} onRetry={list.reload} />
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>Product</th><th>Barcode / SKU</th><th className="text-end">Price</th>{isOwner && <th className="text-end">Cost</th>}<th className="text-end">In stock</th>{isOwner && <th>Status</th>}{isOwner && <th />}</tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'text-muted'}>
                  <td>{p.name}</td><td>{p.barcode ?? '—'}</td>
                  <td className="money">{pesos(p.price_centavos)}</td>
                  {isOwner && <td className="money">{p.cost_centavos != null ? pesos(p.cost_centavos) : '—'}</td>}
                  <td className="money">{p.stock_qty} {p.is_active && p.stock_qty <= p.low_stock_threshold && <span className="badge bg-warning text-dark ms-1">{p.stock_qty === 0 ? 'Out' : 'Low'}</span>}</td>
                  {isOwner && <td>{p.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Archived</span>}</td>}
                  {isOwner && <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEditing(p)}>Edit</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => { setActionError(null); setArchiving(p); }}>{p.is_active ? 'Archive' : 'Restore'}</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.loading && !list.data && <Loading />}
        {list.data && rows.length === 0 && <Empty>{q ? 'No products match your search.' : 'No products yet.'}</Empty>}
        <div className="card-footer"><Pagination page={page} pageSize={pageSize} total={list.data?.total ?? 0} onPage={setPage} /></div>
      </div>
      {editing && <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
      {archiving && (
        <Modal title={archiving.is_active ? 'Archive product?' : 'Restore product?'} onClose={() => setArchiving(null)}
          footer={<><button className="btn btn-outline-secondary" onClick={() => setArchiving(null)} disabled={archiveBusy}>Cancel</button>
            <button className={`btn ${archiving.is_active ? 'btn-warning' : 'btn-primary'}`} onClick={toggleArchive} disabled={archiveBusy}>{archiveBusy && <Spin />}{archiving.is_active ? 'Archive' : 'Restore'}</button></>}>
          {actionError && <div className="alert alert-danger">{actionError}</div>}
          <p className="mb-0">{archiving.is_active
            ? <>“{archiving.name}” will no longer appear at the checkout. Past sales and receipts are not changed, and you can restore it any time.</>
            : <>“{archiving.name}” will appear at the checkout again.</>}</p>
        </Modal>
      )}
    </>
  );
}
