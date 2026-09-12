import Nav from '@/components/brand/Nav'
import HeaderBand from '@/components/brand/HeaderBand'
import DisplayTitle from '@/components/brand/DisplayTitle'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Address } from '@/components/ui/Address'
import MetaRow from '@/components/account/MetaRow'
import { TxReceiptList } from '@/components/protocol/TxReceipt'
import { gate } from '@/lib/phase'
import { formatAmount } from '@/lib/format'
import type { LedgerSnapshot, Phase } from '@/lib/types'
import { CAMPAIGNS } from '@/lib/campaigns'

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

export default async function DashboardPage() {
  const live = await getRealState()
  const campaign = CAMPAIGNS.find((c) => c.live)!

  if (!live) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-[1200px] mx-auto px-8 pt-32 body-text text-ink-muted">
          No deployment found. Run the seed script to create the vault.
        </div>
      </div>
    )
  }

  const phase = live.phase as Phase
  const cover = live.broker ? Number(live.broker.coverAvailable) : 0
  const debt = live.broker ? Number(live.broker.debtTotal) : 0
  const deposits = live.assetsTotal - cover
  const drawdown = gate(phase, 'loanSet')
  const repay = gate(phase, 'repay')

  return (
    <div className="min-h-screen">
      <HeaderBand variant="gradient" height={280}>
        <Nav />
      </HeaderBand>
      <div className="max-w-[1200px] mx-auto px-8 -mt-16 relative pb-24 flex flex-col gap-10">
        <div>
          <DisplayTitle as="h1" size="display">Your campaign</DisplayTitle>
          <p className="body-text text-ink-muted mt-2">{campaign.title}</p>
          <div className="mt-2"><Address value={live.brokerAddress ?? ''} /></div>
        </div>

        <section>
          <DisplayTitle>Your loan</DisplayTitle>
          <div className="mt-6">
            <MetaRow
              items={[
                { label: 'YOUR COVER', value: <span>{formatAmount(cover)} <span className="text-ink-muted text-[0.5em]">XRP</span></span> },
                { label: 'COMMUNITY DEPOSITS', value: <span>{formatAmount(deposits)} <span className="text-ink-muted text-[0.5em]">XRP</span></span> },
                { label: 'OUTSTANDING BALANCE', value: <span>{formatAmount(debt)} <span className="text-ink-muted text-[0.5em]">XRP</span></span> },
                { label: 'RATE OFFERED', value: `${campaign.fixedYieldPct}%` },
              ]}
            />
          </div>
          <p className="text-[12.5px] text-ink-muted mt-4">Your first-loss capital, locked ahead of every lender.</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="h3">Draw down your funds</h3>
            <p className="body-text mt-2" style={{ fontSize: 13.5 }}>
              Move the borrowed capital to your operating wallet to pay the venue deposit, sound rental and crew advances.
            </p>
            <div className="mt-5"><Button variant="primary" disabled={!drawdown.allowed} className="w-full">Draw down {formatAmount(debt)} XRP</Button></div>
            {!drawdown.allowed && <p className="label normal-case text-warn mt-2">{drawdown.reason}</p>}
          </Card>
          <Card>
            <h3 className="h3">Repay from ticket revenue</h3>
            <p className="body-text mt-2" style={{ fontSize: 13.5 }}>
              Send principal back to the vault. Lenders can redeem immediately after.
            </p>
            <div className="mt-5"><Button variant="primary" disabled={!repay.allowed} className="w-full">Repay {formatAmount(debt)} XRP</Button></div>
            {!repay.allowed && <p className="label normal-case text-warn mt-2">{repay.reason}</p>}
          </Card>
        </div>

        <section>
          <DisplayTitle>Activity</DisplayTitle>
          <div className="mt-6"><TxReceiptList txs={live.txs} /></div>
        </section>
      </div>
    </div>
  )
}
