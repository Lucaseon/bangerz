# bangerz — design.md

Design system for the bangerz front. **Derived from the shipped mockups**, not from an abstract brand guess. Any screen built or generated for this product follows this file.

**Stack:** Next.js (App Router) + Tailwind. Tokens are given as hex plus a ready `tailwind.config` extension (§8), so hand-written and generated code land on the same values.

**This is the merged, final version.** Brand colours and the Syne / Raleway / JetBrains Mono stack are folded into §2, §3 and §8. §11 settles what the Stitch-generated screens contribute. Companion files: `copy-deck.md` (every UI string, authoritative), `architecture.md` (repo layout and the front/back contract), `prompts.md` (build sequence).

**Context:** hackathon MVP on XRPL Lending Protocol V1.1, Track 2 (closed-ended vault). Presentation is 10% of the grade — this system exists to look finished fast, not to be exhaustive.

---

## 0. One correction before anything else

The mockups use `XRPL` as the currency ticker (`250 XRPL`, `min 50 XRPL`, `11,250 XRPL`). **XRPL is the ledger; the asset is XRP.** In front of a Ripple jury this reads as not having understood the platform, and it's the cheapest possible mistake to avoid.

This document uses `XRP` throughout. If you want it the other way it's one find-and-replace, but I'd keep XRP.

Decided with it: **crypto-only amounts, no dollar figures.** The mockups mix `10,000$` in cards with `250 XRPL` in the lend panel. On Devnet there's no conversion and no oracle, so a dollar figure implies a rate you don't have. Every amount in the product is XRP.

---

## 1. Brand read

Lowercase geometric sans, rounded terminals, wide apertures, generous tracking. Two lockups: white on near-black with the final `z` carrying the gradient, and white on a full gradient field.

The mockups turn that into a spatial idea worth naming, because it's the thing to protect:

> **The gradient lives at the top of the page and in the progress bar. Everything between them is near-black.**

Public pages open on photographic nightlife fading into black. Authenticated pages open on a desaturated gradient band fading into black. Then the page goes quiet and typographic, and the only saturated thing left is the funding bar.

Tone: nightlife, not fintech. Confident, low-chrome, loud in exactly two places.

---

## 2. Colour

### 2.1 Surfaces & text

Six values are brand-supplied and never adjusted: `bg`, `line`, `ink-muted`, and the three gradient hues in §2.2. The surface ramp is interpolated between `bg` and `line`, the text ramp descends from `ink-muted` — both marked *derived* below.


| Token | Hex | Use |
|---|---|---|
| `bg` | `#040308` | Page background — **brand-supplied** |
| `surface` | `#0D0B14` | Cards, panels — derived |
| `surface-raised` | `#161221` | Inputs, chips, hover, modals — derived |
| `surface-inset` | `#1D1828` | Inset boxes — payout summary, drawdown detail — derived |
| `line` | `#241F33` | Hairlines, card edges, input borders — **brand-supplied** |
| `ink` | `#FFFFFF` | Headings, amounts, primary copy |
| `ink-muted` | `#9C96AD` | Body copy, meta values — **brand-supplied** |
| `ink-label` | `#7C7590` | Small uppercase labels — derived |
| `ink-faint` | `#5E5872` | Disabled, placeholder — derived |

### 2.2 The two gradients

Three brand-supplied hues, in order: `#EE538A` → `#DE54DD` → `#A06FEA`. That trio *is* the saturated gradient. The header band is the same trio at ~68% luminance so white text stays legible on it.

Different tokens, never interchangeable. The mockups already treat them differently and that's the right instinct: the header band is darker so white text stays legible on it; the accent gradient is fully saturated because nothing sits on top of it.

```css
/* Saturated — bars, CTAs, headline accents. Nothing on top of it. */
--grad-brand: linear-gradient(90deg,
  #EE538A 0%, #DE54DD 45%, #A06FEA 100%);

/* Desaturated — full-bleed page header bands. White text sits on this. */
--grad-header: linear-gradient(105deg,
  #A03C61 0%, #9A3B98 45%, #704EA6 100%);

/* Always applied over a header band, downward. */
--header-fade: linear-gradient(180deg, transparent 0%, #040308 100%);
```

Flat fallbacks: `coral #EE538A`, `magenta #DE54DD`, `violet #A06FEA`.

