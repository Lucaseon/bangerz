import Card from '@/components/ui/Card'
import { whyString } from '@/lib/phase'
import type { RejectionRow } from '@/lib/types'
import { txUrl } from '@/lib/explorer'

export function GuardrailCard({ rejection, attempted }: { rejection: RejectionRow; attempted: string }) {
  const code = rejection.code ?? rejection.error
  return (
    <Card borderColor="bad" className="flex flex-col gap-3">
      <span className="h3 text-white">Rejected by the protocol</span>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-start">
        <dt className="label">ATTEMPTED</dt>
        <dd className="body-text">{attempted}</dd>
        <dt className="label">WHY</dt>
        <dd className="body-text">{whyString(rejection.code)}</dd>
        <dt className="label">ENGINE RESULT</dt>
        <dd className="mono">{code ?? 'unknown'}</dd>
      </dl>
      {rejection.hash && (
        <a href={txUrl(rejection.hash)} target="_blank" rel="noopener noreferrer" className="text-white underline text-sm w-fit">
          View on explorer
        </a>
      )}
      <p className="label normal-case text-ink-muted">
        This is the protocol enforcing its own rules. The transaction never touched the vault and no capital moved.
      </p>
    </Card>
  )
}
