import Nav from '@/components/brand/Nav'
import HeaderBand from '@/components/brand/HeaderBand'
import DisplayTitle from '@/components/brand/DisplayTitle'
import MetaRow from '@/components/account/MetaRow'
import PositionCard from '@/components/account/PositionCard'
import { formatAmount } from '@/lib/format'
import { CAMPAIGNS } from '@/lib/campaigns'
import type { LedgerSnapshot, Phase } from '@/lib/types'

async function getRealState(): Promise<LedgerSnapshot | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/state`, { cache: 'no-store' })
    const data = await res.json()
    return data.error ? null : data
  } catch {
    return null
  }
}

export default async function PositionsPage() {
  const live = await getRealState()
  const campaign = CAMPAIGNS.find((c) => c.live)!

  const positions = live?.lenders ?? []
  const phase = (live?.phase as Phase) ?? 'subscription'

  // Each lender's still-outstanding deposit backing their current shares
  // (their first 60 XRP round already redeemed and settled separately).
  const depositedPerPosition = campaign.minLendXrp

  const totalLent = positions.length * depositedPerPosition
  const totalCurrentValue = positions.reduce((sum, p) => sum + Number(p.currentValue), 0)
  const totalYield = totalCurrentValue - totalLent

  return (
    <div className="min-h-screen">
      <HeaderBand variant="gradient" height={280}>
        <Nav />
      </HeaderBand>
      <div className="max-w-[1200px] mx-auto px-8 -mt-16 relative pb-24 flex flex-col gap-10">
        <div>
          <DisplayTitle as="h1">Your positions</DisplayTitle>
          <p className="body-text text-ink-muted mt-2 max-w-lg">
            Track your vault shares, accrued yield, and redeem principal on maturity across XRP Ledger vaults.
          </p>
        </div>

        <MetaRow
          items={[
            { label: 'TOTAL LENT', value: `${formatAmount(totalLent)} XRP` },
            { label: 'CURRENT VALUE', value: `${formatAmount(totalCurrentValue, 2)} XRP` },
            { label: 'ACCRUED YIELD', value: <span className={totalYield >= 0 ? 'text-ok' : 'text-bad'}>{totalYield >= 0 ? '+' : ''}{formatAmount(totalYield, 4)} XRP</span> },
            { label: 'POSITIONS', value: positions.length },
          ]}
        />

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {positions.map((p) => (
              <PositionCard key={p.address} position={p} campaign={campaign} deposited={depositedPerPosition} phase={phase} />
            ))}
          </div>
          {positions.length === 0 && (
            <p className="body-text text-ink-muted">You haven&apos;t lent to a campaign yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}
