import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { isAmbiguous } from '../lib/checkout.js';
import { useDebounced, useFetch } from '../lib/hooks.js';
import { addProduct, setQty, removeLine, cartTotal, cartCount, toCheckoutItems } from '../lib/cart.js';
import { pesos, parsePesos, centavosToInput } from '../lib/money.js';
import Receipt from '../components/Receipt.jsx';
import Modal from '../components/Modal.jsx';
import { ErrorAlert, Loading, Empty, Spin } from '../components/Ui.jsx';

const QUICK_CASH = [2000, 5000, 10000, 50000, 100000];   // centavos: ₱20 ₱50 ₱100 ₱500 ₱1,000

export default function POS() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 250);
  const products = useFetch(() => api(`/api/products?pageSize=30&search=${encodeURIComponent(q)}`), [q]);

  const [cart, setCart] = useState([]);
  const [cashText, setCashText] = useState('');
  // idle -> submitting -> done | idle (refused) | unknown (outcome not confirmed)
  const [phase, setPhase] = useState('idle');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const attempt = useRef(null);      // { key, items, cash }: one idempotency key per checkout attempt
  const inFlight = useRef(false);    // blocks double-clicks even before React re-renders
  const searchRef = useRef(null);

  const locked = phase !== 'idle';
  const total = cartTotal(cart);
  const cash = parsePesos(cashText);
  const enough = cash !== null && cash >= total;
  const canPay = cart.length > 0 && enough && phase === 'idle';

  const add = (p) => {
    if (locked || p.stock_qty < 1) return;
    const line = cart.find((l) => l.product_id === p.id);
    if (line && line.qty >= p.stock_qty) { setMessage({ kind: 'warning', text: `Only ${p.stock_qty} of ${p.name} in stock.` }); return; }
    setMessage(null);
    setCart((c) => addProduct(c, p));
  };
  const changeQty = (l, qty) => {
    if (locked || !Number.isInteger(qty)) return;
    if (qty > l.stock) setMessage({ kind: 'warning', text: `Only ${l.stock} of ${l.name} in stock.` });
    setCart((c) => setQty(c, l.product_id, qty));
  };

  // Barcode scanners type the code and press Enter: look it up fresh instead of trusting the debounced list.
  const onSearchKey = async (e) => {
    if (e.key !== 'Enter' || !search.trim() || locked) return;
    e.preventDefault();
    try {
      const { data } = await api(`/api/products?pageSize=5&search=${encodeURIComponent(search.trim())}`);
      const exact = data.find((p) => p.barcode && p.barcode.toLowerCase() === search.trim().toLowerCase());
      const pick = exact ?? (data.length === 1 ? data[0] : null);
      if (pick) { add(pick); setSearch(''); }
      else setMessage({ kind: 'warning', text: data.length ? 'Several products match. Tap the one you want.' : 'No product found.' });
    } catch (err) { setMessage({ kind: 'danger', text: err.message }); }
  };

  async function submit() {
    if (inFlight.current) return;
    // The key and the payload are fixed when an attempt starts. If the outcome is unknown, retrying sends
    // exactly the same key and payload, so the server can never record it twice.
    if (!attempt.current) attempt.current = { key: crypto.randomUUID(), items: toCheckoutItems(cart), cash };
    const { key, items, cash: cashSent } = attempt.current;
    inFlight.current = true;
    setPhase('submitting'); setMessage(null);
    try {
      const res = await api('/api/checkout', { method: 'POST', body: { idempotency_key: key, items, cash_received_centavos: cashSent } });
      attempt.current = null;
      setReceipt(res.data);              // shown only because the server confirmed the commit
      setPhase('done');
      products.reload();
    } catch (e) {
      if (isAmbiguous(e)) {
        setPhase('unknown');             // keep the key; do NOT let the cashier start over blindly
      } else {
        attempt.current = null;          // refused: nothing was saved, so the next attempt gets a fresh key
        setMessage({ kind: 'danger', text: e.message });
        setPhase('idle');
        if (e.code === 'INSUFFICIENT_STOCK' || e.code === 'INVALID_PRODUCT') products.reload();
      }
    } finally {
      inFlight.current = false;
    }
  }

  async function checkStatus() {
    if (!attempt.current) return;
    setChecking(true); setMessage(null);
    try {
      const r = await api(`/api/checkout/${attempt.current.key}`);
      if (r.committed) { attempt.current = null; setReceipt(r.receipt); setPhase('done'); products.reload(); }
      else setMessage({ kind: 'warning', text: 'This sale was NOT saved. It is safe to try this same sale again.' });
    } catch (e) {
      setMessage({ kind: 'danger', text: `Still cannot confirm: ${e.message}` });
    } finally { setChecking(false); }
  }

  const nextCustomer = () => {
    attempt.current = null;
    setCart([]); setCashText(''); setReceipt(null); setMessage(null); setPhase('idle');
    searchRef.current?.focus();
  };

  const list = products.data?.data ?? [];
  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <input ref={searchRef} className="form-control form-control-lg mb-3" placeholder="Search by name or scan barcode/SKU…"
          aria-label="Search products by name or barcode" autoFocus value={search} disabled={locked}
          onChange={(e) => setSearch(e.target.value)} onKeyDown={onSearchKey} />
        <ErrorAlert error={products.error} onRetry={products.reload} />
        {products.loading && !products.data && <Loading />}
        {products.data && list.length === 0 && <Empty>No products found.</Empty>}
        <div className="row g-2">
          {list.map((p) => (
            <div className="col-6 col-md-4" key={p.id}>
              <button className="btn btn-outline-primary product-tile w-100 p-2" disabled={locked || p.stock_qty < 1} onClick={() => add(p)}>
                <div className="fw-semibold">{p.name}</div>
                <div className="fs-5">{pesos(p.price_centavos)}</div>
                {p.stock_qty < 1 ? <span className="badge bg-secondary">Out of stock</span>
                  : p.stock_qty <= p.low_stock_threshold ? <span className="badge bg-warning text-dark">Only {p.stock_qty} left</span>
                  : <span className="badge bg-light text-dark border">{p.stock_qty} in stock</span>}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="col-lg-5">
        <div className="card shadow-sm cart-sticky">
          <div className="card-header d-flex justify-content-between"><strong>Cart</strong><span className="text-muted">{cartCount(cart)} item(s)</span></div>
          <div className="card-body p-0">
            {cart.length === 0 ? <Empty>Cart is empty. Tap a product to add it.</Empty> : (
              <table className="table table-sm mb-0">
                <tbody>
                  {cart.map((l) => (
                    <tr key={l.product_id}>
                      <td className="ps-3"><div>{l.name}</div><div className="text-muted small">{pesos(l.price_centavos)} each</div></td>
                      <td style={{ width: 150 }}>
                        <div className="input-group input-group-sm">
                          <button className="btn btn-outline-secondary" aria-label={`Decrease ${l.name}`} disabled={locked} onClick={() => changeQty(l, l.qty - 1)}>−</button>
                          <input className="form-control text-center" inputMode="numeric" aria-label={`Quantity of ${l.name}`} value={l.qty} disabled={locked}
                            onChange={(e) => changeQty(l, parseInt(e.target.value, 10))} />
                          <button className="btn btn-outline-secondary" aria-label={`Increase ${l.name}`} disabled={locked} onClick={() => changeQty(l, l.qty + 1)}>+</button>
                        </div>
                      </td>
                      <td className="money">{pesos(l.price_centavos * l.qty)}</td>
                      <td className="pe-2"><button className="btn btn-sm btn-link text-danger" aria-label={`Remove ${l.name}`} disabled={locked}
                        onClick={() => setCart((c) => removeLine(c, l.product_id))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card-footer">
            <div className="d-flex justify-content-between align-items-end mb-2">
              <span className="text-muted">Total due</span>
              <span className="cart-total" data-testid="total">{pesos(total)}</span>
            </div>
            <label className="form-label mb-1" htmlFor="cash">Cash received (₱)</label>
            <input id="cash" className={`form-control form-control-lg ${cashText && cash === null ? 'is-invalid' : ''}`} inputMode="decimal" placeholder="0.00"
              value={cashText} disabled={locked} onChange={(e) => setCashText(e.target.value)} />
            {cashText && cash === null && <div className="invalid-feedback">Enter a valid amount, like 100 or 100.50.</div>}
            <div className="d-flex flex-wrap gap-1 my-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={locked || total === 0} onClick={() => setCashText(centavosToInput(total))}>Exact</button>
              {QUICK_CASH.map((c) => <button key={c} className="btn btn-sm btn-outline-secondary" disabled={locked} onClick={() => setCashText(centavosToInput(c))}>{pesos(c).replace('.00', '')}</button>)}
            </div>
            {cash !== null && cart.length > 0 && (enough
              ? <div className="change-box text-success" data-testid="change">Change: {pesos(cash - total)}</div>
              : <div className="text-danger fw-semibold" data-testid="short">Short by {pesos(total - cash)}</div>)}

            {message && <div className={`alert alert-${message.kind} mt-2 mb-0`} role="alert">{message.text}</div>}

            {phase === 'unknown' && (
              <div className="alert alert-warning mt-2 mb-0" role="alert">
                <strong>We could not confirm whether this sale was saved.</strong>
                <div className="small my-1">Do not start a new sale yet. First check if it was saved.</div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-sm btn-dark" onClick={checkStatus} disabled={checking}>{checking && <Spin />}Check if it was saved</button>
                  <button className="btn btn-sm btn-outline-dark" onClick={submit} disabled={checking}>Try this same sale again</button>
                </div>
              </div>
            )}

            {phase !== 'unknown' && (
              <button className="btn btn-success btn-lg w-100 mt-3" disabled={!canPay} onClick={submit}>
                {phase === 'submitting' ? <><Spin />Saving…</> : 'Complete sale'}
              </button>
            )}
            {phase === 'idle' && cart.length > 0 && (
              <button className="btn btn-link btn-sm text-muted w-100 mt-1" onClick={() => { setCart([]); setCashText(''); setMessage(null); }}>Clear cart</button>
            )}
          </div>
        </div>
      </div>

      {phase === 'done' && receipt && (
        <Modal title="Sale complete ✔" dismissible={false} onClose={nextCustomer}
          footer={<>
            <button className="btn btn-outline-secondary" onClick={() => window.print()}>🖨 Print receipt</button>
            <button className="btn btn-primary" onClick={nextCustomer}>Next customer</button>
          </>}>
          <div className="text-center mb-3">
            <div className="text-muted">Change to give</div>
            <div className="display-6 text-success fw-bold" data-testid="final-change">{pesos(receipt.change_centavos)}</div>
          </div>
          <Receipt receipt={receipt} />
        </Modal>
      )}
    </div>
  );
}
