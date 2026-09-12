import { notFound } from 'next/navigation'
import Nav from '@/components/brand/Nav'
import HeaderBand from '@/components/brand/HeaderBand'
import DisplayTitle from '@/components/brand/DisplayTitle'
import Card from '@/components/ui/Card'
import PhaseStrip from '@/components/protocol/PhaseStrip'
import FundingBar from '@/components/protocol/FundingBar'
import { TxReceiptList } from '@/components/protocol/TxReceipt'
import LendPanel from '@/components/campaign/LendPanel'
import LoanTimeline from '@/components/campaign/LoanTimeline'
import { getCampaign } from '@/lib/campaigns'
import type { LedgerSnapshot, Phase } from '@/lib/types'

const PHASE_CAPTION: Record<string, string> = {
  subscription: 'Deposits and withdrawals are open. No loan can be issued yet.',
  investment: 'The vault is closed. The loan is live and being serviced.',
  redemption: 'Withdrawals are open at the final price per share.',
}

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

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = getCampaign(id)
  if (!campaign) notFound()

  const live = campaign.live ? await getRealState() : null
  const phase: Phase = (live?.phase as Phase) ?? 'subscription'
  const coverXrp = live?.broker ? Number(live.broker.coverAvailable) : campaign.targetXrp * 0.167
  const depositsXrp = live ? live.assetsTotal - (live.broker ? Number(live.broker.coverAvailable) : 0) : campaign.targetXrp * 0.55
  const loanSettled = live?.loan?.settled ?? false

  const date = new Date(campaign.eventDate)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen">
      <HeaderBand variant="photo" gradientFrom={campaign.gradientFrom} gradientTo={campaign.gradientTo} height={320}>
        <Nav />
        <div className="max-w-[1200px] mx-auto px-8 pt-40 pb-10">
          <p className="text-[13px] text-white/70">all campaigns &rsaquo; {campaign.title}</p>
          <h1 className="display text-white mt-3">{campaign.title}</h1>
          <p className="mono text-white/70 mt-3 text-[13px]">{campaign.venue}, {campaign.city} · {dateStr}</p>
        </div>
      </HeaderBand>

      <div className="max-w-[1200px] mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        <div className="flex flex-col gap-10">
          <PhaseStrip phase={phase} caption={PHASE_CAPTION[phase]} />

          <section>
            <DisplayTitle>Campaign funding</DisplayTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 my-6">
              <div><div className="label">RAISED TILL NOW</div><div className="amount mt-1" style={{ fontSize: 22 }}>{(coverXrp + depositsXrp).toFixed(0)} XRP</div></div>
              <div><div className="label">GOAL</div><div className="amount mt-1" style={{ fontSize: 22 }}>{campaign.targetXrp} XRP</div></div>
              <div><div className="label">FIXED YIELD</div><div className="amount mt-1" style={{ fontSize: 22 }}>{campaign.fixedYieldPct}%</div></div>
              <div><div className="label">TENOR / LOAN</div><div className="amount mt-1" style={{ fontSize: 22 }}>{campaign.tenorDays}d</div></div>
            </div>
            <Card>
              <FundingBar coverXrp={coverXrp} depositsXrp={depositsXrp} targetXrp={campaign.targetXrp} size="detail" />
              <p className="text-[12.5px] text-ink-muted mt-4">Cover is the organiser&apos;s own capital, deposited before the community&apos;s.</p>
            </Card>
          </section>

          <section>
            <DisplayTitle>About this night</DisplayTitle>
            <p className="body-text mt-4">{campaign.about}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div><h3 className="h3" style={{ fontSize: 16 }}>What the loan pays for</h3><p className="body-text mt-2">{campaign.whatItFunds}</p></div>
              <div><h3 className="h3" style={{ fontSize: 16 }}>What lenders should know</h3><p className="body-text mt-2">{campaign.whatLendersShouldKnow}</p></div>
            </div>
          </section>

          <section>
            <DisplayTitle>Loan lifecycle</DisplayTitle>
            <div className="mt-6"><LoanTimeline loanSettled={loanSettled} phase={phase} /></div>
          </section>

          <section>
            <DisplayTitle>Activity</DisplayTitle>
            <div className="mt-6">
              {live ? <TxReceiptList txs={live.txs} /> : <p className="body-text text-ink-muted">No ledger activity in this session yet.</p>}
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <LendPanel campaign={campaign} phase={phase} />
        </div>
      </div>
    </div>
  )
}
