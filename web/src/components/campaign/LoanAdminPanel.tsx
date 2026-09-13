'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { TxReceipt } from '@/components/protocol/TxReceipt'
import { GuardrailCard } from '@/components/protocol/GuardrailCard'
import { formatAmount } from '@/lib/format'
import type { ActionResult, Phase } from '@/lib/types'

export default function LoanAdminPanel({
  campaignId,
  phase,
  fixedYieldPct,
  loanAlreadyOriginated,
  alreadyRedeemed,
}: {
  campaignId: string
  phase: Phase
  fixedYieldPct: number
  loanAlreadyOriginated: boolean
  alreadyRedeemed: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<'originate' | 'redeem' | null>(null)
  const [originateResult, setOriginateResult] = useState<ActionResult | null>(null)
  const [redeemResult, setRedeemResult] = useState<ActionResult | null>(null)

  const originateAllowed = phase === 'investment' && !loanAlreadyOriginated
  const redeemAllowed = phase === 'redemption' && !alreadyRedeemed

  async function run(endpoint: string, action: 'originate' | 'redeem') {
    setBusy(action)
    if (action === 'originate') setOriginateResult(null)
    else setRedeemResult(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaignId }),
      })
      const data: ActionResult = await res.json()
      if (action === 'originate') setOriginateResult(data)
      else setRedeemResult(data)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const originateTx = originateResult?.newTxs?.[0]
  const originateRejection = !originateTx && originateResult?.newRejections?.[0]

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h3 className="h3">BANGERZ admin</h3>
        <p className="text-[13px] text-ink-muted mt-1">
          Manage this campaign&apos;s vault and loan.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label">LOAN ORIGINATION</p>
        {loanAlreadyOriginated ? (
          <Button variant="ghost" disabled className="w-full">Loan already originated</Button>
        ) : (
          <>
            <Button
              variant="primary"
              disabled={!originateAllowed}
              state={busy === 'originate' ? 'submitting' : 'idle'}
              onClick={() => run('/api/loan', 'originate')}
              className="w-full"
            >
              Originate the loan ({formatAmount(fixedYieldPct)}%)
            </Button>
            {!originateAllowed && (
              <p className="label normal-case text-warn">
                {phase === 'subscription'
                  ? 'The loan can only be issued once subscription closes.'
                  : phase === 'redemption'
                    ? 'Redemption has opened. No new loan can be issued.'
                    : 'Not available in the current phase.'}
              </p>
            )}
          </>
        )}
        {originateTx && <TxReceipt tx={originateTx} />}
        {originateRejection && <GuardrailCard rejection={originateRejection} attempted="Originate the loan" />}
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-line">
        <p className="label">LENDER REPAYMENT</p>
        {alreadyRedeemed ? (
          <Button variant="ghost" disabled className="w-full">Lenders already repaid</Button>
        ) : (
          <>
            <Button
              variant="primary"
              disabled={!redeemAllowed}
              state={busy === 'redeem' ? 'submitting' : 'idle'}
              onClick={() => run('/api/redeem', 'redeem')}
              className="w-full"
            >
              Repay lenders (capital + yield)
            </Button>
            {!redeemAllowed && (
              <p className="label normal-case text-warn">
                {phase === 'subscription' || phase === 'investment'
                  ? "Redemption hasn't opened yet."
                  : 'Not available in the current phase.'}
              </p>
            )}
          </>
        )}
        {redeemResult?.newTxs?.map((tx) => <TxReceipt key={tx.hash} tx={tx} />)}
        {redeemResult?.newRejections?.map((r, i) => (
          <GuardrailCard key={i} rejection={r} attempted="Repay lenders" />
        ))}
      </div>
    </Card>
  )
}
