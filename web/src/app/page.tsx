import Nav from '@/components/brand/Nav'
import HeaderBand from '@/components/brand/HeaderBand'
import CampaignCard from '@/components/campaign/CampaignCard'
import { getAllCampaigns } from '@/lib/campaigns'
import type { LedgerSnapshot } from '@/lib/types'

async function getRealState(stateFile: string): Promise<LedgerSnapshot | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/state?state=${stateFile}`, { cache: 'no-store' })
    const data = await res.json()
    return data.error ? null : data
  } catch {
    return null
  }
}

export default async function Marketplace() {
  const CAMPAIGNS = getAllCampaigns()
  const liveCampaigns = CAMPAIGNS.filter((c) => c.live)
  const stateFiles = [...new Set(liveCampaigns.map((c) => c.stateFile ?? 'state.json'))]
  const snapshots = await Promise.all(stateFiles.map((f) => getRealState(f)))
  const byStateFile = new Map(stateFiles.map((f, i) => [f, snapshots[i]]))

  return (
    <div className="min-h-screen">
      <HeaderBand variant="gradient" height={520}>
        <Nav />
        <div className="max-w-[1200px] mx-auto px-8 pt-40 pb-16">
          <p className="label text-white/70">Closed-ended vaults · XLS-65 / XLS-66 on XRP Devnet</p>
          <h1 className="display-xl text-white mt-4 max-w-3xl">
            fund <span className="bg-brand bg-clip-text text-transparent">the night.</span><br />get paid back.
          </h1>
          <p className="body-text text-white/80 mt-6 max-w-lg">
            Organisers post first-loss capital. The community lends the rest through auditable vaults.
            Everything settles on the XRP Ledger.
          </p>
          <div className="flex gap-4 mt-8 flex-wrap">
            <a href="#campaigns" className="bg-white text-bg rounded-full px-6 py-3.5 font-medium text-[15px]">
              Invest in a campaign
            </a>
            <a href="/campaign/new" className="border border-white/25 text-white rounded-full px-6 py-3.5 font-medium text-[15px]">
              Start a campaign
            </a>
          </div>
          <p className="mono text-white/60 mt-8 text-[12px]">
            Settled on the XRP Ledger · every transaction publicly verifiable
          </p>
        </div>
      </HeaderBand>

      <div id="campaigns" className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <h2 className="display">Open campaigns.</h2>
            <p className="body-text text-ink-muted mt-2">{CAMPAIGNS.length} vaults accepting deposits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAMPAIGNS.map((c) => {
            const live = c.live ? byStateFile.get(c.stateFile ?? 'state.json') : null
            const cover = live?.broker ? Number(live.broker.coverAvailable) : c.targetXrp * 0.167
            const deposits = live ? live.assetsTotal - (live.broker ? Number(live.broker.coverAvailable) : 0) : c.targetXrp * 0.55
            return <CampaignCard key={c.id} campaign={c} coverXrp={cover} depositsXrp={deposits} />
          })}
        </div>
      </div>
    </div>
  )
}
