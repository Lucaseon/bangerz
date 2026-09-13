import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { getCached, setCached } from '@/lib/stateCache'

const REPO_ROOT = path.resolve(process.cwd(), '..')
// Built at runtime (not a literal) so Turbopack's production build doesn't try to
// resolve "read-state.mjs" as a bundled module — it's a child_process argument, not an import.
const SCRIPT = ['read-state', '.mjs'].join('')

// Matches state.json, state2.json, state3.json, and any state-<slug>.json created by
// create-campaign.mjs. Never a bare passthrough — this is a query param that ends up
// in an env var passed to a spawned process, so it must be validated against a pattern,
// not just checked for existence.
const STATE_FILE_PATTERN = /^state(-[a-z0-9-]+|[0-9]*)\.json$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requested = searchParams.get('state') ?? 'state.json'
  const stateFile = STATE_FILE_PATTERN.test(requested) ? requested : 'state.json'

  const cached = getCached(stateFile)
  if (cached) {
    return Response.json(cached)
  }

  const res = spawnSync('node', [SCRIPT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, STATE_FILE: `./${stateFile}` },
  })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    setCached(stateFile, data)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'read-state failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
