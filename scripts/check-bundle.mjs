// Fails the build if the compiled website contains anything that looks like a server secret.
// Run automatically by `npm run build`. Usage: node scripts/check-bundle.mjs [dir]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'dist';
const problems = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// A secret you are using right now (never printed): pass it via the environment to also scan for the exact value.
const exact = [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.DATABASE_URL].filter((v) => v && v.length > 15);

for (const file of walk(dir)) {
  if (!/\.(js|mjs|css|html|map|json|txt)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g)) {   // any JWT
    try {
      const role = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString('utf8')).role;
      if (role === 'service_role') problems.push(`${file}: contains a service_role JWT`);
    } catch { /* not decodable: ignore */ }
  }
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) problems.push(`${file}: contains a Supabase secret key`);
  if (/postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`@]+@/.test(text)) problems.push(`${file}: contains a database connection string with a password`);
  for (const v of exact) if (text.includes(v)) problems.push(`${file}: contains the exact value of a server secret`);
}
if (problems.length) {
  console.error('SECRET FOUND IN BUILD OUTPUT. Do not deploy.\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`Bundle check passed: no server secrets found in ${dir}/`);
