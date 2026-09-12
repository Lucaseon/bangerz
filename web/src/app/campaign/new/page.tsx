import Nav from '@/components/brand/Nav'
import HeaderBand from '@/components/brand/HeaderBand'
import DisplayTitle from '@/components/brand/DisplayTitle'
import Card from '@/components/ui/Card'

export default function NewCampaignPage() {
  return (
    <div className="min-h-screen">
      <HeaderBand variant="gradient" height={280}>
        <Nav />
      </HeaderBand>
      <div className="max-w-[720px] mx-auto px-8 -mt-16 relative pb-24">
        <DisplayTitle as="h1">Start a campaign</DisplayTitle>
        <Card className="mt-8">
          <p className="body-text">
            This MVP runs the Vanilla flavour of Track 2: campaigns are seeded directly on the
            ledger by <code className="mono">seed.mjs</code>, not through a self-serve wizard.
            A credential-gated creation flow belongs to the Loaded flavour, which this build
            doesn&apos;t implement.
          </p>
          <p className="body-text mt-4 text-ink-muted">
            To seed a new campaign for the demo: <code className="mono">node seed.mjs accounts &amp;&amp; node seed.mjs vault</code>.
          </p>
        </Card>
      </div>
    </div>
  )
}
