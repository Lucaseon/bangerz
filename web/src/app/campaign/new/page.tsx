'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/brand/Nav'
import HeaderBand from '@/components/brand/HeaderBand'
import DisplayTitle from '@/components/brand/DisplayTitle'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const GRADIENTS = [
  { from: '#EE538A', to: '#A06FEA' },
  { from: '#A06FEA', to: '#DE54DD' },
  { from: '#DE54DD', to: '#EE538A' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    organiser: '',
    venue: '',
    city: '',
    eventDate: '',
    targetXrp: 120,
    minLendXrp: 10,
    fixedYieldPct: 10,
    tenorDays: 1,
    about: '',
    whatItFunds: '',
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setState('submitting')
    try {
      const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)]
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, gradientFrom: gradient.from, gradientTo: gradient.to }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setState('idle')
        return
      }
      router.push(`/campaign/${data.id}`)
    } catch {
      setError('Could not reach the ledger. Retrying.')
      setState('idle')
    }
  }

  return (
    <div className="min-h-screen">
      <HeaderBand variant="gradient" height={280}>
        <Nav />
      </HeaderBand>
      <div className="max-w-[720px] mx-auto px-8 -mt-16 relative pb-24">
        <DisplayTitle as="h1">Start a campaign</DisplayTitle>
        <p className="body-text text-ink-muted mt-3">
          This creates a real closed-ended vault on XRP Devnet: four funded accounts, a
          `VaultCreate`, a `LoanBrokerSet` and a `LoanBrokerCoverDeposit`. It takes about
          30 to 60 seconds.
        </p>

        <Card className="mt-8">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Campaign title" required>
                <input required value={form.title} onChange={(e) => set('title', e.target.value)}
                  className="input" placeholder="Midnight Radio Vol. 3" />
              </Field>
              <Field label="Organiser">
                <input value={form.organiser} onChange={(e) => set('organiser', e.target.value)}
                  className="input" placeholder="Your collective" />
              </Field>
              <Field label="Venue" required>
                <input required value={form.venue} onChange={(e) => set('venue', e.target.value)}
                  className="input" placeholder="Venue name" />
              </Field>
              <Field label="City" required>
                <input required value={form.city} onChange={(e) => set('city', e.target.value)}
                  className="input" placeholder="City" />
              </Field>
              <Field label="Event date" required>
                <input required type="date" value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)}
                  className="input" />
              </Field>
              <Field label="Fixed yield (%)">
                <input type="number" min={0} max={100} value={form.fixedYieldPct}
                  onChange={(e) => set('fixedYieldPct', Number(e.target.value))} className="input" />
              </Field>
              <Field label="Tenor (days)">
                <input type="number" min={1} value={form.tenorDays}
                  onChange={(e) => set('tenorDays', Number(e.target.value))} className="input" />
              </Field>
              <Field label="Target (XRP)">
                <input type="number" min={1} value={form.targetXrp}
                  onChange={(e) => set('targetXrp', Number(e.target.value))} className="input" />
              </Field>
              <Field label="Minimum lend (XRP)">
                <input type="number" min={1} value={form.minLendXrp}
                  onChange={(e) => set('minLendXrp', Number(e.target.value))} className="input" />
              </Field>
            </div>

            <Field label="About this night">
              <textarea value={form.about} onChange={(e) => set('about', e.target.value)}
                className="input min-h-[90px]" placeholder="What's the night about?" />
            </Field>
            <Field label="What the loan pays for">
              <input value={form.whatItFunds} onChange={(e) => set('whatItFunds', e.target.value)}
                className="input" placeholder="Venue deposit, sound rental…" />
            </Field>

            {error && <p className="label normal-case text-bad">{error}</p>}

            <Button variant="primary" state={state} className="w-full">
              Create the vault
            </Button>
          </form>
        </Card>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: var(--surface-inset);
          border: 1px solid var(--line);
          border-radius: var(--radius-input);
          padding: 12px 16px;
          color: var(--ink);
          font-family: var(--font-sans);
          font-size: 15px;
        }
        .input:focus { outline: 1px solid var(--violet); }
      `}</style>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}{required && <span className="text-due"> *</span>}</span>
      {children}
    </label>
  )
}
