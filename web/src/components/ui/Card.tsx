export default function Card({
  children,
  className = '',
  borderColor,
}: {
  children: React.ReactNode
  className?: string
  borderColor?: 'ok' | 'bad'
}) {
  const border =
    borderColor === 'ok' ? 'border-l-[3px] border-l-ok' :
    borderColor === 'bad' ? 'border-l-[3px] border-l-bad' :
    ''
  return (
    <div className={`bg-surface-raised border border-line rounded-card p-6 ${border} ${className}`}>
      {children}
    </div>
  )
}
