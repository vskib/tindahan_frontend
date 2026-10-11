// Pure cart helpers. Totals here are for DISPLAY only; the server recalculates every price and total.
export const addProduct = (cart, p) => {
  const i = cart.findIndex((l) => l.product_id === p.id);
  if (i >= 0) return setQty(cart, p.id, cart[i].qty + 1);
  if (p.stock_qty < 1) return cart;
  return [...cart, { product_id: p.id, name: p.name, price_centavos: p.price_centavos, qty: 1, stock: p.stock_qty }];
};

/** Sets a quantity, capped at known stock; 0 or less removes the line. */
export const setQty = (cart, id, qty) => {
  if (!Number.isInteger(qty)) return cart;
  if (qty <= 0) return removeLine(cart, id);
  return cart.map((l) => (l.product_id === id ? { ...l, qty: Math.min(qty, l.stock, 9999) } : l));
};
export const removeLine = (cart, id) => cart.filter((l) => l.product_id !== id);
export const cartTotal = (cart) => cart.reduce((sum, l) => sum + l.price_centavos * l.qty, 0);
export const cartCount = (cart) => cart.reduce((sum, l) => sum + l.qty, 0);
/** Exactly what is sent to the server: ids and quantities only. No prices, no totals. */
export const toCheckoutItems = (cart) => cart.map(({ product_id, qty }) => ({ product_id, qty }));
