type StatusColor = 'ok' | 'bad' | 'warn' | 'due' | 'community' | 'ink-muted'

const STYLE: Record<StatusColor, string> = {
  ok: 'bg-ok/12 text-ok',
  bad: 'bg-bad/12 text-bad',
  warn: 'bg-warn/12 text-warn',
  due: 'bg-due/12 text-due',
  community: 'bg-community/12 text-community',
  'ink-muted': 'bg-white/5 text-ink-muted',
}

export function StatusChip({ label, color }: { label: string; color: StatusColor }) {
  return (
    <span className={`chip-text inline-block px-3 py-1.5 rounded-full ${STYLE[color]}`}>
      {label}
    </span>
  )
}

export function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip-text px-4 py-2 rounded-full transition-colors ${
        active ? 'bg-brand text-white' : 'bg-surface-raised text-ink-muted border border-line'
      }`}
    >
      {label}
    </button>
  )
}
