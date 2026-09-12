import type { Phase } from '@/lib/types'

const STEPS: { key: Phase; label: string }[] = [
  { key: 'subscription', label: 'Subscription' },
  { key: 'investment', label: 'Investment' },
  { key: 'redemption', label: 'Redemption' },
]

const ORDER: Phase[] = ['subscription', 'investment', 'redemption']

export default function PhaseStrip({ phase, caption }: { phase: Phase; caption?: string }) {
  const activeIndex = ORDER.indexOf(phase)
  return (
    <div>
      <div className="flex gap-2 h-10">
        {STEPS.map((step, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'upcoming'
          return (
            <div
              key={step.key}
              className={`flex-1 rounded-full flex items-center justify-center chip-text
                ${state === 'done' ? 'bg-line text-ink-faint' : ''}
                ${state === 'active' ? 'bg-brand text-white' : ''}
                ${state === 'upcoming' ? 'bg-surface-raised text-ink-muted' : ''}
              `}
            >
              {step.label}
            </div>
          )
        })}
      </div>
      {caption && <p className="label mt-2 text-due normal-case">{caption}</p>}
    </div>
  )
}
