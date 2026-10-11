import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api.js', () => {
  class ApiError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; this.fields = []; }
  }
  return { api: vi.fn(), ApiError };
});
import { api, ApiError } from '../lib/api.js';
import POS from './POS.jsx';

const PRODUCTS = [
  { id: 'p1', name: 'Pancit Canton', barcode: '4800001', price_centavos: 1500, stock_qty: 10, low_stock_threshold: 5, is_active: true },
  { id: 'p2', name: 'Coke Mismo', barcode: '4800002', price_centavos: 1050, stock_qty: 1, low_stock_threshold: 5, is_active: true },
  { id: 'p3', name: 'Sold Out Candy', barcode: null, price_centavos: 200, stock_qty: 0, low_stock_threshold: 5, is_active: true },
];
const RECEIPT = {
  sale_id: 's1', txn_no: 'TXN-20261010-000042', created_at: '2026-10-10T02:30:00Z', store_name: 'Aling Nena Store', cashier_name: 'Juan',
  total_centavos: 3000, cash_received_centavos: 5000, change_centavos: 2000,
  items: [{ product_id: 'p1', product_name: 'Pancit Canton', qty: 2, unit_price_centavos: 1500, line_total_centavos: 3000 }],
};

let checkoutCalls;
function mockApi({ checkout, status } = {}) {
  checkoutCalls = [];
  api.mockReset();
  api.mockImplementation(async (path, opts = {}) => {
    if (path.startsWith('/api/products')) return { data: PRODUCTS, total: PRODUCTS.length };
    if (path === '/api/checkout') { checkoutCalls.push(opts.body); return checkout(opts.body, checkoutCalls.length); }
    if (path.startsWith('/api/checkout/')) return status(path.split('/').pop());
    throw new Error('unexpected api call ' + path);
  });
}
async function startSale(user, cash = '50') {
  render(<POS />);
  await user.click(await tile('Pancit Canton'));
  await user.click(await tile('Pancit Canton'));          // qty 2 -> total ₱30.00
  await user.type(screen.getByLabelText(/cash received/i), cash);
}
// Product tiles only (cart buttons such as "Increase Pancit Canton" also contain the product name).
const tile = async (name) => {
  let found;
  await waitFor(() => {
    found = screen.getAllByRole('button').find((b) => b.classList.contains('product-tile') && b.textContent.startsWith(name));
    expect(found).toBeTruthy();
  });
  return found;
};
const pay = (user) => user.click(screen.getByRole('button', { name: /complete sale/i }));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

beforeEach(() => { vi.clearAllMocks(); });

