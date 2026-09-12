# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BANGERZ: a demo of an XRPL closed-ended Vault (XLS-65) + Lending Protocol (XLS-66, V1.1) loan broker cycle, built for the XRPL Lending Protocol Hackathon (DeVinci Blockchain × Ripple). Track 2, Vanilla flavour. The chain-facing side is one seeding/demo script (`seed.mjs`) run step by step against the Public XRPL Devnet; `web/` is a Next.js front reading that same state, plus a vendored DevEx feedback-capture tool.

Read `CONTEXTE.md` first in any session — it holds the current on-chain state (vault/loan/broker IDs, current phase, what's done vs. pending) and the hackathon deadlines. It changes throughout the event; this file does not.

## Commands

```
npm install                # plain install, xrpl@5.2.0-beta.1 exact — see "xrpl.js version" below
node seed.mjs status       # read-only: vault/broker/loan state + current phase, always safe to run
node seed.mjs <step>       # run one step (see STEPS in seed.mjs); each is a real on-chain transaction
node --check seed.mjs      # syntax-check after editing; there is no test suite or linter in this repo
```

Steps are defined in the `STEPS` map at the bottom of `seed.mjs`: `accounts`, `vault`, `subscribe`, `reject-sub`, `invest`, `reject-inv`, `pay`, `redeem`, `reject-red`, `impair`, `default`, `status`, `cover-topup`, `invest2`, `pay2`, `finish-phase4`, `deposit-custom`. Run `node seed.mjs` with no argument to print the current list. Any step can target a different vault by setting `STATE_FILE` (e.g. `STATE_FILE=state3.json node seed.mjs status`) and, for a fresh vault's dates, `SUBSCRIPTION_MINUTES`/`INVESTMENT_MINUTES`.

## Architecture

**Everything is driven by real wall-clock time.** `VaultCreate` fixes `SubscriptionDate`/`RedemptionDate` immutably at creation (`CFG.subscriptionMinutes` / `CFG.investmentMinutes` in `seed.mjs`), and the Devnet enforces them for real — there is no time travel. `node seed.mjs status` prints the current phase computed from these dates; always check it before assuming which transactions are legal right now.

**State lives in `state.json`** (gitignored, contains wallet seeds — never commit it). Every step loads it, mutates it, and saves it back; `s.txs` / `s.rejections` accumulate a log of every transaction attempted. `tx-links.md` is populated automatically by `logTx()` on every `tesSUCCESS` — don't hand-edit it.

**`xrpl.js` version: `5.2.0-beta.1` exact, per the official brief for Track 2.** The project was wrongly pinned to `5.2.0-beta.0` for most of the build (from secondary planning material, not the official brief) and hit a real bug there: `signLoanSetByCounterparty` signed with the plain transaction hash prefix (STX) instead of the counterparty prefix (CST) XLS-66 requires, rejecting every double-signed `LoanSet`. It was worked around twice — a local reimplementation in `seed.mjs`, and a `patch-package` patch — before checking upstream and finding `5.2.0-beta.1` (and stable `5.2.0`) already fix it natively. The project now runs on the required `5.2.0-beta.1`; both workarounds are gone, `seed.mjs` imports `signLoanSetByCounterparty` straight from `xrpl`. Full writeup, including the version-mismatch discovery itself, is in `FEEDBACK.md`.

**LoanPay is not lenient about lateness — it needs a flag.** Per XLS-66 §3.11.4.2: once `currentTime >= Loan.NextPaymentDueDate`, `LoanPay` fails `tecEXPIRED` unless the transaction sets `Flags: LoanPayFlags.tfLoanLatePayment`. `GracePeriod` does **not** extend the payment window — it only delays when the broker becomes eligible to call `LoanManage` impair/default. In practice, submission + ledger-validation lag means a payment made "right at" the due date can still land a few seconds late and needs the flag; a ~15-20s safety margin past the due date avoided a separate `tecTOO_SOON` observed when cutting it too close. `payScheduled()` in `seed.mjs` (the `pay2` step) implements this correctly; the original `pay()` step (single-shot, no flag) is kept only because it's what the first loan's rejection/feedback evidence is based on.

**Two loans on the same vault/broker.** The first loan (`s.loanId`, created by `invest`) missed its entire payment schedule (all 4 windows expired before `pay` was first called) and is permanently unpayable — it's kept as-is because it's the source of a captured `tecEXPIRED` feedback entry. `s.loanId2` (created by `investFresh` / the `invest2` step) is the loan that actually gets repaid; `finish-phase4` runs cover top-up → `invest2` → `payScheduled` end to end. A second loan on the same broker needs extra `LoanBrokerCoverDeposit` first, since `CoverRateMinimum` is checked against total `DebtTotal` across all of the broker's loans.

**`tfVaultDonation` does not exist.** Despite being referenced in secondary planning material for this event, there is no donation flag on `VaultDeposit` in this xrpl.js version, in `ripple-binary-codec`'s definitions, or in the current XLS-65 spec/xrpl.org reference (confirmed: "There are no flags defined for VaultDeposit transactions"). The vault's yield mechanism is `LoanPay` itself: repayment raises `AssetsTotal` by the interest portion only (principal repayment is asset-neutral, since the outstanding loan was already counted as a vault asset) — cash-basis interest recognition, not a separate injection step.

**`xrpl-devex-hook/` is a vendored, separately-git-tracked tool**, not part of this app. It captures XRPL developer-experience feedback (`/xrpl-feedback`, `/xrpl-status`, `/xrpl-session-analysis`, `/xrpl-setup` skills) into `.xrpl-devex/` and reports to the event organizer. Its own docs (`xrpl-devex-hook/README.md`, `docs/TAXONOMY.md`) are authoritative for how it works; nothing in this app depends on it.

## Front-end (`web/`)

Next.js 16 (App Router) + TypeScript + Tailwind v4, scaffolded per `design/architecture.md` and styled per `design/design.md` (colours, type, spacing, components) and `design/copy-deck.md` (all UI strings — never invent copy). All planned pages are built: `/` (marketplace), `/campaign/[id]`, `/dashboard`, `/positions`, `/console` (the demo/jury page), and an honest stub at `/campaign/new`.

**Deliberate deviations from `design/architecture.md`,** made under deadline pressure — reconcile if more time appears:
- **No `state/deployment.json` and no `lib/xrpl/*.mjs` extraction.** The root `state*.json` files (from `seed.mjs`) are the only source of truth; `web/` never talks to the ledger directly. Two small root-level scripts front it: `read-state.mjs` (read-only ledger snapshot: vault, broker, loan, lenders, txs, rejections, PPS — takes `STATE_FILE` as an env var so it can serve any vault) and `run-action.mjs <step>` (spawns one whitelisted `seed.mjs` step and reports exactly the new tx/rejection rows it produced). `web/src/app/api/state`, `api/manage` and `api/deposit` are thin wrappers that `spawnSync` these two scripts from the repo root, each validating the requested `state*.json` against a hardcoded allowlist before passing it through as an env var. This reuses the already-debugged transaction logic instead of re-deriving it in TypeScript. `api/state` caches its result 3s per state file — every page fetches it on load, and each call opens a fresh Devnet WebSocket (~3s), so navigating pages in quick succession was re-paying that cost every time.
- **Three vaults, not one.** `state.json` is the original, fully-cycled vault (`after-oclock` campaign, now in Redemption — its Lend button is correctly disabled, deposits are closed by the protocol). `state2.json` is the second vault for the impair/default scenario. `state3.json` is a vault created purely so the marketplace's Lend button has something real, currently open, to deposit into (`subterranean-004` campaign, Subscription window open ~20h from creation to span past the pitch). `web/src/lib/campaigns.ts`'s `Campaign.stateFile` field says which backs which; campaigns without a `stateFile` (the two other static marketplace cards) are pure seed content with no vault behind them, and their Lend button says so.
- **Tailwind v4, not v3.** `create-next-app` scaffolded the CSS-first config (`@theme` in `web/src/app/globals.css`), not a `tailwind.config.ts`. All of design.md §8's tokens (colours, `bg-brand`/`bg-header`/`bg-fade` gradients, radii, `shadow-glow`) are ported there as `--color-*` / `--background-image-*` / `--radius-*` / `--shadow-*` custom properties. Font family is Syne/Raleway/JetBrains Mono per design.md §3 (copy-deck and design.md agree on this trio; an earlier draft of prompts.md said Poppins — design.md wins per its own §11.4 precedence rule).
- **`tfVaultDonation` doesn't exist** (see above) — the console's "happy path" and `PPSCard` do not call a donate endpoint. There is no `/api/donate` route. The PPS proof instead shows the real mechanism: `LoanPay` repayment raising `AssetsTotal`.
- **The three guardrail rejections on `/console`** (for the `after-oclock` vault) **are shown as historical record, not live-retriggerable.** They were captured for real while that vault was actually in Subscription/Investment; those phases are now permanently in the past for it (dates are immutable, see above), so re-submitting them now would hit different, less meaningful ledger states. `GuardrailCard` renders the stored `rejections` from `state.json` with their real hashes.
- **The "happy path" repay/redeem buttons on `/console` are disabled with a receipt shown below them**, not live either — `after-oclock`'s second loan is already fully repaid and both lenders already redeemed. The **impair/default buttons are live** (loan #1 never received a payment and is untouched), which is why they're the ones actually wired to `/api/manage`.

## Deliverables the brief expects

`FEEDBACK.md` must be written by hand by the developer, not generated — see the format convention already used in the file and the six Track 2 questions listed in `CONTEXTE.md` §10. Do not draft or expand this file's content on the developer's behalf.
