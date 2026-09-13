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

  const res = spawnSync('node', [SCRIPT, 'redeem-all'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, STATE_FILE: `./${stateFile}` },
  })
  const lastLine = res.stdout.trim().split('\n').pop() ?? '{}'
  try {
    const data = JSON.parse(lastLine)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'redemption failed', detail: res.stderr || res.stdout }, { status: 500 })
  }
}
