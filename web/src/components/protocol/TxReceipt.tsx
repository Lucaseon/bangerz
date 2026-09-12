import Card from '@/components/ui/Card'
import { Address } from '@/components/ui/Address'
import { StatusChip } from '@/components/ui/Chip'
import { txUrl } from '@/lib/explorer'
import type { TxRow } from '@/lib/types'

export function TxReceipt({ tx }: { tx: TxRow }) {
  const validated = tx.code === 'tesSUCCESS'
  return (
    <Card borderColor={validated ? 'ok' : 'bad'} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="h3">{tx.label}</span>
        <StatusChip label={validated ? 'VALIDATED' : 'REJECTED'} color={validated ? 'ok' : 'bad'} />
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="label">HASH</dt>
        <dd><Address value={tx.hash} hash /></dd>
        <dt className="label">ENGINE RESULT</dt>
        <dd className="mono">{tx.code}</dd>
      </dl>
      <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer" className="text-white underline text-sm w-fit">
        View on explorer
      </a>
    </Card>
  )
}

export function TxReceiptList({ txs }: { txs: TxRow[] }) {
  if (!txs.length) {
    return <p className="body-text text-ink-muted">No ledger activity in this session yet.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {[...txs].reverse().map((tx) => (
        <TxReceipt key={tx.hash} tx={tx} />
      ))}
    </div>
  )
}
