import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Anything named VITE_* is copied into the browser bundle and is PUBLIC.
// Refuse to build if something that looks like a secret ended up in one.
function assertNoSecretsInBrowserEnv(env) {
  const problems = [];
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_')) continue;
    if (/service|secret|private|password|database_url|db_url/i.test(key)) problems.push(`${key}: name looks like a secret`);
    if (/^sb_secret_/.test(value)) problems.push(`${key}: value is a Supabase secret key`);
    const parts = value.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload.role === 'service_role') problems.push(`${key}: value is a service_role JWT`);
      } catch { /* not a JWT */ }
    }
  }
  if (problems.length) {
    throw new Error('Refusing to build: secrets must never be exposed to the browser.\n  - ' + problems.join('\n  - '));
  }
}

export default defineConfig(({ mode }) => {
  assertNoSecretsInBrowserEnv(loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react()],
    build: { sourcemap: false, chunkSizeWarningLimit: 600 },
    // `npm run test:integration` (INTEGRATION=1) runs the real pages against the real backend + database.
    test: process.env.INTEGRATION
      ? { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js', css: false, include: ['src/integration/**/*.test.jsx'],
          testTimeout: 30000, hookTimeout: 60000, fileParallelism: false, env: { VITE_API_URL: 'http://127.0.0.1:3917' } }
      : { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js', css: false, include: ['src/**/*.test.{js,jsx}'], exclude: ['src/integration/**', '**/node_modules/**'] },
  };
});
