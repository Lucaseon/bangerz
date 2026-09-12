export default function DisplayTitle({
  children,
  as = 'h2',
  size = 'display',
  className = '',
}: {
  children: React.ReactNode
  as?: 'h1' | 'h2'
  size?: 'display-xl' | 'display'
  className?: string
}) {
  const Tag = as
  return (
    <Tag className={`${size} ${className}`}>
      {children}.
    </Tag>
  )
}
