import { formatAmount } from '@/lib/format'

export default function Amount({
  value,
  unit = 'XRP',
  size = 'md',
}: {
  value: number | string
  unit?: string
  size?: 'xl' | 'md'
}) {
  return (
    <span className={size === 'xl' ? 'amount-xl' : 'amount'}>
      {formatAmount(value)}
      <span className="text-ink-muted text-[0.6em] font-normal ml-1">{unit}</span>
    </span>
  )
}
