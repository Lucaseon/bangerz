export default function HeaderBand({
  variant = 'gradient',
  gradientFrom,
  gradientTo,
  height = 360,
  children,
}: {
  variant?: 'gradient' | 'photo'
  gradientFrom?: string
  gradientTo?: string
  height?: number
  children?: React.ReactNode
}) {
  const background =
    variant === 'photo' && gradientFrom && gradientTo
      ? `linear-gradient(120deg, ${gradientFrom}55 0%, ${gradientTo}55 100%), var(--surface)`
      : undefined

  return (
    <div
      className={`w-full relative ${variant === 'gradient' && !background ? 'bg-header' : ''}`}
      style={{ minHeight: height, background }}
    >
      <div className="relative z-10">{children}</div>
      <div className="absolute inset-0 bg-fade pointer-events-none" />
    </div>
  )
}
