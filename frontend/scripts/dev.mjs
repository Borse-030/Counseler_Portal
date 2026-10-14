import { spawn, execFileSync } from 'node:child_process';
import { existsSync, openSync, readSync, closeSync, mkdirSync, unlinkSync } from 'node:fs';
import { release } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const isWsl1 = process.platform === 'linux' && /microsoft/i.test(release()) && !/wsl2/i.test(release()) && /^\/mnt\/[a-z]\//i.test(root);
let runtime = process.execPath;
let cli = vite;
if (isWsl1) {
  const candidates = ['/mnt/c/Program Files/nodejs/node.exe', ...(process.env.PATH || '').split(delimiter).map(path => join(path, 'node.exe'))];
  runtime = candidates.find(path => existsSync(path));
  if (!runtime) throw new Error('WSL 1 needs Windows Node.js for Vite directory renames. Install Windows Node.js 22.12+ and run npm run dev again.');
  cli = execFileSync('wslpath', ['-w', vite], { encoding: 'utf8' }).trim();
  console.log('WSL 1 detected: running Vite with Windows Node.js.');
}
// WSL 1 also mishandles inherited Linux pipe handles in Windows Node. Bridge
// output through a regular file so Windows receives valid file handles.
let output, reader, timer, logPath;
let position = 0;
const drain = () => {
  const buffer = Buffer.alloc(16384);
  let count;
  while ((count = readSync(reader, buffer, 0, buffer.length, position)) > 0) {
    process.stdout.write(buffer.subarray(0, count)); position += count;
  }
};
if (isWsl1) {
  const directory = join(root, 'node_modules/.cache');
  mkdirSync(directory, { recursive: true });
  logPath = join(directory, `vite-wsl1-${process.pid}.log`);
  output = openSync(logPath, 'w'); reader = openSync(logPath, 'r');
  timer = setInterval(drain, 100);
}
const child = spawn(runtime, [cli, ...process.argv.slice(2)], { cwd: root, stdio: isWsl1 ? ['ignore', output, output] : 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('close', code => {
  if (isWsl1) { clearInterval(timer); drain(); closeSync(reader); closeSync(output); unlinkSync(logPath); }
  process.exitCode = code ?? 1;
});
