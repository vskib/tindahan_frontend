import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const vitestCli = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const child = spawn(process.execPath, [vitestCli, 'run'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, INTEGRATION: '1' },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('Could not start Vitest:', error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
