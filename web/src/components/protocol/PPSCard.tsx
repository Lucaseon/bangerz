import Card from '@/components/ui/Card'
import { formatAmount, formatPct } from '@/lib/format'

export default function PPSCard({
  before,
  after,
  assetsTotal,
  sharesTotal,
}: {
  before: number | null
  after: number | null
  assetsTotal: number
  sharesTotal: number | null
}) {
  const delta = before && after ? (after - before) / before : null
  return (
    <Card className="flex flex-col gap-4">
      <span className="h3">Price per share</span>
      <div className="flex items-center gap-4">
        <span className="amount-xl">{before ? before.toFixed(4) : '—'}</span>
        <span className="text-ink-muted text-2xl">→</span>
        <span className="amount-xl">{after ? after.toFixed(4) : '—'}</span>
        {delta !== null && (
          <span className="amount text-ok">{formatPct(delta)}</span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="label">ASSETS TOTAL</dt>
        <dd className="mono">{formatAmount(assetsTotal)} XRP</dd>
        <dt className="label">SHARES TOTAL</dt>
        <dd className="mono">{sharesTotal ? formatAmount(sharesTotal) : '—'} MPT</dd>
        <dt className="label">PRICE PER SHARE</dt>
        <dd className="mono">{after ? after.toFixed(6) : '—'}</dd>
      </dl>
      <p className="label normal-case text-ink-muted">
        Interest enters the vault when the loan is repaid: the price per share rises and no new shares are issued.
      </p>
    </Card>
  )
}
