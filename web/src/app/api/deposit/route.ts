import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { invalidate } from '@/lib/stateCache'

const REPO_ROOT = path.resolve(process.cwd(), '..')
const SCRIPT = ['run-action', '.mjs'].join('')
const ALLOWED_ROLES = new Set(['lender1', 'lender2'])
// Matches state.json, state2.json, state3.json, and any state-<slug>.json created by
// create-campaign.mjs (slug is the same charset used by its own slugify()). Never a bare
// filename check, so this can't be used to spawn against an arbitrary path.
const STATE_FILE_PATTERN = /^state(-[a-z0-9-]+|[0-9]*)\.json$/

export async function POST(request: Request) {
  const { amountXrp, role, stateFile: requestedStateFile } = await request.json()
  const lendRole = ALLOWED_ROLES.has(role) ? role : 'lender1'
  const stateFile = STATE_FILE_PATTERN.test(requestedStateFile) ? requestedStateFile : 'state.json'
  const amount = Number(amountXrp)
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: 'amountXrp must be a positive number' }, { status: 400 })
  }

  const res = spawnSync('node', [SCRIPT, 'deposit-custom'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, LEND_ROLE: lendRole, LEND_AMOUNT_XRP: String(amount), STATE_FILE: `./${stateFile}` },
  })
  invalidate(stateFile)
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'deposit failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
