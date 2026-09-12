# bangerz

Micro-crédit événementiel pour associations étudiantes, sur XRPL. Une association finance la logistique d'une soirée en empruntant à sa communauté : les membres déposent dans un vault, BANGERZ joue le rôle de loan broker et engage du capital first-loss, l'organisateur rembourse sur la billetterie.

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

### Front-end

```
cd web
npm install
npm run build && npm run start   # production mode — far more stable than `next dev` for a live demo
```

`http://localhost:3000` redirects to `/` (marketplace); `/console` is the dev/jury instrumentation page.

The front reads the same `state.json` and the live ledger through two root-level scripts (`read-state.mjs`, `run-action.mjs`) — see `CLAUDE.md` for why it isn't wired through a `state/deployment.json` contract as originally planned.

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
| `VaultCreate` | `seed.mjs` — `vault` step |
| `LoanBrokerSet` | `seed.mjs` — `vault` step |
| `LoanBrokerCoverDeposit` | `seed.mjs` — `vault`, `cover-topup` steps |
| `VaultDeposit` | `seed.mjs` — `subscribe` step, the phase-rejection captures, and `deposit-custom` (the web front's Lend button, real amount/lender) |
| `VaultWithdraw` | `seed.mjs` — `redeem` step, and the phase-rejection captures |
| `LoanSet` (double signature, `Counterparty` + `CounterpartySignature`) | `seed.mjs` — `invest`, `invest2` (via `finish-phase4`), and the phase-rejection captures (`reject-sub`, `reject-red`) |
| `LoanPay` (with `LoanPayFlags.tfLoanLatePayment` once past due date) | `seed.mjs` — `pay`, `pay2` steps |
| `LoanManage` (`tfLoanImpair`, `tfLoanDefault`) | `seed.mjs` — `impair`, `default` steps |

Every transaction hash produced by a successful run is in `tx-links.md`, appended automatically by `seed.mjs`'s `logTx()`.

## What's captured for the minimum bar

- 3 phase rejections: `VaultDeposit` and `VaultWithdraw` during Investment, `LoanSet` during Redemption — all real ledger rejections, not client-side failures, stored in `state.json`'s `rejections` and surfaced in the `/console` front as `GuardrailCard`s.
- Yield proof: `AssetsTotal` / price-per-share rising after `LoanPay` repayment, cash-basis interest recognition (no `tfVaultDonation` — see `FEEDBACK.md`).
- Loan lifecycle beyond the minimum bar: `LoanManage` impair/default on a second vault with short windows, for the cover-mobilisation demo.

## Repo layout

```
seed.mjs            the whole chain-facing demo, run step by step (STATE_FILE env var picks the vault)
state.json           gitignored — vault #1 (after-oclock): IDs, wallet seeds, tx/rejection log
state2.json          gitignored — vault #2, for the impair/default scenario
state3.json          gitignored — vault #3, kept open in Subscription for a live Lend demo
tx-links.md           auto-appended explorer links for every successful tx
read-state.mjs         read-only ledger snapshot for the front (no signing)
run-action.mjs         runs one whitelisted seed.mjs step, reports the new tx rows
web/                   Next.js front — marketplace, campaign, dashboard, positions, console
design/                design system, copy deck, architecture notes, mockups, pitch deck
CONTEXTE.md            current on-chain state and hackathon deadlines, updated throughout the event
CLAUDE.md              guidance for coding agents working in this repo
FEEDBACK.md            written by hand — DevEx findings from this build
```

## Team

BANGERZ — DevEx hook team `bangerz`.
