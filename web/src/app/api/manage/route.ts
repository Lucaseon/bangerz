import { spawnSync } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = path.resolve(process.cwd(), '..')
const ALLOWED = new Set(['impair', 'default'])

export async function POST(request: Request) {
  const { action } = await request.json()
  if (!ALLOWED.has(action)) {
    return Response.json({ error: `action not allowed: ${action}` }, { status: 400 })
  }
  const res = spawnSync('node', ['run-action.mjs', action], { cwd: REPO_ROOT, encoding: 'utf8' })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'run-action failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
