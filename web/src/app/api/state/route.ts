import { spawnSync } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = path.resolve(process.cwd(), '..')
// Built at runtime (not a literal) so Turbopack's production build doesn't try to
// resolve "read-state.mjs" as a bundled module — it's a child_process argument, not an import.
const SCRIPT = ['read-state', '.mjs'].join('')

export async function GET() {
  const res = spawnSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'read-state failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
