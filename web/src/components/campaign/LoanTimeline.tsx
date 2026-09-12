import { StatusChip } from '@/components/ui/Chip'

type StepStatus = 'COMPLETED' | 'ACTIVE' | 'PENDING'

const STEPS: { title: string; body: string }[] = [
  { title: 'Cover deposited', body: "The organiser's first-loss capital is locked in the vault." },
  { title: 'Community subscription', body: 'Lenders deposit XRP and receive vault shares.' },
  { title: 'Loan issued', body: 'The loan is set by both parties and drawn down by the organiser.' },
  { title: 'Repayment', body: 'Ticket revenue repays principal. Interest enters the vault as it is paid back.' },
  { title: 'Redemption', body: 'Lenders withdraw at the final price per share.' },
]

function statusFor(index: number, loanSettled: boolean, phase: string): StepStatus {
  if (index === 0) return 'COMPLETED'
  if (index === 1) return phase === 'subscription' ? 'ACTIVE' : 'COMPLETED'
  if (index === 2) return phase === 'subscription' ? 'PENDING' : 'COMPLETED'
  if (index === 3) return loanSettled ? 'COMPLETED' : phase === 'investment' ? 'ACTIVE' : 'PENDING'
  return phase === 'redemption' ? (loanSettled ? 'COMPLETED' : 'ACTIVE') : 'PENDING'
}

const CHIP_COLOR = { COMPLETED: 'ok', ACTIVE: 'due', PENDING: 'ink-muted' } as const

export default function LoanTimeline({ loanSettled, phase }: { loanSettled: boolean; phase: string }) {
  return (
    <div className="flex flex-col gap-4">
      {STEPS.map((step, i) => {
        const status = statusFor(i, loanSettled, phase)
        return (
          <div key={step.title} className="flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'PENDING' ? 'bg-line' : 'bg-brand'}`} />
              {i < STEPS.length - 1 && <div className="w-px flex-1 bg-line mt-2" />}
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="h3" style={{ fontSize: 16 }}>{step.title}</span>
                <StatusChip label={status} color={CHIP_COLOR[status]} />
              </div>
              <p className="text-[13.5px] text-ink-muted mt-1">{step.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
