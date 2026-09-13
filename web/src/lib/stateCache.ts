// Shared, in-process cache for /api/state's ledger snapshots, keyed per state file.
// read-state.mjs opens a brand-new Devnet WebSocket connection on every invocation
// (~3s handshake), so a short TTL still repays that cost on any click more than a
// few seconds apart — which is most real navigation. A longer TTL fixes that, and
// every action route (deposit/loan/redeem/manage) calls invalidate() right after
// running, so the next read is never stale for the person who just took the action.
const TTL_MS = 20_000

interface CacheEntry {
  data: unknown
  at: number
}

const cache = new Map<string, CacheEntry>()

export function getCached(stateFile: string): unknown | null {
  const entry = cache.get(stateFile)
  if (entry && Date.now() - entry.at < TTL_MS) return entry.data
  return null
}

export function setCached(stateFile: string, data: unknown): void {
  cache.set(stateFile, { data, at: Date.now() })
}

export function invalidate(stateFile: string): void {
  cache.delete(stateFile)
}
