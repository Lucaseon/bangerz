export function formatAmount(value: number | string, decimals = 6): string {
  const n = typeof value === 'string' ? Number(value) : value
  const hasFraction = Math.abs(n % 1) > 1e-9
  return n.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? Math.min(decimals, 6) : 0,
    maximumFractionDigits: decimals,
  })
}

export function formatPct(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(decimals)}%`
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 16) return address
  return `${address.slice(0, 8)}…${address.slice(-4)}`
}

export function truncateHash(hash: string): string {
  if (!hash || hash.length < 16) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}