describe('POS cart and cash', () => {
  it('adds products, totals them, and enforces enough cash', async () => {
    mockApi({ checkout: async () => ({ data: RECEIPT }) });
    const user = userEvent.setup();
    await startSale(user, '20');
    expect(screen.getByTestId('total')).toHaveTextContent('₱30.00');
    expect(screen.getByTestId('short')).toHaveTextContent('Short by ₱10.00');
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled();
    await user.clear(screen.getByLabelText(/cash received/i));
    await user.type(screen.getByLabelText(/cash received/i), '50');
    expect(screen.getByTestId('change')).toHaveTextContent('Change: ₱20.00');
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('out-of-stock products cannot be added, and stock caps the quantity', async () => {
    mockApi({ checkout: async () => ({ data: RECEIPT }) });
    const user = userEvent.setup();
    render(<POS />);
    expect(await tile('Sold Out Candy')).toBeDisabled();
    await user.click(await tile('Coke Mismo'));
    await user.click(await tile('Coke Mismo'));
    expect(screen.getByLabelText('Quantity of Coke Mismo')).toHaveValue('1');
    expect(screen.getByRole('alert')).toHaveTextContent('Only 1 of Coke Mismo in stock');
  });

  it('invalid cash text is flagged and blocks checkout', async () => {
    mockApi({ checkout: async () => ({ data: RECEIPT }) });
    const user = userEvent.setup();
    await startSale(user, '12.345');
    expect(screen.getByText(/enter a valid amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled();
  });
});

describe('POS checkout', () => {
  it('sends only ids, quantities, cash and a key; shows the SERVER receipt; next customer resets', async () => {
    mockApi({ checkout: async () => ({ data: RECEIPT }) });
    const user = userEvent.setup();
    await startSale(user);
    await pay(user);
    expect(await screen.findByText('Sale complete ✔')).toBeInTheDocument();
    expect(checkoutCalls).toHaveLength(1);
    const body = checkoutCalls[0];
    expect(Object.keys(body).sort()).toEqual(['cash_received_centavos', 'idempotency_key', 'items']);
    expect(body.items).toEqual([{ product_id: 'p1', qty: 2 }]);
    expect(body.cash_received_centavos).toBe(5000);
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByTestId('receipt')).toHaveTextContent('TXN-20261010-000042');
    expect(screen.getByTestId('receipt')).toHaveTextContent('Aling Nena Store');
    expect(screen.getByTestId('final-change')).toHaveTextContent('₱20.00');
    await user.click(screen.getByRole('button', { name: /next customer/i }));
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cash received/i)).toHaveValue('');
  });

  it('a double-click sends exactly one request', async () => {
    const d = deferred();
    mockApi({ checkout: () => d.promise });
    const user = userEvent.setup();
    await startSale(user);
    const btn = screen.getByRole('button', { name: /complete sale/i });
    await user.dblClick(btn);
    await user.click(btn);
    expect(checkoutCalls).toHaveLength(1);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    d.resolve({ data: RECEIPT });
    expect(await screen.findByText('Sale complete ✔')).toBeInTheDocument();
    expect(checkoutCalls).toHaveLength(1);
  });

  it('the cart cannot be edited while the sale is being saved', async () => {
    const d = deferred();
    mockApi({ checkout: () => d.promise });
    const user = userEvent.setup();
    await startSale(user);
    await pay(user);
    expect(screen.getByRole('button', { name: 'Increase Pancit Canton' })).toBeDisabled();
    expect(screen.getByLabelText(/cash received/i)).toBeDisabled();
    d.resolve({ data: RECEIPT });
    await screen.findByText('Sale complete ✔');
  });

  it('a refusal (not enough stock) keeps the cart, explains why, and the next attempt gets a NEW key', async () => {
    mockApi({
      checkout: async (_b, n) => { if (n === 1) throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Not enough stock for "Pancit Canton": 1 available, 2 requested.'); return { data: RECEIPT }; },
    });
    const user = userEvent.setup();
    await startSale(user);
    await pay(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough stock for "Pancit Canton"');
    expect(screen.getByLabelText('Quantity of Pancit Canton')).toHaveValue('2');
    await pay(user);
    await screen.findByText('Sale complete ✔');
    expect(checkoutCalls).toHaveLength(2);
    expect(checkoutCalls[1].idempotency_key).not.toBe(checkoutCalls[0].idempotency_key);
  });

  it.each([
    ['network failure', () => new ApiError(0, 'NETWORK', 'Cannot reach the server.')],
    ['server says outcome unknown', () => new ApiError(503, 'CHECKOUT_OUTCOME_UNKNOWN', 'We could not confirm.')],
    ['gateway timeout', () => new ApiError(504, 'ERROR', 'Something went wrong.')],
  ])('%s: no success is shown, the sale is locked, and "check if saved" finds the committed sale', async (_n, makeErr) => {
    mockApi({ checkout: async () => { throw makeErr(); }, status: async () => ({ committed: true, receipt: RECEIPT }) });
    const user = userEvent.setup();
    await startSale(user);
    await pay(user);
    expect(await screen.findByText(/could not confirm whether this sale was saved/i)).toBeInTheDocument();
    expect(screen.queryByText('Sale complete ✔')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete sale/i })).not.toBeInTheDocument();      // no fresh checkout possible
    expect(screen.getByRole('button', { name: 'Increase Pancit Canton' })).toBeDisabled();
    expect(screen.getByLabelText(/cash received/i)).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /check if it was saved/i }));
    expect(await screen.findByText('Sale complete ✔')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(`/api/checkout/${checkoutCalls[0].idempotency_key}`);
    expect(screen.getByTestId('receipt')).toHaveTextContent('TXN-20261010-000042');
    expect(checkoutCalls).toHaveLength(1);                                                         // never re-sent on its own
  });

  it('if it was NOT saved, "try again" re-sends the SAME key and the SAME payload', async () => {
    mockApi({
      checkout: async (_b, n) => { if (n === 1) throw new ApiError(0, 'NETWORK', 'Cannot reach the server.'); return { data: RECEIPT }; },
      status: async () => ({ committed: false, receipt: null }),
    });
    const user = userEvent.setup();
    await startSale(user);
    await pay(user);
    await user.click(await screen.findByRole('button', { name: /check if it was saved/i }));
    expect(await screen.findByText(/was NOT saved/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try this same sale again/i }));
    await screen.findByText('Sale complete ✔');
    expect(checkoutCalls).toHaveLength(2);
    expect(checkoutCalls[1]).toEqual(checkoutCalls[0]);
  });

  it('a rolled-back server failure (CHECKOUT_FAILED) is a definite failure, not "unknown"', async () => {
    mockApi({ checkout: async () => { throw new ApiError(500, 'CHECKOUT_FAILED', 'The sale could not be completed and nothing was saved.'); } });
    const user = userEvent.setup();
    await startSale(user);
    await pay(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('nothing was saved');
    expect(screen.queryByText(/could not confirm/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });
});

describe('barcode scanner flow', () => {
  it('Enter with an exact barcode adds that product and clears the search', async () => {
    mockApi({ checkout: async () => ({ data: RECEIPT }) });
    const user = userEvent.setup();
    render(<POS />);
    await tile('Pancit Canton');
    await user.type(screen.getByLabelText(/search products/i), '4800001{Enter}');
    await waitFor(() => expect(screen.getByLabelText('Quantity of Pancit Canton')).toHaveValue('1'));
    expect(screen.getByLabelText(/search products/i)).toHaveValue('');
  });
});
