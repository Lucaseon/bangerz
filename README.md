# bangerz

Event-driven micro-lending for student associations, on XRPL. An association funds its event's logistics by borrowing from its own community: members deposit into a vault, BANGERZ acts as the loan broker and posts first-loss capital, and the organiser repays from ticket revenue.

Built for the XRPL Lending Protocol Hackathon (DeVinci Blockchain × Ripple).

**Track 2** — Vault closed-ended, Lending Protocol V1.1, flavour **Vanilla**.

## Setup

```
npm install                # xrpl@5.2.0-beta.1 exact, no patching required — see "xrpl.js version" below
```

Requires `state.json` at the repo root (gitignored, contains wallet seeds — see `seed.mjs`'s `accounts` step). Never commit it.

```
node seed.mjs status       # read-only: vault/broker/loan state + current phase
node seed.mjs <step>       # run one step — see STEPS in seed.mjs, or run with no argument to list them
```

Any step can target a different vault via `STATE_FILE=state2.json node seed.mjs status`, and a fresh vault's windows via `SUBSCRIPTION_MINUTES`/`INVESTMENT_MINUTES` (protocol minimum: Investment must be at least 180 seconds).

### Front-end

```
cd web
npm install
npm run build && npm run start   # production mode — far more stable than `next dev` for a live demo
```

`http://localhost:3000` opens the marketplace (`/`); other pages: `/campaign/[id]` (funding, lend, admin panel), `/campaign/new` (creates a real vault on submit), `/dashboard`, `/positions`, and `/console` (the dev/jury instrumentation page).

The front reads ledger state through two root-level scripts (`read-state.mjs`, `run-action.mjs`) instead of a `state/deployment.json` contract — see `CLAUDE.md` for why.

## Environment

```
Network  : Public XRPL Devnet
WSS      : wss://s.devnet.rippletest.net:51233/
Faucet   : https://faucet.devnet.rippletest.net/accounts
Explorer : https://devnet.xrpl.org
Lib      : xrpl@5.2.0-beta.1 (exact — required by the official brief for Track 2)
```

Reserves: 1 XRP base + 0.2 XRP per owned object. Vault, LoanBroker, Loan, MPTokenIssuance, trust lines add up fast — fund every account at the faucet more than once.

## xrpl.js version — a mistake we caught before submitting

For most of the build this project was pinned to `xrpl@5.2.0-beta.0`, carried over from secondary planning material rather than the official brief. That version has a real bug: `signLoanSetByCounterparty` signs the counterparty signature with the wrong hash prefix (`HashPrefix.transactionSig` / `STX`, `0x53545800`) instead of the one XLS-66 requires (`HashPrefix.counterpartyTransactionSig` / `CST`, `0x43535400`), so every double-signed `LoanSet` built with the stock function was rejected as an invalid signature. It was worked around twice (a local reimplementation, then a `patch-package` patch) before re-reading the official brief, which requires `xrpl.js@5.2.0-beta.1` for Track 2 — a version that already fixes this natively, verified by diffing the published npm tarballs of `5.2.0-beta.0`, `5.2.0-beta.1` and stable `5.2.0`.

The project now runs on the required `xrpl@5.2.0-beta.1`. Both workarounds are removed; `seed.mjs` imports `signLoanSetByCounterparty` directly from `xrpl`. Full root cause, repro, and the version-mismatch discovery itself: `FEEDBACK.md`.

## XLS-65 / XLS-66 transactions used

| Transaction | Where |
|---|---|
| `VaultCreate` | `seed.mjs` — `vault` step (also run by `create-campaign.mjs` for a form-created campaign) |
| `LoanBrokerSet` | `seed.mjs` — `vault` step |
| `LoanBrokerCoverDeposit` | `seed.mjs` — `vault`, `cover-topup` steps |
| `VaultDeposit` | `seed.mjs` — `subscribe`, phase-rejection captures, and `deposit-custom` (the web front's Lend button, real amount/lender) |
| `VaultWithdraw` | `seed.mjs` — `redeem`, phase-rejection captures, and `redeem-all` (lender repayment admin action: full capital + accrued yield, computed from live share balance × price-per-share) |
| `LoanSet` (double signature, `Counterparty` + `CounterpartySignature`) | `seed.mjs` — `invest`, `invest2`, phase-rejection captures (`reject-sub`, `reject-red`), and the web admin panel's loan-origination action (`LOAN_INTEREST_RATE` honors the yield set in the campaign form) |
| `LoanPay` (`LoanPayFlags.tfLoanLatePayment` once past due date; `LoanPayFlags.tfLoanFullPayment` for one-shot early payoff) | `seed.mjs` — `pay`, `pay2`, `pay-off` steps |
| `LoanManage` (`tfLoanImpair`, `tfLoanDefault`) | `seed.mjs` — `impair`, `default` steps, wired to the `/console` admin panel |

Every transaction hash produced by a successful run is in `tx-links.md`, appended automatically by `seed.mjs`'s `logTx()`.

## What's captured for the minimum bar

- 3 phase rejections: `VaultDeposit` and `VaultWithdraw` during Investment, `LoanSet` during Redemption — all real ledger rejections, not client-side failures, stored per-vault and surfaced in the `/console` front as `GuardrailCard`s.
- Yield proof: `AssetsTotal` / price-per-share rising after `LoanPay` repayment, cash-basis interest recognition (no `tfVaultDonation` — see `FEEDBACK.md`). Price-per-share is computed as `(AssetsTotal - LossUnrealized) / SharesTotal`, not `AssetsTotal / SharesTotal` alone — a real bug we found and fixed, see `FEEDBACK.md`.
- Loan lifecycle beyond the minimum bar: `LoanManage` impair/default on a second vault, for the cover-mobilisation demo; a working campaign-creation form that deploys a real vault; a per-campaign admin panel to originate a loan at the organiser's chosen fixed yield and repay lenders their full capital plus yield.

## Repo layout

```
seed.mjs               the whole chain-facing demo, run step by step (STATE_FILE env var picks the vault)
create-campaign.mjs     funds accounts + creates a vault for a campaign submitted via /campaign/new
state.json              gitignored — vault #1 (after-oclock): IDs, wallet seeds, tx/rejection log
state2.json             gitignored — vault #2, for the impair/default scenario
state-<slug>.json       gitignored — one per campaign created through the web form
campaigns.json          gitignored — registry of campaigns created through the web form
tx-links.md             auto-appended explorer links for every successful tx
read-state.mjs          read-only ledger snapshot for the front (no signing)
run-action.mjs          runs one whitelisted seed.mjs step, reports the new tx rows
web/                    Next.js front — marketplace, campaign, dashboard, positions, console
design/                 design system, copy deck, architecture notes, mockups, pitch deck
CONTEXTE.md             current on-chain state and hackathon deadlines, updated throughout the event
CLAUDE.md               guidance for coding agents working in this repo
FEEDBACK.md             written by hand — DevEx findings from this build
```

## Team

BANGERZ — DevEx hook team `bangerz`.
