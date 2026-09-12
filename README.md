# bangerz

Micro-crédit événementiel pour associations étudiantes, sur XRPL. Une association finance la logistique d'une soirée en empruntant à sa communauté : les membres déposent dans un vault, BANGERZ joue le rôle de loan broker et engage du capital first-loss, l'organisateur rembourse sur la billetterie.

Built for the XRPL Lending Protocol Hackathon (DeVinci Blockchain × Ripple).

**Track 2** — Vault closed-ended, Lending Protocol V1.1, flavour **Vanilla**.

## Setup

```
npm install                # runs patch-package via postinstall — see "Known xrpl.js bug" below
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
npm run dev                # http://localhost:3000, redirects to /console
```

The front reads the same `state.json` and the live ledger through two root-level scripts (`read-state.mjs`, `run-action.mjs`) — see `CLAUDE.md` for why it isn't wired through a `state/deployment.json` contract as originally planned.

## Environment

```
Network  : Public XRPL Devnet
WSS      : wss://s.devnet.rippletest.net:51233/
Faucet   : https://faucet.devnet.rippletest.net/accounts
Explorer : https://devnet.xrpl.org
Lib      : xrpl@5.2.0-beta.0 (exact, patched — see below)
```

Reserves: 1 XRP base + 0.2 XRP per owned object. Vault, LoanBroker, Loan, MPTokenIssuance, trust lines add up fast — fund every account at the faucet more than once.

## Known xrpl.js bug and fix

`signLoanSetByCounterparty` in `xrpl@5.2.0-beta.0` signs the counterparty signature with the wrong hash prefix (`HashPrefix.transactionSig` / `STX`, `0x53545800`) instead of the one XLS-66 requires for a `LoanSet` counterparty signature (`HashPrefix.counterpartyTransactionSig` / `CST`, `0x43535400`). Every double-signed `LoanSet` built with the stock function is rejected as an invalid signature.

Fixed twice, independently:
1. A local reimplementation in `seed.mjs` (`signLoanSetByCounterparty`), calling `encodeForSigningCounterparty` from `ripple-binary-codec` directly.
2. `patches/xrpl+5.2.0-beta.0.patch`, applied to `node_modules` by `patch-package` on `postinstall`.

Full root cause, repro and the correct fix: `FEEDBACK.md`.

**Already fixed upstream, one version later.** `xrpl@5.2.0-beta.1` and the stable `xrpl@5.2.0` (both already published to npm) call `computeSignature` with the correct counterparty role — verified by diffing the packed tarballs of both against `5.2.0-beta.0`. No PR was needed. This project still pins the exact beta that has the bug, on purpose, since the local patch and the feedback entry are built against it.

## XLS-65 / XLS-66 transactions used

| Transaction | Where |
|---|---|
| `VaultCreate` | `seed.mjs` — `vault` step |
| `LoanBrokerSet` | `seed.mjs` — `vault` step |
| `LoanBrokerCoverDeposit` | `seed.mjs` — `vault`, `cover-topup` steps |
| `VaultDeposit` | `seed.mjs` — `subscribe` step, and the phase-rejection captures |
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
seed.mjs            the whole chain-facing demo, run step by step
state.json           gitignored — vault/broker/loan IDs, wallet seeds, tx/rejection log
tx-links.md           auto-appended explorer links for every successful tx
read-state.mjs         read-only ledger snapshot for the front (no signing)
run-action.mjs         runs one whitelisted seed.mjs step, reports the new tx rows
web/                   Next.js front (/console) — see CLAUDE.md for its section
design/                design system, copy deck, architecture notes, mockups
CONTEXTE.md            current on-chain state and hackathon deadlines, updated throughout the event
CLAUDE.md              guidance for coding agents working in this repo
FEEDBACK.md            written by hand — DevEx findings from this build
```

## Team

BANGERZ — DevEx hook team `bangerz`.
