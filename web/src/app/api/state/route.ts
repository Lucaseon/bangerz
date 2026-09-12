import { spawnSync } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = path.resolve(process.cwd(), '..')
// Built at runtime (not a literal) so Turbopack's production build doesn't try to
// resolve "read-state.mjs" as a bundled module — it's a child_process argument, not an import.
const SCRIPT = ['read-state', '.mjs'].join('')

// read-state.mjs opens a fresh WebSocket connection to Devnet every call (~3s). Every
// page (/, /campaign/[id], /dashboard, /positions) fetches this on every navigation,
// so clicking around the site was re-paying that 3s each time. A short cache makes
// navigation feel instant without showing meaningfully stale data (/console already
// polls this same endpoint every 5s, so 3s freshness is already the norm there).
const CACHE_MS = 3000
let cache: { data: unknown; at: number } | null = null

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return Response.json(cache.data)
  }

  const res = spawnSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    cache = { data, at: Date.now() }
    return Response.json(data)
  } catch {
    return Response.json({ error: 'read-state failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
