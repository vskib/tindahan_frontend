// Real page components -> real fetch -> real Express app -> real supabase-js -> real PostgREST -> real PostgreSQL.
// Only login is simulated (a fake token verifier), because that needs hosted Supabase Auth.
// Prerequisites: see backend/tests/api/harness.js (local Postgres with the migrated test database, PostgREST binary).
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/supabase.js', () => ({
  configError: null,
  supabase: { auth: { getSession: async () => ({ data: { session: globalThis.__session } }) } },
}));
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => globalThis.__auth }));

import { startInfra, makeApp, seedUser, uuid } from '../../../backend/tests/api/harness.js';
import { servicePool, mkProduct } from '../../../backend/tests/db/helpers.js';
import POS from '../pages/POS.jsx';
import Products from '../pages/Products.jsx';
import Inventory from '../pages/Inventory.jsx';
import Sales from '../pages/Sales.jsx';
import Dashboard from '../pages/Dashboard.jsx';

let infra, svc, server, owner, cashier;
const tag = 'IT' + uuid().slice(0, 5);
const loginAs = (id, role, name) => {
  globalThis.__session = { access_token: `test-${id}` };
  globalThis.__auth = { isOwner: role === 'owner', email: `${role}@test.local`, profile: { id, role, full_name: name, store_name: 'Test Tindahan' } };
};
const dbStock = async (id) => (await infra.sup.query('select stock_qty from public.products where id=$1', [id])).rows[0].stock_qty;
const tile = async (name) => {
  let f; await waitFor(() => { f = screen.getAllByRole('button').find((b) => b.classList.contains('product-tile') && b.textContent.startsWith(name)); expect(f).toBeTruthy(); });
  return f;
};

beforeAll(async () => {
  infra = await startInfra();
  const a = makeApp(infra);
  server = await new Promise((r) => { const s = a.app.listen(3917, '127.0.0.1', () => r(s)); });
  svc = servicePool();
  owner = await seedUser(infra.sup, 'owner', { name: 'Aling Nena' });
  cashier = await seedUser(infra.sup, 'cashier', { name: 'Juan Cashier' });
});
afterAll(async () => { server?.close(); await svc?.end(); await infra?.stop(); });

