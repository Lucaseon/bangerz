'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { gate } from '@/lib/phase'
import { formatAmount } from '@/lib/format'
import type { Phase } from '@/lib/types'
import type { Campaign } from '@/lib/campaigns'

const QUICK_ADD = [50, 100, 150, 200, 250]

export default function LendPanel({ campaign, phase }: { campaign: Campaign; phase: Phase }) {
  const [amount, setAmount] = useState<number>(campaign.minLendXrp)
  const projectedYield = (amount * campaign.fixedYieldPct) / 100
  const totalPayout = amount + projectedYield
  const { allowed, reason } = gate(phase, 'deposit')

  const repaymentDate = new Date(campaign.eventDate)
  repaymentDate.setDate(repaymentDate.getDate() + campaign.tenorDays + 1)
  const repaymentStr = repaymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

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
        <Button variant="primary" disabled={!allowed} className="w-full">
          Lend {formatAmount(amount)} XRP
        </Button>
        {!allowed && <p className="label normal-case text-warn">{reason}</p>}
        <p className="label normal-case text-ink-muted">
          First-loss cover absorbs losses before yours. It does not remove your risk.
        </p>
      </div>
    </Card>
  )
}
