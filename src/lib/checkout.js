/**
 * Was the checkout outcome ambiguous (the sale MAY have been saved)?
 * Yes for: no response at all (status 0), server/gateway errors (5xx) other than the API's explicit
 * "CHECKOUT_FAILED" (which means the database rolled back and nothing was saved).
 * No for 4xx answers: the server looked at the request and refused it, so nothing was saved.
 */
export const isAmbiguous = (e) => e.status === 0 || (e.status >= 500 && e.code !== 'CHECKOUT_FAILED');
