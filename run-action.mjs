/**
 * Runs one seed.mjs step and reports exactly the new tx/rejection rows it produced,
 * so the console can render a real TxReceipt or GuardrailCard from real ledger data.
 * Usage: node run-action.mjs <step>
 * Prints one JSON object to stdout: { step, code, output, newTxs, newRejections }
 */
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const STATE_FILE = process.env.STATE_FILE ?? './state.json'
const ALLOWED_STEPS = new Set([
  'pay', 'pay2', 'impair', 'default', 'redeem', 'reject-red', 'reject-inv', 'reject-sub',
  'deposit-custom', 'invest',
])

const step = process.argv[2]
if (!ALLOWED_STEPS.has(step)) {
  console.log(JSON.stringify({ error: `step not allowed: ${step}` }))
  process.exit(1)
}

function loadState() {
  return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}
}

const before = loadState()
const beforeTxCount = (before.txs ?? []).length
const beforeRejCount = (before.rejections ?? []).length

const res = spawnSync('node', ['seed.mjs', step], { encoding: 'utf8' })
const after = loadState()

const newTxs = (after.txs ?? []).slice(beforeTxCount)
const newRejections = (after.rejections ?? []).slice(beforeRejCount)

console.log(JSON.stringify({
  step,
  code: res.status,
  output: (res.stdout ?? '') + (res.stderr ?? ''),
  newTxs,
  newRejections,
}))
