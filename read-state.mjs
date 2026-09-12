/**
 * Read-only ledger snapshot for the web console. Never signs or submits anything.
 * Run from the repo root: node read-state.mjs
 * Prints one JSON object to stdout.
 */
import fs from 'node:fs'
import { Client, dropsToXrp, rippleTimeToUnixTime } from 'xrpl'

const NETWORK = 'wss://s.devnet.rippletest.net:51233/'
const STATE_FILE = process.env.STATE_FILE ?? './state.json'

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
}

function currentPhase(phases) {
  if (!phases) return 'unknown'
  const now = new Date()
  if (now < new Date(phases.subscriptionEnds)) return 'subscription'
  if (now < new Date(phases.redemptionStarts)) return 'investment'
  return 'redemption'
}

async function readLoan(client, loanId) {
  if (!loanId) return null
  try {
    const res = await client.request({ command: 'ledger_entry', index: loanId, ledger_index: 'validated' })
    const node = res.result.node
    return {
      principalOutstanding: node.PrincipalOutstanding ? dropsToXrp(node.PrincipalOutstanding) : '0',
      totalValueOutstanding: node.TotalValueOutstanding ? dropsToXrp(node.TotalValueOutstanding) : '0',
      paymentRemaining: node.PaymentRemaining ?? 0,
      nextPaymentDueDate: node.NextPaymentDueDate
        ? new Date(rippleTimeToUnixTime(node.NextPaymentDueDate)).toISOString()
        : null,
      settled: node.PaymentRemaining === undefined,
    }
  } catch {
    return null
  }
}

async function readShareBalance(client, mptIssuanceId, account) {
  if (!mptIssuanceId) return '0'
  try {
    const res = await client.request({
      command: 'ledger_entry',
      mptoken: { mpt_issuance_id: mptIssuanceId, account },
      ledger_index: 'validated',
    })
    return res.result.node.MPTAmount ?? '0'
  } catch {
    return '0'
  }
}

async function main() {
  const state = loadState()
  if (!state?.vaultId) {
    console.log(JSON.stringify({ error: 'no-deployment' }))
    return
  }

  const client = new Client(NETWORK)
  await client.connect()
  try {
    const vaultRes = await client.request({ command: 'ledger_entry', vault: state.vaultId, ledger_index: 'validated' })
    const vault = vaultRes.result.node

    let broker = null
    if (state.loanBrokerId) {
      const brokerRes = await client.request({ command: 'ledger_entry', index: state.loanBrokerId, ledger_index: 'validated' })
      const node = brokerRes.result.node
      broker = {
        debtTotal: node.DebtTotal ? dropsToXrp(node.DebtTotal) : '0',
        coverAvailable: dropsToXrp(node.CoverAvailable),
        coverRateMinimum: node.CoverRateMinimum,
      }
    }

    let sharesTotal = null
    if (vault.ShareMPTID) {
      try {
        const r = await client.request({ command: 'ledger_entry', mpt_issuance: vault.ShareMPTID, ledger_index: 'validated' })
        sharesTotal = r.result.node.OutstandingAmount
      } catch {
        sharesTotal = null
      }
    }

    const pps = sharesTotal && Number(sharesTotal) > 0
      ? Number(vault.AssetsTotal) / Number(sharesTotal)
      : 1

    const lenders = []
    for (const role of ['lender1', 'lender2']) {
      const addr = state.wallets?.[role]?.address
      if (!addr) continue
      const shares = await readShareBalance(client, vault.ShareMPTID, addr)
      lenders.push({
        role,
        address: addr,
        shares: dropsToXrp(shares),
        currentValue: (Number(shares) * pps / 1_000_000).toFixed(6),
      })
    }

    const view = {
      network: NETWORK,
      explorer: 'https://devnet.xrpl.org',
      vaultId: state.vaultId,
      phase: currentPhase(state.phases),
      phases: state.phases,
      assetsTotal: dropsToXrp(vault.AssetsTotal ?? '0'),
      assetsAvailable: dropsToXrp(vault.AssetsAvailable ?? '0'),
      shareMptId: vault.ShareMPTID,
      sharesTotal: sharesTotal ? dropsToXrp(sharesTotal) : null,
      pps: sharesTotal && Number(sharesTotal) > 0 ? pps : null,
      broker,
      brokerAddress: state.wallets?.broker?.address ?? null,
      borrowerAddress: state.wallets?.borrower?.address ?? null,
      lenders,
      loan: await readLoan(client, state.loanId),
      loanId: state.loanId ?? null,
      loanId2: state.loanId2 ?? null,
      txs: (state.txs ?? []).slice(-30),
      rejections: state.rejections ?? [],
    }
    console.log(JSON.stringify(view))
  } finally {
    await client.disconnect()
  }
}

main().catch((err) => {
  console.log(JSON.stringify({ error: err.message }))
  process.exit(1)
})
