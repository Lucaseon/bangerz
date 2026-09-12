# bangerz — `web/` architecture

Front-end architecture for the bangerz MVP. Lives in `web/`, isolated from the root Node/xrpl scripts so the blockchain dev's environment is never touched.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind. No database, no auth, no state library. Everything is read from the ledger or from `state/deployment.json`.

---

## 1. Repo layout

```
bangerz/
├── CLAUDE.md                  ← extend (§5)
├── CONTEXTE.md
├── FEEDBACK.md                ← dev writes here, don't touch
├── tx-links.md                ← dev writes here, front appends
├── package.json               ← root: Node scripts, xrpl. DO NOT add Next here
├── patches/
├── seed.mjs
│
├── lib/xrpl/                  ← NEW — the shared layer (§3)
│   ├── client.mjs
│   ├── accounts.mjs
│   ├── vault.mjs
│   ├── broker.mjs
│   ├── loan.mjs
│   └── read.mjs
│
├── scripts/                   ← dev's CLI entry points, thin wrappers over lib/
│   ├── 01-fund.mjs
│   ├── 02-vault-create.mjs
│   ├── 03-subscribe.mjs
│   ├── 04-loan.mjs
│   └── 05-redeem.mjs
│
├── state/
│   └── deployment.json        ← the contract (§2). Written by scripts, read by web
│
├── design/                    ← reference for the design agent
│   ├── design.md
│   ├── copy-deck.md
│   └── mockups/
│       ├── 01-marketplace.png
│       ├── 02-campaign.png
│       ├── 03-borrower-panel.png
│       ├── 04-lender-positions.png
│       └── logo.png
│
└── web/                       ← the Next app, own package.json
    ├── package.json
    ├── tailwind.config.ts
    ├── next.config.ts
    ├── public/flyers/
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx                    /            marketplace
        │   ├── campaign/[id]/page.tsx      /campaign/:id
        │   ├── dashboard/page.tsx          /dashboard   organiser
        │   ├── positions/page.tsx          /positions   lender
        │   ├── console/page.tsx            /console     demo
        │   └── api/
        │       ├── state/route.ts          GET  ledger snapshot
        │       ├── deposit/route.ts        POST VaultDeposit
        │       ├── withdraw/route.ts       POST VaultWithdraw
        │       ├── drawdown/route.ts       POST LoanDrawdown
        │       ├── repay/route.ts          POST LoanPay
        │       ├── donate/route.ts         POST VaultDeposit tfVaultDonation
        │       └── manage/route.ts         POST LoanManage impair/default
        ├── components/
        │   ├── brand/        Nav, Wordmark, HeaderBand, DisplayTitle
        │   ├── protocol/     FundingBar, PhaseStrip, TxReceipt, GuardrailCard, PPSCard
        │   ├── campaign/     CampaignCard, LendPanel, RiskPanel, LoanTimeline
        │   ├── account/      PositionCard, MetaRow, PersonaSwitcher
        │   └── ui/           Button, Chip, Input, Card, Amount, Address
        ├── lib/
        │   ├── types.ts      shared with the contract (§2)
        │   ├── format.ts     XRP amounts, drops↔XRP, address truncation
        │   ├── phase.ts      phase derivation + gating (§4)
        │   └── explorer.ts   devnet.xrpl.org URL builders
        └── styles/globals.css
```

Why `lib/xrpl/` at the root and not inside `web/`: both the CLI scripts and the Next route handlers import the same functions. One implementation, two callers. The front never re-implements a transaction.

---

## 2. The contract — `state/deployment.json`

The single handoff point between the two of you. The dev's scripts write it; the front reads it. Nothing else is shared.

```json
{
  "network": "wss://s.devnet.rippletest.net:51233/",
  "explorer": "https://devnet.xrpl.org",
  "libVersion": "5.2.0-beta.0",
  "accounts": {
    "platform":  { "address": "r...", "seed": "s..." },
    "organiser": { "address": "r...", "seed": "s..." },
    "lenderA":   { "address": "r...", "seed": "s..." },
    "lenderB":   { "address": "r...", "seed": "s..." }
  },
  "vault": {
    "id": "...",
    "kind": "closed",
    "asset": "XRP",
    "shareMptId": "...",
    "subscriptionDate": "2026-09-12T17:00:00Z",
    "redemptionDate":   "2026-09-13T09:00:00Z"
  },
  "broker": {
    "id": "...",
    "coverRateMinimum": 20000,
    "coverRateLiquidation": 20000,
    "coverDeposited": "2000000000"
  },
  "loan": { "id": "...", "principal": "8000000000", "rate": 12.5, "maturity": "2026-09-13T08:00:00Z" },
  "campaign": {
    "title": "After O'clock X La Plage Open Air",
    "venue": "Glazart, Paris",
    "eventDate": "2026-09-12T06:00:00Z",
    "targetDrops": "10000000000",
    "flyer": "/flyers/summer-camp.png"
  },
  "backupVaultId": "..."
}
```

