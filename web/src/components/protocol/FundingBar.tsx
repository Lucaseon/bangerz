import Amount from '@/components/ui/Amount'
import { StatusChip } from '@/components/ui/Chip'
import { formatAmount } from '@/lib/format'

export default function FundingBar({
  coverXrp,
  depositsXrp,
  targetXrp,
  size = 'card',
}: {
  coverXrp: number
  depositsXrp: number
  targetXrp: number
  size?: 'card' | 'detail' | 'dash'
}) {
  const raised = coverXrp + depositsXrp
  const funded = raised >= targetXrp
  const coverPct = Math.min(100, (coverXrp / targetXrp) * 100)
  const depositsPct = Math.min(100 - coverPct, (depositsXrp / targetXrp) * 100)
  const remaining = Math.max(0, targetXrp - raised)
  const height = size === 'detail' ? 14 : size === 'dash' ? 12 : 8

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <Amount value={raised} size={size === 'detail' ? 'xl' : 'md'} />
        <span className="label">GOAL <span className="text-ink-muted normal-case ml-1">{formatAmount(targetXrp)} XRP</span></span>
      </div>
      <div className="rounded-full overflow-hidden flex bg-surface-raised" style={{ height }}>
        <div className="bg-secured" style={{ width: `${coverPct}%` }} />
        <div className="bg-community" style={{ width: `${depositsPct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <p className="text-[12px] text-ink-muted">
          <span className="inline-block w-2 h-2 rounded-full bg-secured mr-1.5" />{formatAmount(coverXrp)} XRP cover ·{' '}
          <span className="inline-block w-2 h-2 rounded-full bg-community mr-1.5" />{formatAmount(depositsXrp)} XRP lent
          {funded ? ' · fully funded' : ` · ${formatAmount(remaining)} XRP to go`}
        </p>
        {funded && <StatusChip label="100% FUNDED" color="ok" />}
      </div>
    </div>
  )
}