describe('end to end through the real backend', () => {
  let pid, txn;
  it('cashier: finds a product, takes cash, completes the sale, gets a receipt; the database agrees', async () => {
    pid = await mkProduct(svc, owner, { name: `${tag} Sardines`, price: 2575, cost: 1800, stock: 10 });
    loginAs(cashier, 'cashier', 'Juan Cashier');
    const user = userEvent.setup();
    render(<POS />);
    await user.type(screen.getByLabelText(/search products/i), `${tag} Sardines`);
    await user.click(await tile(`${tag} Sardines`));
    await user.click(await tile(`${tag} Sardines`));
    expect(screen.getByTestId('total')).toHaveTextContent('₱51.50');
    await user.type(screen.getByLabelText(/cash received/i), '100');
    expect(screen.getByTestId('change')).toHaveTextContent('₱48.50');
    await user.click(screen.getByRole('button', { name: /complete sale/i }));
    expect(await screen.findByText('Sale complete ✔')).toBeInTheDocument();
    const receipt = screen.getByTestId('receipt');
    txn = /TXN-\d{8}-\d{6}/.exec(receipt.textContent)[0];
    expect(receipt).toHaveTextContent('Test Tindahan');
    expect(receipt).toHaveTextContent(`${tag} Sardines`);
    expect(receipt).toHaveTextContent('2 × ₱25.75');
    expect(receipt).toHaveTextContent('Juan Cashier');
    expect(screen.getByTestId('final-change')).toHaveTextContent('₱48.50');
    expect(await dbStock(pid)).toBe(8);
    const sale = (await infra.sup.query('select total_centavos, cash_received_centavos, change_centavos from public.sales where txn_no=$1', [txn])).rows[0];
    expect(sale).toEqual({ total_centavos: '5150', cash_received_centavos: '10000', change_centavos: '4850' });
  });

  it('cashier: selling more than is in stock is refused with a clear message and changes nothing', async () => {
    loginAs(cashier, 'cashier', 'Juan Cashier');
    const user = userEvent.setup();
    render(<POS />);
    await user.type(screen.getByLabelText(/search products/i), `${tag} Sardines`);
    await user.click(await tile(`${tag} Sardines`));
    const qty = screen.getByLabelText(`Quantity of ${tag} Sardines`);
    await user.clear(qty); await user.type(qty, '8');
    // someone else buys 7 of the 8 meanwhile (directly through the database function)
    await svc.query('select public.checkout_sale($1,$2,$3::jsonb,$4)', [cashier, uuid(), JSON.stringify([{ product_id: pid, qty: 7 }]), 99999]);
    await user.type(screen.getByLabelText(/cash received/i), '500');
    await user.click(screen.getByRole('button', { name: /complete sale/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Not enough stock.*1 available, 8 requested/);
    expect(await dbStock(pid)).toBe(1);
  });

  it('cashier: sales history shows the sale and its receipt copy; products page has no cost column or admin buttons', async () => {
    loginAs(cashier, 'cashier', 'Juan Cashier');
    const user = userEvent.setup();
    const { unmount } = render(<MemoryRouter><Sales /></MemoryRouter>);
    expect(await screen.findByText(txn)).toBeInTheDocument();
    const row = screen.getByText(txn).closest('tr');
    expect(row).toHaveTextContent('₱51.50');
    expect(row).toHaveTextContent('₱100.00');
    expect(row).toHaveTextContent('₱48.50');
    expect(screen.queryByText('Daily sales')).not.toBeInTheDocument();         // owner-only
    await user.click(within(row).getByRole('button', { name: /view/i }));
    expect(await screen.findByText('Sale details')).toBeInTheDocument();
    expect((await screen.findAllByTestId('receipt')).at(-1)).toHaveTextContent('(copy)');
    unmount();
    render(<MemoryRouter><Products /></MemoryRouter>);
    await user.type(await screen.findByLabelText('Search products'), `${tag} Sardines`);
    expect(await screen.findByText(`${tag} Sardines`)).toBeInTheDocument();
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('owner: dashboard shows today\'s sales and the recent sale', async () => {
    loginAs(owner, 'owner', 'Aling Nena');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText("Today's sales")).toBeInTheDocument();
    expect(await screen.findByText(txn)).toBeInTheDocument();
    expect(screen.getByText('Transactions today')).toBeInTheDocument();
  });

  it('owner: adds a product through the form (pesos in, centavos stored), and a duplicate barcode is explained', async () => {
    loginAs(owner, 'owner', 'Aling Nena');
    const user = userEvent.setup();
    render(<MemoryRouter><Products /></MemoryRouter>);
    const add = async (name, barcode) => {
      await user.click(await screen.findByRole('button', { name: /add product/i }));
      await user.type(screen.getByLabelText('Product name'), name);
      await user.type(screen.getByLabelText(/barcode/i), barcode);
      await user.type(screen.getByLabelText(/selling price/i), '25.50');
      await user.type(screen.getByLabelText(/cost price/i), '18');
      await user.clear(screen.getByLabelText('Starting stock')); await user.type(screen.getByLabelText('Starting stock'), '12');
      await user.click(screen.getByRole('button', { name: 'Save' }));
    };
    await add(`${tag} Biscuit`, `${tag}-BC`);
    await waitFor(() => expect(screen.queryByText('Add product')).not.toBeInTheDocument());
    const row = (await infra.sup.query(`select p.price_centavos, p.stock_qty, c.cost_centavos from public.products p join public.product_costs c on c.product_id=p.id where p.name=$1`, [`${tag} Biscuit`])).rows[0];
    expect(row).toEqual({ price_centavos: '2550', stock_qty: 12, cost_centavos: '1800' });
    await add(`${tag} Biscuit 2`, `${tag}-bc`);                                // same barcode, different case
    expect(await screen.findByText(/already uses this barcode/i)).toBeInTheDocument();
    expect(screen.getByText('Add product')).toBeInTheDocument();               // form stays open for correction
  });

  it('owner: inventory adjustment goes through the audited path; negative stock is blocked in the form', async () => {
    loginAs(owner, 'owner', 'Aling Nena');
    const user = userEvent.setup();
    render(<MemoryRouter><Inventory /></MemoryRouter>);
    await user.type(await screen.findByLabelText('Search products'), `${tag} Sardines`);
    await user.click(await screen.findByRole('button', { name: /add \/ adjust stock/i }));
    expect(await screen.findByText(/Currently in stock/)).toHaveTextContent('1');
    await user.type(screen.getByLabelText('Quantity received'), '24');
    expect(screen.getByText(/Stock will change/).closest('.alert')).toHaveTextContent('from 1 to 25 (+24)');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await dbStock(pid)).toBe(25));
    const mv = (await infra.sup.query(`select delta, qty_after, reason from public.inventory_movements where product_id=$1 order by created_at desc limit 1`, [pid])).rows[0];
    expect(mv).toEqual({ delta: 24, qty_after: 25, reason: 'new_delivery' });

    await user.click(await screen.findByRole('button', { name: /add \/ adjust stock/i }));
    await user.selectOptions(screen.getByLabelText('Reason'), 'damaged');
    await user.type(screen.getByLabelText(/quantity damaged/i), '99');
    expect(await screen.findByText(/would make stock negative/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(await dbStock(pid)).toBe(25);
  });

  it('owner: sales history includes daily totals for the day', async () => {
    loginAs(owner, 'owner', 'Aling Nena');
    render(<MemoryRouter><Sales /></MemoryRouter>);
    expect(await screen.findByText('Daily sales')).toBeInTheDocument();
    expect(await screen.findByText(txn)).toBeInTheDocument();
  });
});
