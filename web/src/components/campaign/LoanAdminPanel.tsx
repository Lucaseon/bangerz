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
}: {
  campaignId: string
  phase: Phase
  fixedYieldPct: number
  loanAlreadyOriginated: boolean
}) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'submitting'>('idle')
  const [result, setResult] = useState<ActionResult | null>(null)

  const allowed = phase === 'investment' && !loanAlreadyOriginated

  async function originate() {
    setState('submitting')
    setResult(null)
    try {
      const res = await fetch('/api/loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaignId }),
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
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="h3">BANGERZ admin</h3>
        <p className="text-[13px] text-ink-muted mt-1">
          Originate this campaign&apos;s loan at {formatAmount(fixedYieldPct)}% fixed yield, the rate set when the campaign was created.
        </p>
      </div>

      {loanAlreadyOriginated ? (
        <Button variant="ghost" disabled className="w-full">Loan already originated</Button>
      ) : (
        <>
          <Button
            variant="primary"
            disabled={!allowed}
            state={state === 'submitting' ? 'submitting' : 'idle'}
            onClick={originate}
            className="w-full"
          >
            Originate the loan ({formatAmount(fixedYieldPct)}%)
          </Button>
          {!allowed && (
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

      {tx && <TxReceipt tx={tx} />}
      {rejection && <GuardrailCard rejection={rejection} attempted="Originate the loan" />}
    </Card>
  )
}
