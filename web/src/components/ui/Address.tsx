'use client'

import { useState } from 'react'
import { truncateAddress, truncateHash } from '@/lib/format'

export function Address({ value, hash = false }: { value: string; hash?: boolean }) {
  const [copied, setCopied] = useState(false)
  const display = hash ? truncateHash(value) : truncateAddress(value)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <button onClick={copy} className="mono text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-2">
      {display}
      <span className="text-[10px] uppercase tracking-wide">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
