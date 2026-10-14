import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectPath = fileURLToPath(new URL('.', import.meta.url))
const isWslMountedProject = process.platform === 'linux' && /^\/mnt\/[a-z]\//i.test(projectPath)
const projectId = createHash('sha256').update(projectPath).digest('hex').slice(0, 16)

// https://vitejs.dev/config/
export default defineConfig({
  // Linux dependency caches stay off Windows mounts. WSL 1 dev uses Windows
  // Node via scripts/dev.mjs, where Vite's Windows rename handling applies.
  cacheDir: isWslMountedProject
    ? join(tmpdir(), `counselor-vite-${projectId}-vite7`)
    : 'node_modules/.vite',
  plugins: [react()],
  server: {
    fs: { allow: [projectPath, fileURLToPath(new URL('../shared', import.meta.url))] },
    port: 4000,
    strictPort: true
  }
})