**Three stops, not four.** An earlier four-stop version had a pink plateau in the middle, which made the junction between the funding bar's two segments unreadable. Three stops give a clean left-to-right read from `secured` to `community` — the one thing the gradient absolutely has to do. Don't add a stop back without a reason.

### 2.3 Semantic

`secured`, `community` and `due` are brand hues. `ok`, `bad` and `warn` are derived and deliberately sit *outside* the brand palette — a green that leans magenta stops reading as a signal.

| Token | Hex | Meaning |
|---|---|---|
| `secured` | `#EE538A` | Organiser's first-loss cover (broker cover) |
| `community` | `#A06FEA` | Community deposits |
| `due` | `#DE54DD` | `DUE IN 6 DAYS`, countdowns, active field labels |
| `ok` | `#3ED598` | Validated tx, `100% FUNDED`, projected yield, repaid — derived |
| `bad` | `#FF5A5A` | Default, impairment, cover seizure — derived |
| `warn` | `#FFB84D` | `READY TO DRAW`, immutable-date warnings, phase gates — derived |

`secured` and `community` are the two ends of the brand gradient. The funding bar is the wordmark pulled apart — the strongest visual idea in the product. Protect it (§5.2), and never reassign either token.

### 2.4 Gradient zoning — replaces "one gradient per screen"

Per screen, gradient is permitted in **at most three zones**, only these:

1. **Header zone** — full-bleed photographic hero (public) or `--grad-header` band (authenticated), always fading to `bg`.
2. **The funding/progress bar** — always `--grad-brand`, left to right.
3. **One primary CTA** — `--grad-brand` pill, exactly one per viewport.

Elsewhere gradient is allowed only on: two or three words inside a display headline (`fund **the night.**`), the active nav item, the active filter chip, and the `z` in the wordmark.

**Forbidden:** gradient on body text, on anything under 16px, on borders other than a 1px top hairline, behind text, on card fills, on more than one CTA per viewport.

**Contrast trap:** white fails below ~20px across the middle of the brand gradient — on `#DE54DD` as much as on the coral end. When a gradient button carries small text, use the header values instead or make it solid white. The mockups' white `Lend 250 XRP` and `Draw down 10,000 XRP` buttons are the correct pattern for the highest-intent action — keep them white.

---

## 3. Type

**Syne** for display and headings, via `next/font/google`, weights 600/700 — `--font-syne`.
**Raleway** for body, labels, chips and **every number**, weights 400/500/600 — `--font-raleway`.
**JetBrains Mono** 400 — addresses, tx hashes, engine result codes, XRPL field names — `--font-jetbrains`.

| Role | Spec | Family | Use |
|---|---|---|---|
| `display-xl` | 88px / 700 / -1% / lh 1.0 | Syne | Public hero only |
| `display` | 56px / 600 / -0.5% / lh 1.05 | Syne | Section + page titles |
| `h3` | 20px / 600 | Syne | Card titles — `Back this bangerz` |
| `amount-xl` | 44px / 600 / -1% / tabular | Raleway | Hero amounts, PPS |
| `amount` | 32px / 600 / -0.5% / tabular | Raleway | Card metrics — `11.5%`, `21 days`, `4,589` |
| `body` | 15px / 400 / lh 1.65 | Raleway | Prose |
| `label` | 11px / 500 / +8% / uppercase / `ink-label` | Raleway | `FIXED YIELD`, `RAISED TILL NOW` |
| `chip` | 11px / 600 / +6% / uppercase | Raleway | Status chips |
| `mono` | 13px / 400 | JetBrains Mono | Hashes, addresses, error codes |

**Two consequences, both load-bearing.**

1. **Numbers are never Syne.** Syne has no tabular figure set. `/console` polls `/api/state` every five seconds and `amount-xl` figures re-render live — in a proportional face the digits change width and the PPS card twitches while you're presenting. Raleway has `tabular-nums`. Every amount, percentage and countdown is Raleway.

2. **Tracking is looser than it looks.** Syne is wider and more assertive than a neutral geometric; at -3% an 88px Bold headline collides. The values in the table above are the corrected ones — don't tighten them further.

### 3.1 The trailing period

Display headings **end in a period**: `Open campaigns.` · `Your campaign.` · `Your loan.` · `Activity.` · `Your positions.`

