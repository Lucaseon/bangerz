import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { getCampaign } from '@/lib/campaigns'

const REPO_ROOT = path.resolve(process.cwd(), '..')
const SCRIPT = ['run-action', '.mjs'].join('')

export async function POST(request: Request) {
  const { id } = await request.json()
  const campaign = getCampaign(id)
  if (!campaign) {
    return Response.json({ error: 'campaign not found' }, { status: 404 })
  }

  const stateFile = campaign.stateFile ?? 'state.json'
  // Ledger InterestRate is in 1/10 basis point (1000 = 1%, 10000 = 10%), matching what
  // the campaign form collected as a plain percentage.
  const interestRate = Math.round(Number(campaign.fixedYieldPct) * 1000)

  const res = spawnSync('node', [SCRIPT, 'invest'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, STATE_FILE: `./${stateFile}`, LOAN_INTEREST_RATE: String(interestRate) },
  })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'loan origination failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
