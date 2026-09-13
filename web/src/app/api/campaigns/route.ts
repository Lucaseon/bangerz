import { spawnSync } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = path.resolve(process.cwd(), '..')
const SCRIPT = ['create-campaign', '.mjs'].join('')

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.title || !body.venue || !body.city || !body.eventDate) {
    return Response.json({ error: 'title, venue, city and eventDate are required' }, { status: 400 })
  }

  // Creating a real vault is three real transactions (VaultCreate, LoanBrokerSet,
  // LoanBrokerCoverDeposit) plus funding 4 fresh faucet accounts, so this genuinely
  // takes tens of seconds — no cache, no shortcut, this is the real thing.
  const res = spawnSync('node', [SCRIPT, JSON.stringify(body)], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
  })

  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    if (data.error) {
      return Response.json(data, { status: 500 })
    }
    return Response.json(data)
  } catch {
    return Response.json({ error: 'campaign creation failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
