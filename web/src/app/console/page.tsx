'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PhaseStrip from '@/components/protocol/PhaseStrip'
import PPSCard from '@/components/protocol/PPSCard'
import { TxReceipt } from '@/components/protocol/TxReceipt'
import { GuardrailCard } from '@/components/protocol/GuardrailCard'
import { truncateHash } from '@/lib/format'
import { txUrl } from '@/lib/explorer'
import type { ActionResult, LedgerSnapshot } from '@/lib/types'

const PHASE_CAPTION: Record<string, string> = {
  subscription: 'Deposits and withdrawals are open. No loan can be issued yet.',
  investment: 'The vault is closed. The loan is live and being serviced.',
  redemption: 'Withdrawals are open at the final price per share.',
}

const ATTEMPTED_LABEL: Record<string, string> = {
  'Deposit en Investment': 'Deposit during Investment',
  'Withdraw en Investment': 'Withdrawal during Investment',
  'LoanSet pendant Redemption': 'Issue a loan during Redemption',
  'LoanSet pendant Subscription': 'Issue a loan during Subscription',
}

export default function ConsolePage() {
  const [snapshot, setSnapshot] = useState<LedgerSnapshot | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ActionResult | null>(null)
  const basePps = useRef<number | null>(null)

  async function refresh() {
    const res = await fetch('/api/state', { cache: 'no-store' })
    const data: LedgerSnapshot = await res.json()
    if (data.error) return
    if (basePps.current === null && data.pps !== null) basePps.current = data.pps
    setSnapshot(data)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  async function runManage(action: 'impair' | 'default') {
    setBusy(action)
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data: ActionResult = await res.json()
      setLastResult(data)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  function exportLog() {
    if (!snapshot) return
    const blob = new Blob([JSON.stringify(snapshot.txs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bangerz-session-transactions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const repayReceipts = snapshot?.txs.filter((t) => t.label.startsWith('LoanPay #2') && t.code === 'tesSUCCESS') ?? []
  const redeemReceipts = snapshot?.txs.filter((t) => t.label.startsWith('VaultWithdraw') && t.code === 'tesSUCCESS') ?? []

  return (
    <div className="min-h-screen">
      <div className="w-full bg-header relative">
        <div className="max-w-[1200px] mx-auto px-8 pt-16 pb-24">
          <p className="label text-white/70">Developer and jury instrumentation</p>
          <h1 className="display text-white mt-2">Demo console.</h1>
          <p className="body-text text-white/80 mt-2 max-w-xl">
            Every flow in this product is triggered on-ledger. Nothing here is mocked.
          </p>
        </div>
        <div className="absolute inset-0 bg-fade pointer-events-none" />
      </div>

      {!snapshot && (
        <div className="max-w-[1200px] mx-auto px-8 -mt-12 relative body-text text-ink-muted">Reading the ledger…</div>
      )}

      {snapshot?.error === 'no-deployment' && (
        <div className="max-w-[1200px] mx-auto px-8 -mt-12 relative body-text text-ink-muted">
          No deployment found. Run the seed script to create the vault.
        </div>
      )}

      {snapshot && !snapshot.error && (
      <div className="max-w-[1200px] mx-auto px-8 -mt-12 relative pb-24 flex flex-col gap-8">
        <Card>
          <PhaseStrip phase={snapshot.phase} caption={PHASE_CAPTION[snapshot.phase]} />
        </Card>

        <PPSCard
          before={basePps.current}
          after={snapshot.pps}
          assetsTotal={snapshot.assetsTotal}
          sharesTotal={snapshot.sharesTotal}
        />

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="h3">Happy path lifecycle</h2>
            <p className="body-text text-ink-muted">
              Full lifecycle from loan settlement through ticket-revenue repayment to lender redemption.
              This vault&apos;s loan is already fully repaid and redeemed — the receipts below are the real,
              already-validated proof rather than a re-run.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Button variant="primary" disabled>Trigger full loan repayment</Button>
              <p className="label normal-case text-warn">This loan has already been fully repaid — see receipts below.</p>
              {repayReceipts.map((tx) => <TxReceipt key={tx.hash} tx={tx} />)}
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" disabled>Redeem vault shares</Button>
              <p className="label normal-case text-warn">Already redeemed by both lenders — see receipts below.</p>
              {redeemReceipts.map((tx) => <TxReceipt key={tx.hash} tx={tx} />)}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="h3">Failure path and cover waterfall</h2>
            <p className="body-text text-ink-muted">
              Adverse lifecycle: impairment, default declaration, and the broker cover absorbing the shortfall.
              This vault&apos;s first loan never received a payment — it is live and untouched, ready to demo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Button variant="destructive" onClick={() => runManage('impair')} state={busy === 'impair' ? 'submitting' : 'idle'}>
                Impair loan
              </Button>
              {lastResult?.step === 'impair' && lastResult.newTxs.map((tx) => <TxReceipt key={tx.hash} tx={tx} />)}
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="destructive" onClick={() => runManage('default')} state={busy === 'default' ? 'submitting' : 'idle'}>
                Default loan
              </Button>
              {lastResult?.step === 'default' && lastResult.newTxs.map((tx) => <TxReceipt key={tx.hash} tx={tx} />)}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="h3">Protocol guardrails</h2>
            <p className="body-text text-ink-muted">
              Phase rules are enforced by the ledger, not by this interface. These three were captured live,
              submitted anyway so the rejection is real. The Subscription/Investment windows for this vault
              have since closed, so they are shown as the permanent, verifiable record rather than re-triggered.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {snapshot.rejections.map((r) => (
              <GuardrailCard key={r.label} rejection={r} attempted={ATTEMPTED_LABEL[r.label] ?? r.label} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="h3">Session transactions.</h2>
            <Button variant="outline" onClick={exportLog}>Export transaction log (.json)</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left label">
                  <th className="py-2 pr-4">TYPE</th>
                  <th className="py-2 pr-4">ENGINE RESULT</th>
                  <th className="py-2 pr-4">TIME</th>
                  <th className="py-2 pr-4">HASH</th>
                  <th className="py-2">EXPLORER</th>
                </tr>
              </thead>
              <tbody>
                {[...snapshot.txs].reverse().map((tx) => (
                  <tr key={tx.hash} className="border-t border-line">
                    <td className="py-2 pr-4">{tx.label}</td>
                    <td className="py-2 pr-4 mono">{tx.code}</td>
                    <td className="py-2 pr-4 text-ink-muted">{new Date(tx.at).toLocaleString()}</td>
                    <td className="py-2 pr-4 mono">{truncateHash(tx.hash)}</td>
                    <td className="py-2">
                      <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer" className="text-white underline">
                        view
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}
    </div>
  )
}
