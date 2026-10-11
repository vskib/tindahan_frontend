import { describe, it, expect } from 'vitest';
import { pesos, parsePesos, centavosToInput } from './money.js';
import { addProduct, setQty, removeLine, cartTotal, cartCount, toCheckoutItems } from './cart.js';
import { isAmbiguous } from './checkout.js';
import { addDays } from './format.js';
import { navItemsFor } from '../components/Layout.jsx';

describe('money', () => {
  it('formats centavos as pesos', () => {
    expect(pesos(0)).toBe('₱0.00');
    expect(pesos(1050)).toBe('₱10.50');
    expect(pesos(123456789)).toBe('₱1,234,567.89');
  });
  it('parses clean peso amounts into integer centavos without float drift', () => {
    expect(parsePesos('50')).toBe(5000);
    expect(parsePesos('50.5')).toBe(5050);
    expect(parsePesos('1,234.50')).toBe(123450);
    expect(parsePesos('₱ 100')).toBe(10000);
    expect(parsePesos('0.07')).toBe(7);
    expect(parsePesos('19.99')).toBe(1999);       // 19.99 * 100 === 1998.9999999999998 in floating point
    expect(parsePesos('0')).toBe(0);
  });
  it('rejects anything that is not a clean amount', () => {
    for (const bad of ['', ' ', 'abc', '-5', '1e3', '12.345', '.5', '5.', '1.2.3', '5,5,5.5x', '999999999999', null, undefined, 12]) {
      expect(parsePesos(bad)).toBeNull();
    }
  });
  it('round-trips for input fields', () => { expect(parsePesos(centavosToInput(123450))).toBe(123450); });
});

describe('cart', () => {
  const p = (id, price, stock) => ({ id, name: id, price_centavos: price, stock_qty: stock });
  it('adds, merges and totals', () => {
    let c = addProduct([], p('a', 1500, 10));
    c = addProduct(c, p('a', 1500, 10));
    c = addProduct(c, p('b', 1050, 5));
    expect(c.map((l) => [l.product_id, l.qty])).toEqual([['a', 2], ['b', 1]]);
    expect(cartTotal(c)).toBe(4050);
    expect(cartCount(c)).toBe(3);
  });
  it('never exceeds known stock and ignores out-of-stock products', () => {
    let c = addProduct([], p('a', 100, 2));
    c = addProduct(c, p('a', 100, 2)); c = addProduct(c, p('a', 100, 2));
    expect(c[0].qty).toBe(2);
    expect(addProduct([], p('z', 100, 0))).toEqual([]);
    expect(setQty(c, 'a', 99)[0].qty).toBe(2);
  });
  it('quantity 0 or less removes the line; fractions are ignored', () => {
    const c = addProduct([], p('a', 100, 5));
    expect(setQty(c, 'a', 0)).toEqual([]);
    expect(setQty(c, 'a', -3)).toEqual([]);
    expect(setQty(c, 'a', 1.5)).toBe(c);
    expect(removeLine(c, 'a')).toEqual([]);
  });
  it('sends ids and quantities only: never prices or totals', () => {
    const c = addProduct([], p('a', 100, 5));
    expect(toCheckoutItems(c)).toEqual([{ product_id: 'a', qty: 1 }]);
  });
});

describe('isAmbiguous (was the sale possibly saved?)', () => {
  it('no response, gateway errors and unexpected 5xx are ambiguous', () => {
    for (const e of [{ status: 0, code: 'NETWORK' }, { status: 503, code: 'CHECKOUT_OUTCOME_UNKNOWN' }, { status: 502, code: 'ERROR' },
      { status: 504, code: 'ERROR' }, { status: 500, code: 'INTERNAL_ERROR' }]) expect(isAmbiguous(e)).toBe(true);
  });
  it('explicit refusals and rolled-back failures are definite', () => {
    for (const e of [{ status: 400, code: 'VALIDATION_ERROR' }, { status: 409, code: 'INSUFFICIENT_STOCK' }, { status: 422, code: 'INSUFFICIENT_CASH' },
      { status: 404, code: 'INVALID_PRODUCT' }, { status: 429, code: 'RATE_LIMITED' }, { status: 401, code: 'SESSION_EXPIRED' },
      { status: 500, code: 'CHECKOUT_FAILED' }]) expect(isAmbiguous(e)).toBe(false);
  });
});

describe('misc', () => {
  it('addDays crosses month boundaries', () => { expect(addDays('2026-03-01', -1)).toBe('2026-02-28'); expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); });
  it('cashiers do not get owner navigation', () => {
    const cashier = navItemsFor('cashier').map((n) => n.label);
    const owner = navItemsFor('owner').map((n) => n.label);
    expect(cashier).toEqual(['Sell (POS)', 'Products', 'Sales history', 'Account']);
    expect(owner).toEqual(expect.arrayContaining(['Dashboard', 'Inventory']));
  });
});