A brand device from the mockups — keep it. Applies to `display` and `display-xl` only. Card titles, labels and buttons never take one.

### 3.2 Case

Sentence case everywhere except `label` and `chip`, which are uppercase and tracked. **No uppercase headlines, ever** — the wordmark is lowercase, Syne's lowercase is the brand's own voice, and shouting contradicts both. `bangerz` is lowercase in every context, mid-sentence included.

### 3.3 Numbers

`font-variant-numeric: tabular-nums` everywhere. Thousands separator always, decimals only when non-zero. The unit is a separate span at 60% size in `ink-muted`, as the mockups do (`10,000` large + `XRP` small). Addresses truncate first 8 / last 4 with a copy affordance.

---

## 4. Layout & form

- **8px scale.** Card padding 24px (32px hero panels), 96px between display-titled sections, 32px page gutters.
- **Max width 1440px**, content inset to ~1200px. The mockups run wide — keep that.
- **Radius:** 20px cards and modals, 12px inputs, 999px pills, buttons, chips and every progress bar. Nothing sharp.
- **Borders** 1px `line`. Elevation from surface lightness, never drop shadow. One exception: `0 8px 32px rgba(190,97,233,.28)` under a gradient CTA.
- **Cards:** no header divider. Title → content → action.
- **Header bands** full-bleed, ~360px on authenticated pages, ~720px on the public hero, always fading to `bg`. Nav sits transparent on top.
- **Campaign layout:** content left ~62%, sticky lend panel right ~38%, 48px gutter, panel sticks 96px from top.
- **Card grid:** 3-up ≥1280px, 2-up ≥768px, 1-up below. Card image 16:9, radius 12px.

---

## 5. Components

### 5.1 Nav

Transparent over the header band. Wordmark left, lowercase links (`campaigns` `explore` `organise` `invest`), right side account + one pill CTA (`Create a new party`). Links 15px/400, white at 100% active / 70% otherwise. Active item gets a brand-gradient pill or underline — pick one, keep it.

The CTA pill is outlined on the public hero and gradient-filled on the campaign page. Rule: **outlined when photography is behind it, filled when the band is flat.**

### 5.2 FundingBar — the hero component

999px pill: 8px tall in cards, 14px on campaign detail, 12px on dashboard.

**Structural change from the mockups.** They render one continuous gradient fill for total raised. That's wrong here: the organiser's first-loss cover and the community's deposits are *two different mechanisms* — a `LoanBrokerCoverDeposit` versus a set of `VaultDeposit`s — and merging them erases the entire Proof-of-Commitment story.

Render **two segments, flush, no gap:**

```
[ secured — cover 20% ][ community — deposits ][ surface-raised — remaining ]
```

Above: `amount-xl` raised, `amount` goal. Below: a three-part `label` caption with an 8px dot swatch per segment —
`● 2,000 XRP cover · ● 2,589 XRP lent · 5,411 XRP to go`

Fully funded: remaining track disappears, `100% FUNDED` chip in `ok` (the borrower panel already does this).

### 5.3 PhaseStrip — missing from the mockups, required

Track 2's whole thesis. Three equal segments, 999px container, 40px tall, `surface-raised`.

- Completed: `line` fill, `ink-faint` text
- Active: brand gradient, white text, countdown beneath in `due`
- Upcoming: transparent, `ink-muted`

Labels `Subscription` · `Investment` · `Redemption`. Countdown `Investment opens in 2h 14m`.

**This component governs disabled state app-wide.** Every action reads the current phase and, when blocked, renders disabled with a one-line reason directly beneath in `warn` — never a tooltip, never silence. That visible grey-out is the best on-screen demonstration of the V1.1 lifecycle, exactly as the roadmap calls for.

### 5.4 TxReceipt — missing from the mockups, load-bearing

Every ledger action produces a persistent card. Not a toast. These are the links you submit by Sunday 13:00.

`surface-raised`, radius 12px, 3px left border in `ok` (validated) or `bad` (rejected). Contents: tx type in `h3`, hash in `mono` truncated with copy, engine result in `mono`, ledger index, underlined white `View on explorer`.

Receipts stack newest-first in an `Activity.` section and persist for the session.

### 5.5 GuardrailCard — the rejected state, designed

