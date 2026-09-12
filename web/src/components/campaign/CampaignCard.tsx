import Link from 'next/link'
import Card from '@/components/ui/Card'
import FundingBar from '@/components/protocol/FundingBar'
import type { Campaign } from '@/lib/campaigns'

export default function CampaignCard({
  campaign,
  coverXrp,
  depositsXrp,
}: {
  campaign: Campaign
  coverXrp: number
  depositsXrp: number
}) {
  const date = new Date(campaign.eventDate)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Card className="flex flex-col gap-4 p-0 overflow-hidden">
      <div
        className="aspect-video"
        style={{ background: `linear-gradient(135deg, ${campaign.gradientFrom}, ${campaign.gradientTo})` }}
      />
      <div className="flex flex-col gap-4 p-6 pt-0">
        <div>
          <p className="text-[13px] text-ink-muted">{campaign.organiser}</p>
          <h3 className="h3 mt-1">{campaign.title}</h3>
          <p className="text-[13px] text-ink-muted mt-1">{campaign.venue}, {campaign.city}</p>
          <p className="text-[12px] text-ink-faint mt-1">{dateStr}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label">FIXED YIELD</div>
            <div className="amount mt-1" style={{ fontSize: 20 }}>{campaign.fixedYieldPct}%</div>
          </div>
          <div>
            <div className="label">TENOR / LOAN</div>
            <div className="amount mt-1" style={{ fontSize: 20 }}>{campaign.tenorDays} {campaign.tenorDays === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
        <FundingBar coverXrp={coverXrp} depositsXrp={depositsXrp} targetXrp={campaign.targetXrp} size="card" />
        <Link
          href={`/campaign/${campaign.id}`}
          className="text-center bg-white text-bg rounded-full py-3 font-medium text-[14px] hover:bg-white/90 transition-colors"
        >
          View the campaign
        </Link>
      </div>
    </Card>
  )
}
