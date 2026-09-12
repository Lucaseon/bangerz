import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Address } from '@/components/ui/Address'
import { StatusChip } from '@/components/ui/Chip'
import { formatAmount } from '@/lib/format'
import { gate } from '@/lib/phase'
import type { LenderPosition, Phase } from '@/lib/types'
import type { Campaign } from '@/lib/campaigns'

export default function PositionCard({
  position,
  campaign,
  deposited,
  phase,
}: {
  position: LenderPosition
  campaign: Campaign
  deposited: number
  phase: Phase
}) {
  const currentValue = Number(position.currentValue)
  const yieldXrp = currentValue - deposited
  const settled = position.shares < 0.001
  const { allowed, reason } = gate(phase, 'redeem')

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="h3" style={{ fontSize: 17 }}>{campaign.title}</h3>
          <div className="mt-1"><Address value={position.address} /></div>
        </div>
        <StatusChip
          label={settled ? 'SETTLED' : allowed ? 'READY TO REDEEM' : 'EARNING'}
          color={settled ? 'ink-muted' : allowed ? 'ok' : 'community'}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><div className="label">VAULT SHARES</div><div className="mono mt-1">{formatAmount(position.shares, 2)}</div></div>
        <div><div className="label">DEPOSITED</div><div className="mono mt-1">{formatAmount(deposited)} XRP</div></div>
        <div><div className="label">CURRENT VALUE</div><div className="mono mt-1">{formatAmount(currentValue, 4)} XRP</div></div>
        <div>
          <div className="label">YIELD</div>
          <div className={`mono mt-1 ${yieldXrp >= 0 ? 'text-ok' : 'text-bad'}`}>
            {yieldXrp >= 0 ? '+' : ''}{formatAmount(yieldXrp, 4)} XRP
          </div>
        </div>
      </div>
      <p className="text-[12.5px] text-ink-muted">
        {formatAmount(campaign.targetXrp * 0.167 | 0)} XRP organiser cover locked ahead of your position
      </p>
      {settled ? (
        <Button variant="ghost" disabled className="w-full">Settled and redeemed</Button>
      ) : (
        <>
          <Button variant="primary" disabled={!allowed} className="w-full">Redeem {formatAmount(currentValue, 2)} XRP</Button>
          {!allowed && <p className="label normal-case text-warn">{reason}</p>}
        </>
      )}
    </Card>
  )
}
