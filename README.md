# Che’s Tindahan frontend

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL, the Supabase **anon/public** key, and the API URL.
3. Start the backend from `../tindahan_backend` so it is available at the API URL. The default local API URL is `http://localhost:3000`.
4. Run `npm ci`, then `npm run dev` in this folder.

The Supabase service role key belongs only in the backend environment. Never put it in a `VITE_*` variable; Vite includes those values in the browser build.

## Store roles

The owner manages products, stock, staff accounts, and store-wide reporting. Cashiers can sell, browse active products, and review summaries and history for their own sales. Create cashier accounts from **Account → Staff accounts** after the owner account is configured.

## Printing and scanning

Use a secure HTTPS address for camera scanning outside localhost. Printing uses the browser’s print dialog, so select the connected receipt printer there.

## Tests

`npm test` runs the frontend unit tests. `npm run test:integration` uses the backend test harness and requires its local PostgreSQL and PostgREST setup.