Three phase rejections are on the minimum bar. They must look deliberate, not broken.

Heading `Rejected by the protocol` in white — not red; red is reserved for default. Rows: `Attempted`, `Why` (plain language), `Engine result` (mono — `tecWRONG_ASSET`, `tecNO_PERMISSION`). Footer in `ink-muted`: *This is the protocol enforcing its own rules. The transaction never touched the vault.* Left border `bad`, everything else calm.

### 5.6 PPSCard — missing from the mockups, and it's the yield proof

Per the roadmap, interest enters the vault via `VaultDeposit` with `tfVaultDonation`: price-per-share rises, no shares issued. Nothing else in the product makes yield visible.

Two `amount-xl` figures with an arrow between, before → after, delta in `ok`:

`1.0000 → 1.1250   (+12.5%)`

Label row beneath: `AssetsTotal` / `SharesTotal` / `Price per share`, values in mono. Place it on the campaign page and the demo console.

### 5.7 Lend panel — from the mockups, keep

Sticky right column. Title `Back this bangerz` (good copy, keep). Meta `FIXED YIELD: 12.5%   REPAYMENT ON 26 MAY 2026`. Field label `Amount to lend` in `due` left, `min 50 XRP` right in `ink-muted`. Large input with asset selector. Quick-add chips `+50 +100 +150 +200 +250` and `MAX` in `pink`. Then a `surface-inset` summary: `PRINCIPAL`, `PROJECTED YIELD (12.5%)` in `ok`, rule, `TOTAL PAYOUT` in `amount`. Cover note with a shield glyph in `secured`: `First 2,000 XRP covered by organiser`. Solid white CTA.

Add the line the mockups lack, directly under the CTA, `label` style, `ink-muted`:
*First-loss cover absorbs losses before yours. It does not remove your risk.*

### 5.8 Buttons

| Variant | Style |
|---|---|
| Primary | Solid white, `bg` text, 52px, 999px, 500 |
| Gradient | Brand gradient, white text, 52px, 999px — one per viewport |
| Outline | Transparent, 1px rgba(255,255,255,.25), white text |
| Ghost | Transparent, `ink-muted`, no border |
| Destructive (demo) | Transparent, 1px `bad`, `bad` text |
| Disabled | `surface-raised`, `ink-faint`, no opacity tricks |

Every on-chain button has four states: idle → `Waiting for your signature…` → `Submitting to the ledger…` → receipt. Never a bare spinner.

### 5.9 Chips & filters

Filter pills as in the mockups: active brand-gradient with white text, inactive `surface-raised` with 1px `line`. Status chips 999px, `chip` type, background at 12% opacity of the semantic colour with solid colour text: `READY TO DRAW` (`warn`), `100% FUNDED` (`ok`), `DUE IN 6 DAYS` (`due`), `DEFAULTED` (`bad`).

### 5.10 Meta rows

Dashboard pattern: `label` above, `amount` below, unit small and muted. 4-up on wide screens, separated by whitespace, never dividers.

---

## 6. Imagery

**Allowed:** event flyer artwork and club photography, always in the header zone, always fading to `bg`, always with a `rgba(4,3,8,.45)` scrim under text. Campaign card images are flyer artwork at 16:9. This is content — it's what the campaign *is*.

**Forbidden:** 3D crypto renders, coins, chains, glowing blockchain cubes, neon cyberpunk clichés, generic fintech stock photography, illustration, light mode.

**Fake social proof:** the public hero carries `★★★★★ 4.9 sur 19k avis`. Remove it — French on an English page, a Trustpilot pastiche on a product that has never shipped, and a jury that spots it discounts everything else. If you want the slot: `Settled on the XRP Ledger · every transaction publicly verifiable`.

Icons: Lucide, 1.5px stroke, never filled, never multicolour.

---

## 7. Voice

Marketing surfaces (public hero, nav, explore) may use **invest / investors**. Everything inside the app — lend panel, positions, receipts, dashboard, console — uses **lend / lender / yield**. The boundary is the campaign detail page: its hero CTA can say `Invest in the campaign`, the panel says `Lend 250 XRP`.

Never, anywhere: "returns", "APY", "guaranteed", "risk-free".

