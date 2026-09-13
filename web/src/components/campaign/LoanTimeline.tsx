import { StatusChip } from '@/components/ui/Chip'

type StepStatus = 'COMPLETED' | 'ACTIVE' | 'PENDING'

function buildSteps(eventDate?: string, tenorDays?: number): { title: string; body: string }[] {
  let repaymentBody = 'Ticket revenue repays principal. Interest enters the vault as it is paid back.'
  if (eventDate && tenorDays) {
    const deadline = new Date(eventDate)
    deadline.setDate(deadline.getDate() + tenorDays)
    const deadlineStr = deadline.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    repaymentBody = `Ticket revenue repays principal by ${deadlineStr}, ${tenorDays} day${tenorDays === 1 ? '' : 's'} after the event — giving the organiser time to collect the door before settling with lenders. Interest enters the vault as it is paid back.`
  }
  return [
    { title: 'Cover deposited', body: "The organiser's first-loss capital is locked in the vault." },
    { title: 'Community subscription', body: 'Lenders deposit XRP and receive vault shares.' },
    { title: 'Loan issued', body: 'The loan is set by both parties and drawn down by the organiser.' },
    { title: 'Repayment', body: repaymentBody },
    { title: 'Redemption', body: 'Lenders withdraw at the final price per share.' },
  ]
}

function statusFor(index: number, loanSettled: boolean, phase: string): StepStatus {
  if (index === 0) return 'COMPLETED'
  if (index === 1) return phase === 'subscription' ? 'ACTIVE' : 'COMPLETED'
  if (index === 2) return phase === 'subscription' ? 'PENDING' : 'COMPLETED'
  if (index === 3) return loanSettled ? 'COMPLETED' : phase === 'investment' ? 'ACTIVE' : 'PENDING'
  return phase === 'redemption' ? (loanSettled ? 'COMPLETED' : 'ACTIVE') : 'PENDING'
}

const CHIP_COLOR = { COMPLETED: 'ok', ACTIVE: 'due', PENDING: 'ink-muted' } as const

export default function LoanTimeline({
  loanSettled,
  phase,
  eventDate,
  tenorDays,
}: {
  loanSettled: boolean
  phase: string
  eventDate?: string
  tenorDays?: number
}) {
  const STEPS = buildSteps(eventDate, tenorDays)
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
