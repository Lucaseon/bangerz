'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Address } from '@/components/ui/Address'
import { gate } from '@/lib/phase'
import { formatAmount } from '@/lib/format'
import { txUrl } from '@/lib/explorer'
import type { ActionResult, Phase } from '@/lib/types'
import type { Campaign } from '@/lib/campaigns'

const QUICK_ADD = [50, 100, 150, 200, 250]

export default function LendPanel({
  campaign,
  phase,
}: {
  campaign: Campaign
  phase: Phase
}) {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(campaign.minLendXrp)
  const [state, setState] = useState<'idle' | 'submitting'>('idle')
  const [result, setResult] = useState<ActionResult | null>(null)

  const projectedYield = (amount * campaign.fixedYieldPct) / 100
  const totalPayout = amount + projectedYield
  const { allowed, reason } = campaign.live
    ? gate(phase, 'deposit')
    : { allowed: false, reason: 'This is a demo campaign — no vault is deployed behind it yet.' }

  const repaymentDate = new Date(campaign.eventDate)
  repaymentDate.setDate(repaymentDate.getDate() + campaign.tenorDays + 1)
  const repaymentStr = repaymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  async function lend() {
    setState('submitting')
    setResult(null)
    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountXrp: amount, role: 'lender1', stateFile: campaign.stateFile ?? 'state.json' }),
      })
      const data: ActionResult = await res.json()
      setResult(data)
      router.refresh()
    } finally {
      setState('idle')
    }
  }

  const tx = result?.newTxs?.[0]
  const rejection = !tx && result?.newRejections?.[0]

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h3 className="h3">Back this bangerz</h3>
        <p className="text-[13px] text-ink-muted mt-1">
          FIXED YIELD: {campaign.fixedYieldPct}% · REPAYMENT ON {repaymentStr.toUpperCase()}
        </p>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="label text-due">Amount to lend</label>
          <span className="text-[12px] text-ink-muted">min {campaign.minLendXrp} XRP</span>
        </div>
        <div className="flex items-center gap-2 bg-surface-inset rounded-input px-4 py-3 border border-line">
          <input
            type="number"
            value={amount}
            min={campaign.minLendXrp}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-transparent flex-1 outline-none amount"
            style={{ fontSize: 24 }}
          />
          <span className="label">XRP</span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {QUICK_ADD.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(amount + v)}
              className="chip-text px-3 py-1.5 rounded-full bg-surface-raised border border-line text-ink-muted hover:text-ink"
            >
              +{v}
            </button>
          ))}
          <button
            onClick={() => setAmount(campaign.targetXrp)}
            className="chip-text px-3 py-1.5 rounded-full bg-surface-raised border border-line text-coral"
          >
            MAX
          </button>
        </div>
      </div>

      <div className="bg-surface-inset rounded-input p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between"><span className="label">PRINCIPAL</span><span className="mono">{formatAmount(amount)} XRP</span></div>
        <div className="flex justify-between"><span className="label">PROJECTED YIELD ({campaign.fixedYieldPct}%)</span><span className="mono text-ok">+{formatAmount(projectedYield, 2)} XRP</span></div>
        <div className="border-t border-line my-1" />
        <div className="flex justify-between items-baseline"><span className="label">TOTAL PAYOUT</span><span className="amount" style={{ fontSize: 20 }}>{formatAmount(totalPayout, 2)} XRP</span></div>
      </div>

      <p className="text-[12.5px] text-ink-muted flex items-start gap-2">
        <span className="text-secured">◈</span>
        First {campaign.targetXrp * 0.167 | 0} XRP covered by organiser
      </p>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          disabled={!allowed}
          state={state === 'submitting' ? 'submitting' : 'idle'}
          onClick={lend}
          className="w-full"
        >
          Lend {formatAmount(amount)} XRP
        </Button>
        {!allowed && <p className="label normal-case text-warn">{reason}</p>}
        <p className="label normal-case text-ink-muted">
          First-loss cover absorbs losses before yours. It does not remove your risk.
        </p>
      </div>

      {result && (
        <div className={`rounded-[12px] border-l-[3px] p-4 text-[13px] ${tx ? 'border-l-ok bg-surface' : 'border-l-bad bg-surface'}`}>
          <p className="font-medium">{tx ? 'Submitted to the ledger' : 'Rejected by the protocol'}</p>
          {(() => {
            const row = tx || rejection || null
            if (!row) return null
            return (
              <>
                <p className="mono text-ink-muted mt-1">{row.code}</p>
                {row.hash && (
                  <a href={txUrl(row.hash)} target="_blank" rel="noopener noreferrer" className="underline mt-1 inline-block">
                    View on explorer
                  </a>
                )}
              </>
            )
          })()}
          {result.output && !tx && !rejection && (
            <p className="mono text-ink-muted mt-1 whitespace-pre-wrap">{result.output.slice(0, 300)}</p>
          )}
        </div>
      )}
    </Card>
  )
}
