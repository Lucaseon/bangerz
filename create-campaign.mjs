/**
 * Creates a brand-new campaign end to end: funds 4 fresh accounts, creates a real
 * closed-ended vault (VaultCreate + LoanBrokerSet + LoanBrokerCoverDeposit), and
 * registers the campaign's display metadata in campaigns.json for the web front.
 *
 * Reuses seed.mjs's accounts/vault steps via STATE_FILE, so the on-chain logic
 * (dates, cover, fees) stays in one place rather than being reimplemented here.
 *
 * Usage: node create-campaign.mjs '<json>'
 * JSON fields: title, organiser, venue, city, eventDate, fixedYieldPct, tenorDays,
 *              targetXrp, minLendXrp, gradientFrom, gradientTo, about, whatItFunds,
 *              whatLendersShouldKnow
 * Prints one JSON object to stdout: { id, ok, output } or { error }.
 */
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const CAMPAIGNS_FILE = './campaigns.json'

function slugify(title) {
  const base = title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'campaign'
  const existing = loadCampaigns()
  let id = base
  let n = 2
  while (existing.some((c) => c.id === id)) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

function loadCampaigns() {
  if (!fs.existsSync(CAMPAIGNS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveCampaigns(list) {
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(list, null, 2))
}

function run(step, stateFile) {
  return spawnSync('node', ['seed.mjs', step], {
    encoding: 'utf8',
    env: { ...process.env, STATE_FILE: `./${stateFile}` },
  })
}

async function main() {
  const input = JSON.parse(process.argv[2])
  const {
    title, organiser, venue, city, eventDate,
    fixedYieldPct, tenorDays, targetXrp, minLendXrp,
    gradientFrom, gradientTo, about, whatItFunds, whatLendersShouldKnow,
  } = input

  if (!title || !venue || !city || !eventDate) {
    console.log(JSON.stringify({ error: 'title, venue, city and eventDate are required' }))
    process.exit(1)
  }

  const id = slugify(title)
  const stateFile = `state-${id}.json`

  let output = ''

  const accountsRes = run('accounts', stateFile)
  output += accountsRes.stdout + accountsRes.stderr
  if (accountsRes.status !== 0) {
    console.log(JSON.stringify({ error: 'accounts step failed', output }))
    process.exit(1)
  }

  const vaultRes = run('vault', stateFile)
  output += vaultRes.stdout + vaultRes.stderr
  if (vaultRes.status !== 0) {
    console.log(JSON.stringify({ error: 'vault step failed', output }))
    process.exit(1)
  }

  const campaigns = loadCampaigns()
  campaigns.push({
    id,
    live: true,
    stateFile,
    title,
    organiser: organiser || 'Independent organiser',
    venue,
    city,
    eventDate,
    fixedYieldPct: Number(fixedYieldPct) || 10,
    tenorDays: Number(tenorDays) || 1,
    targetXrp: Number(targetXrp) || 120,
    minLendXrp: Number(minLendXrp) || 10,
    gradientFrom: gradientFrom || '#EE538A',
    gradientTo: gradientTo || '#A06FEA',
    about: about || `${title} at ${venue}, ${city}.`,
    whatItFunds: whatItFunds || 'Venue deposit and logistics.',
    whatLendersShouldKnow: whatLendersShouldKnow || 'This organiser has not run a campaign on bangerz before.',
    createdAt: new Date().toISOString(),
  })
  saveCampaigns(campaigns)

  console.log(JSON.stringify({ id, ok: true, output }))
}

main().catch((err) => {
  console.log(JSON.stringify({ error: err.message }))
  process.exit(1)
})