Two mockup fixes: `Campaigns investments.` is grammatically off and sits inside the app — make it `Campaign funding.` And the campaign body copy is French on an otherwise English page; the MVP ships English only.

---

## 8. Tailwind config

```js
// tailwind.config.ts — theme.extend
colors: {
  bg: '#040308',
  surface: { DEFAULT: '#0D0B14', raised: '#161221', inset: '#1D1828' },
  line: '#241F33',
  ink: { DEFAULT: '#FFFFFF', muted: '#9C96AD', label: '#7C7590', faint: '#5E5872' },
  coral: '#EE538A', magenta: '#DE54DD', violet: '#A06FEA',
  secured: '#EE538A', community: '#A06FEA',
  ok: '#3ED598', bad: '#FF5A5A', warn: '#FFB84D', due: '#DE54DD',
},
backgroundImage: {
  brand:  'linear-gradient(90deg,#EE538A 0%,#DE54DD 45%,#A06FEA 100%)',
  header: 'linear-gradient(105deg,#A03C61 0%,#9A3B98 45%,#704EA6 100%)',
  fade:   'linear-gradient(180deg,transparent 0%,#040308 100%)',
},
borderRadius: { card: '20px', input: '12px' },
fontFamily: {
  display: ['var(--font-syne)','system-ui','sans-serif'],
  sans:    ['var(--font-raleway)','system-ui','sans-serif'],
  mono:    ['var(--font-jetbrains)','monospace'],
},
boxShadow: { glow: '0 8px 32px rgba(160,111,234,.28)' },
```

Gradient text: `bg-brand bg-clip-text text-transparent`.

Font wiring in `layout.tsx`:

```ts
import { Syne, Raleway, JetBrains_Mono } from 'next/font/google';

const syne      = Syne({ subsets: ['latin'], weight: ['600','700'],       variable: '--font-syne' });
const raleway   = Raleway({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-raleway' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400'],    variable: '--font-jetbrains' });
```

Note `font-display` is the Syne utility and `font-sans` is Raleway — so default body text needs no class, and every heading takes `font-display` explicitly.

## 9. Screen inventory & status

| Screen | Mockup | Gap to close |
|---|---|---|
| `/` marketplace | done | Drop fake reviews, XRP amounts, two-segment bars |
| `/campaign/[id]` | done | PhaseStrip, split funding bar, receipts, risk line, EN copy |
| `/dashboard` organiser | done | Cover shown separately, phase-gated actions, receipts |
| `/positions` | partial | Position cards missing; totals row repeats `PRINCIPAL` three times — should be `Total lent` / `Current value` / `Accrued yield` / `Positions` |
| `/console` demo | missing | Build it: happy path, failure path, three guardrails, PPS card, session tx log with export |
| `/campaign/new` | missing | Lowest priority — seed the campaign by script for the demo |

Build order given the deadline: TxReceipt + PhaseStrip + split FundingBar → campaign detail → console → dashboard → positions → creation wizard (cut if needed).

---

## 10. Non-negotiables

1. Dark only. No light mode.
2. `bangerz` always lowercase. The asset is `XRP`, never `XRPL`.
3. Amounts in XRP only. No dollar figures.
4. Display headings end in a period.
5. Gradient in at most three zones per screen: header, progress bar, one CTA.
6. The funding bar always separates cover from community deposits.
7. Every ledger action produces a persistent receipt with a visible hash and explorer link. Never a toast.
8. Rejected transactions are a designed state, not an error.
9. Blocked actions render disabled with a visible one-line reason.
10. Headings in Syne, numbers never in Syne — every amount is Raleway with `tabular-nums`.
11. No invented figures: no aggregate stats, no track record, no trust score the product doesn't compute (§11.3).

---

## 11. Stitch reconciliation

Two sets of mockups exist. The four hand-made screens define the product's look. The Stitch screens were generated later and look like a different product — mono-dominant, saturated status fills, `xls-66` badges everywhere, an "instrumentation dashboard" voice.

**They are not the visual target. They are an information-architecture source.** What's worth taking from them is density and completeness, not styling. The rule:

> **Structure and content from Stitch. Surface treatment from design.md.**

### 11.1 Taken from Stitch

