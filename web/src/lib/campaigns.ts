export interface Campaign {
  id: string
  live: boolean // true: pulls real ledger data via /api/state. false: static seed, fills the grid.
  title: string
  organiser: string
  venue: string
  city: string
  eventDate: string
  fixedYieldPct: number
  tenorDays: number
  targetXrp: number
  minLendXrp: number
  gradientFrom: string
  gradientTo: string
  about: string
  whatItFunds: string
  whatLendersShouldKnow: string
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'after-oclock',
    live: true,
    title: "After O'clock x La Plage Open Air",
    organiser: 'BANGERZ',
    venue: 'Glazart',
    city: 'Paris',
    eventDate: '2026-09-13',
    fixedYieldPct: 10,
    tenorDays: 1,
    targetXrp: 120,
    minLendXrp: 60,
    gradientFrom: '#EE538A',
    gradientTo: '#A06FEA',
    about: 'A one-night open-air, run on a closed-ended vault instead of a promoter’s personal card. The cycle of the vault is the cycle of the night: subscription while tickets presell, investment while the venue and crew get paid, redemption the morning after on ticket revenue.',
    whatItFunds: 'Venue deposit, sound and lighting rental, crew advances.',
    whatLendersShouldKnow: 'This is a closed-ended, single-event vault. Principal and yield settle once, at redemption, from ticket revenue — not before.',
  },
  {
    id: 'subterranean-004',
    live: false,
    title: 'Subterranean 004: Acid Warehouse',
    organiser: 'Subterranean Collective',
    venue: 'Halle des Douves',
    city: 'Lyon',
    eventDate: '2026-10-04',
    fixedYieldPct: 9,
    tenorDays: 2,
    targetXrp: 200,
    minLendXrp: 50,
    gradientFrom: '#A06FEA',
    gradientTo: '#DE54DD',
    about: 'A warehouse acid night, third edition of a running series. This vault fronts the sound rig deposit.',
    whatItFunds: 'Sound rig deposit and door staff.',
    whatLendersShouldKnow: 'This organiser has not run a campaign on bangerz before.',
  },
  {
    id: 'la-plage-closing',
    live: false,
    title: 'La Plage — Season Closing',
    organiser: 'La Plage Collective',
    venue: 'Q-Base',
    city: 'Marseille',
    eventDate: '2026-09-27',
    fixedYieldPct: 11,
    tenorDays: 1,
    targetXrp: 150,
    minLendXrp: 50,
    gradientFrom: '#DE54DD',
    gradientTo: '#EE538A',
    about: 'The last open-air of the season. This vault fronts the stage build.',
    whatItFunds: 'Stage build and generator hire.',
    whatLendersShouldKnow: 'This organiser has not run a campaign on bangerz before.',
  },
]

export function getCampaign(id: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.id === id)
}