Rules:
- **Drops as strings, always.** Never a JS number for a ledger amount. `format.ts` converts for display.
- Seeds live here because this is Devnet with faucet funds and the demo needs to sign as four personas. `state/` is gitignored anyway — but say so in the README so nobody thinks it's a mistake.
- If a field doesn't exist yet, the front renders the corresponding screen in its "not yet" state. Never crash on a missing key.

Mirror the shape in `web/src/lib/types.ts` and never drift.

---

## 3. What to ask the dev for (one message, send it now)

> Peux-tu extraire tes transactions dans `lib/xrpl/*.mjs` en fonctions exportées, et garder `scripts/*.mjs` comme simples wrappers CLI ?
>
> Signature souhaitée pour chacune :
> ```js
> export async function vaultDeposit({ client, wallet, vaultId, amountDrops })
>   // → { hash, engineResult, validated: bool, ledgerIndex, raw }
> ```
> Le front a besoin de deux choses : que **tout retour contienne `hash` et `engineResult`**, y compris en cas d'échec (un `tec*` n'est pas une exception, c'est une donnée que j'affiche), et une fonction `readState({ client, deployment })` qui renvoie le snapshot du §2 + `assetsTotal`, `sharesTotal`, `pps`, `coverAvailable`, `loanOutstanding`.
>
> Et épingle `xrpl` en `5.2.0-beta.0` exact, sans caret.

That last point matters beyond tidiness: a rejected transaction is a deliverable here, and if the lib throws instead of returning the code, the front can't render the guardrail cards that the minimum bar requires.

---

## 4. Phase gating — one file, used everywhere

`web/src/lib/phase.ts` is the only place phase logic exists.

```ts
export type Phase = 'subscription' | 'investment' | 'redemption';

export function currentPhase(now: Date, subEnd: Date, redStart: Date): Phase;

export const ALLOWED: Record<Phase, Record<Action, boolean>> = {
  subscription: { deposit: true,  withdraw: true,  loanSet: false, repay: false, redeem: false },
  investment:   { deposit: false, withdraw: false, loanSet: true,  repay: true,  redeem: false },
  redemption:   { deposit: false, withdraw: true,  loanSet: false, repay: true,  redeem: true  },
};

export function gate(phase: Phase, action: Action): { allowed: boolean; reason?: string };
```

Every action button calls `gate()` and, when blocked, renders disabled with the returned reason visible beneath it. That greyed-out state with a legible reason is your clearest proof of the V1.1 lifecycle.

**Important:** gating in the UI is for legibility, not enforcement. The `/console` guardrail buttons must **bypass the gate** and submit anyway, so the ledger does the rejecting and you capture a real `tec*` code. A guardrail demo that the front blocks before submission proves nothing.

---

## 5. `CLAUDE.md` additions

Append this so any coding agent picks up the right context:

```md
## Front-end (web/)
- Next.js 15 App Router + TypeScript + Tailwind, in `web/` only. Never add Next deps to the root package.json.
- Design system: `design/design.md` is authoritative for colour, type, spacing, components. Read it before writing any UI.
- Mockups: `design/mockups/*.png` — match layout and hierarchy, but apply the corrections listed in design.md §0 and §9.
- Copy: take strings from `design/copy-deck.md`. Never invent UI copy.
- The asset is XRP, never XRPL. Amounts in XRP only, no dollar figures.
- Ledger amounts are strings in drops everywhere except display formatting.
- All ledger calls go through `lib/xrpl/*` via route handlers in `web/src/app/api/*`. The front never builds a transaction itself.
- Every ledger action renders a persistent TxReceipt with hash + explorer link. Never a toast.
```

---

## 6. Scaffold commands

```bash
cd bangerz
npx create-next-app@latest web --ts --tailwind --app --eslint --no-src-dir=false --import-alias "@/*"
mkdir -p design/mockups state lib/xrpl scripts web/public/flyers
echo "state/" >> .gitignore
npm pkg set dependencies.xrpl=5.2.0-beta.0   # pin exact, drop the caret
```

Then drop `design.md`, the copy deck and the four mockup PNGs into `design/`, and commit that in its own commit so the dev sees it arrive without merge noise.

---

## 7. Build order

Given code freeze Sunday 12:30, and that the front is 10% of the grade:

1. Scaffold + Tailwind tokens from design.md §8 + `format.ts` + `explorer.ts`
2. `ui/` primitives: Button, Chip, Amount, Address, Card
3. `protocol/`: **TxReceipt → FundingBar → PhaseStrip → GuardrailCard → PPSCard**
4. `/console` — every route handler wired, happy path + three guardrails + PPS before/after
5. `/campaign/[id]` — the screen the jury looks at longest
6. `/dashboard`, then `/positions`
7. `/` marketplace last, with seeded static campaigns
8. Cut entirely if time runs short: the creation wizard

`/console` before the pretty screens is deliberate. It's what makes the live demo possible, and it forces every route handler to exist early. If Sunday morning goes badly, a working console plus one polished campaign page is a complete 4-minute demo.