| Element | Where it lands | Why |
|---|---|---|
| Demo console, three-group layout (happy / failure / guardrails) | `/console` | design.md §9 lists the console as *missing*; Stitch worked out its shape. Keep the three groups and the ordering. |
| Session transaction table with `.json` export | `/console` §7.5 | These are the links submitted by Sunday 13:00. The table is the deliverable. |
| Guardrail cards showing `Attempted` / `Why` / `Engine result` | `GuardrailCard` | Matches design.md §5.5 exactly. Stitch validated the row structure. |
| Full-page rejection proof view | fold into `/console` | Good content, but a separate route is out of budget. Take the `Why rejections protect lenders` reasoning into the console footer as three short lines. |
| Escrow / loan lifecycle step strip | `/campaign/[id]` §3.4 | Better than the hand-made mockup, which has no lifecycle at all. |
| Position cards with `VAULT SHARES` / `DEPOSITED` / `CURRENT VALUE` / `YIELD` | `/positions` §6.1 | design.md §9 flags these as missing entirely. Stitch has them. |
| Maturity countdown bar on each position | `/positions` | Cheap, and it makes the closed-ended tenor legible per position. |
| Organiser trust block (repayment rate, past events settled) | `/campaign/[id]` | Keep the shape, **drop the invented numbers** — see 11.3. |
| Persona switcher pill row | `/console` | Four Devnet personas need switching for the demo. |

### 11.2 Restyled on the way in

Every Stitch element gets these corrections before it ships:

1. **Mono is not a body face.** Stitch sets labels, metadata and even prose in mono. Per §3, mono is confined to hashes, addresses, engine result codes and XRPL field names. Labels go to Raleway `label`, titles to Syne.
2. **Titles take the period.** `demo console` → `Demo console.` · `your positions` → `Your positions.` · `session transactions` → `Session transactions.`
3. **Status fills come down to 12%.** Stitch renders `tesSUCCESS` and `tecNO_PERMISSION` on saturated blocks. Per §5.9: background at 12% opacity of the semantic colour, text in the solid colour.
4. **Rejection headings are white.** Stitch uses red type on `Rejected by the protocol`. Red is reserved for default and cover seizure (§5.5).
5. **Gradient zoning applies.** Several Stitch screens have no gradient at all and one has a gradient step-header plus a gradient CTA plus gradient chips. Three zones, per §2.4: header band, funding bar, one CTA.
6. **Borders and radii normalise.** Stitch uses 8–12px radii and visible 1px borders on everything. Cards go to 20px, inputs 12px, pills 999px; elevation comes from surface lightness, not outlines.
7. **The funding bar splits.** Stitch's marketplace bars already show two segments with a `1st-loss` / `community` legend — this is correct and is the one place Stitch beat the hand-made mockups. Keep it, recoloured to `secured` / `community`.
8. **`XRPL` → `XRP`, dollars removed.** Stitch is mostly clean on this; the hand-made mockups are not. Both get swept.

### 11.3 Rejected from Stitch

| Element | Why |
|---|---|
| Aggregate stat strip — `84,200 XRP total lent`, `38 completed vaults`, `0.0% historical default`, `12.8% average net yield` | Invented history for a product two days old. A jury that spots one fabricated number discounts every real one beside it. |
| `XRPL Trust Score 99/100`, `KYC Tier 3` | No such primitive exists in what's being built. Don't claim protocol features you didn't implement. |
| Organiser track record — `4/4 past events settled`, `38,400 XRP total repaid` | Same problem. Keep the organiser block, populate it from `deployment.json`, and where there's no data write `First campaign on bangerz.` |
| `/campaign/new` three-step wizard with credential gate | Loaded flavour only. The roadmap decision is Vanilla; the campaign is seeded by script. Don't build it. |
| Notification bell, settings gear, balance widget in the nav | Non-functional chrome. Nav stays as §5.1. |
| `view raw ledger error response`, `download proof pack (.zip)`, `SHA256:` footers | Plausible-looking affordances with nothing behind them. A dead link in a live demo is worse than no link. The explorer link is real — keep only that. |
| Separate `/campaign/[id]/rejection-proof` route | Out of budget. Content folds into the console. |

### 11.4 Precedence

When the three sources disagree: **design.md (with this addendum) → copy-deck.md → Stitch screens → hand-made mockups.** The hand-made mockups sit last because design.md §0 and §9 already list their known errors; they're a layout reference, not a source of truth.
