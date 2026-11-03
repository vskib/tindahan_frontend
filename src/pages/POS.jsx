import { lazy, Suspense, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { isAmbiguous } from '../lib/checkout.js';
import { useDebounced, useFetch } from '../lib/hooks.js';
import { addProduct, setQty, removeLine, cartTotal, cartCount, toCheckoutItems } from '../lib/cart.js';
import { pesos, parsePesos, centavosToInput } from '../lib/money.js';
import Receipt from '../components/Receipt.jsx';
import Modal from '../components/Modal.jsx';
import { ErrorAlert, Loading, Empty, Spin } from '../components/Ui.jsx';

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner.jsx'));
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
  const [scannerOpen, setScannerOpen] = useState(false);
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
  const onBarcodeScan = async (barcode) => {
    setScannerOpen(false);
    try {
      const { data: product } = await api(`/api/products/by-barcode?barcode=${encodeURIComponent(barcode.trim())}`);
      if (product?.stock_qty < 1) setMessage({ kind: 'warning', text: `${product.name} is out of stock.` });
      else if (product) { add(product); setSearch(''); }
    } catch (err) {
      setMessage(err.status === 404
        ? { kind: 'warning', text: `No active product found for barcode ${barcode}.` }
        : { kind: 'danger', text: err.message });
    }
    searchRef.current?.focus();
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
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 lg:col-span-7">
        <div className="mb-3 flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
          <input ref={searchRef} className="input input-bordered input-lg h-12 min-h-12 w-full min-w-0 sm:flex-1" placeholder="Search by name or scan barcode/SKU…"
            aria-label="Search products by name or barcode" autoFocus value={search} disabled={locked}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={onSearchKey} />
          <button className="btn btn-outline btn-primary h-12 min-h-12 w-full shrink-0 sm:w-auto" type="button" disabled={locked} onClick={() => setScannerOpen(true)}>Scan barcode</button>
        </div>
        <ErrorAlert error={products.error} onRetry={products.reload} />
        {products.loading && !products.data && <Loading variant="grid" />}
        {products.data && list.length === 0 && <Empty>No products found.</Empty>}
        <div className="grid grid-cols-12 gap-2">
          {list.map((p) => (
            <div className="col-span-6 md:col-span-4" key={p.id}>
              <button className="btn btn-outline btn-primary h-auto min-h-22 w-full flex-col items-start p-2 text-left" disabled={locked || p.stock_qty < 1} onClick={() => add(p)}>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xl">{pesos(p.price_centavos)}</div>
                {p.stock_qty < 1 ? <span className="badge badge-neutral">Out of stock</span>
                  : p.stock_qty <= p.low_stock_threshold ? <span className="badge badge-warning">Only {p.stock_qty} left</span>
                  : <span className="badge badge-ghost border-base-300">{p.stock_qty} in stock</span>}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <div className="card border border-base-300 bg-base-100 shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-3"><strong>Cart</strong><span className="text-base-content/60">{cartCount(cart)} item(s)</span></div>
          <div className="card-body p-0">
            {cart.length === 0 ? <Empty>Cart is empty. Tap a product to add it.</Empty> : (
              <table className="table table-xs mb-0">
                <tbody>
                  {cart.map((l) => (
                    <tr key={l.product_id}>
                      <td className="ps-3"><div>{l.name}</div><div className="text-base-content/60 text-sm">{pesos(l.price_centavos)} each</div></td>
                      <td style={{ width: 150 }}>
                        <div className="join">
                          <button className="btn btn-outline btn-secondary btn-sm join-item" aria-label={`Decrease ${l.name}`} disabled={locked} onClick={() => changeQty(l, l.qty - 1)}>−</button>
                          <input className="input input-bordered input-sm join-item w-full text-center" inputMode="numeric" aria-label={`Quantity of ${l.name}`} value={l.qty} disabled={locked}
                            onChange={(e) => changeQty(l, parseInt(e.target.value, 10))} />
                          <button className="btn btn-outline btn-secondary btn-sm join-item" aria-label={`Increase ${l.name}`} disabled={locked} onClick={() => changeQty(l, l.qty + 1)}>+</button>
                        </div>
                      </td>
                      <td className="money">{pesos(l.price_centavos * l.qty)}</td>
                      <td className="pe-2"><button className="btn btn-sm btn-ghost text-error" aria-label={`Remove ${l.name}`} disabled={locked}
                        onClick={() => setCart((c) => removeLine(c, l.product_id))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="space-y-2 border-t border-base-300 p-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-base-content/60">Total due</span>
              <span className="cart-total" data-testid="total">{pesos(total)}</span>
            </div>
            <label className="label-text block font-medium mb-1" htmlFor="cash">Cash received (₱)</label>
            <input id="cash" className={`input input-bordered input-lg w-full ${cashText && cash === null ? 'input-error' : ''}`} inputMode="decimal" placeholder="0.00"
              value={cashText} disabled={locked} onChange={(e) => setCashText(e.target.value)} />
            {cashText && cash === null && <div className="text-sm text-error">Enter a valid amount, like 100 or 100.50.</div>}
            <div className="flex flex-wrap gap-1 my-2">
              <button className="btn btn-sm btn-outline btn-secondary" disabled={locked || total === 0} onClick={() => setCashText(centavosToInput(total))}>Exact</button>
              {QUICK_CASH.map((c) => <button key={c} className="btn btn-sm btn-outline btn-secondary" disabled={locked} onClick={() => setCashText(centavosToInput(c))}>{pesos(c).replace('.00', '')}</button>)}
            </div>
            {cash !== null && cart.length > 0 && (enough
              ? <div className="change-box text-success" data-testid="change">Change: {pesos(cash - total)}</div>
              : <div className="text-error font-semibold" data-testid="short">Short by {pesos(total - cash)}</div>)}

            {message && <div className={`alert alert-${message.kind === 'danger' ? 'error' : message.kind} mt-2 mb-0`} role="alert">{message.text}</div>}

            {phase === 'unknown' && (
              <div className="alert alert-warning mt-2 mb-0" role="alert">
                <strong>We could not confirm whether this sale was saved.</strong>
                <div className="text-sm my-1">Do not start a new sale yet. First check if it was saved.</div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-sm btn-neutral" onClick={checkStatus} disabled={checking}>{checking && <Spin />}Check if it was saved</button>
                  <button className="btn btn-sm btn-outline btn-neutral" onClick={submit} disabled={checking}>Try this same sale again</button>
                </div>
              </div>
            )}

            {phase !== 'unknown' && (
              <button className="btn btn-success btn-lg w-full mt-3" disabled={!canPay} onClick={submit}>
                {phase === 'submitting' ? <><Spin />Saving…</> : 'Complete sale'}
              </button>
            )}
            {phase === 'idle' && cart.length > 0 && (
              <button className="btn btn-ghost btn-sm text-base-content/60 w-full mt-1" onClick={() => { setCart([]); setCashText(''); setMessage(null); }}>Clear cart</button>
            )}
          </div>
        </div>
      </div>

      {phase === 'done' && receipt && (
        <Modal title="Sale complete ✔" dismissible={false} onClose={nextCustomer}
          footer={<>
            <button className="btn btn-outline btn-secondary" onClick={() => window.print()}>🖨 Print receipt</button>
            <button className="btn btn-primary" onClick={nextCustomer}>Next customer</button>
          </>}>
          <div className="text-center mb-3">
            <div className="text-base-content/60">Change to give</div>
            <div className="text-4xl text-success font-bold" data-testid="final-change">{pesos(receipt.change_centavos)}</div>
          </div>
          <Receipt receipt={receipt} />
        </Modal>
      )}
      {scannerOpen && (
        <Suspense fallback={<Loading text="Loading camera scanner…" />}>
          <BarcodeScanner onClose={() => setScannerOpen(false)} onScan={onBarcodeScan} />
        </Suspense>
      )}
    </div>
  );
}
