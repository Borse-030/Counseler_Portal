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
  // Keep WSL's dependency cache off Windows mounts, where renames can fail.
  cacheDir: isWslMountedProject
    ? join(tmpdir(), `counselor-vite-${projectId}`)
    : 'node_modules/.vite',
  plugins: [react()],
  server: {
    port: 4000,
    strictPort: true
  }
})
