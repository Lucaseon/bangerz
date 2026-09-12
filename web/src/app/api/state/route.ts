import { spawnSync } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = path.resolve(process.cwd(), '..')

export async function GET() {
  const res = spawnSync('node', ['read-state.mjs'], { cwd: REPO_ROOT, encoding: 'utf8' })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'read-state failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
