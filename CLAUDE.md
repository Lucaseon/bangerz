# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BANGERZ: a demo of an XRPL closed-ended Vault (XLS-65) + Lending Protocol (XLS-66, V1.1) loan broker cycle, built for the XRPL Lending Protocol Hackathon (DeVinci Blockchain × Ripple). Track 2, Vanilla flavour. The chain-facing side is one seeding/demo script (`seed.mjs`) run step by step against the Public XRPL Devnet; `web/` is a Next.js front reading that same state, plus a vendored DevEx feedback-capture tool.

Read `CONTEXTE.md` first in any session — it holds the current on-chain state (vault/loan/broker IDs, current phase, what's done vs. pending) and the hackathon deadlines. It changes throughout the event; this file does not.

## Commands

```
npm install                # runs patch-package via postinstall, see "The counterparty-signing patch" below
node seed.mjs status       # read-only: vault/broker/loan state + current phase, always safe to run
node seed.mjs <step>       # run one step (see STEPS in seed.mjs); each is a real on-chain transaction
node --check seed.mjs      # syntax-check after editing; there is no test suite or linter in this repo
```

Steps are defined in the `STEPS` map at the bottom of `seed.mjs`: `accounts`, `vault`, `subscribe`, `reject-sub`, `invest`, `reject-inv`, `pay`, `redeem`, `reject-red`, `impair`, `default`, `status`, `cover-topup`, `invest2`, `pay2`, `finish-phase4`. Run `node seed.mjs` with no argument to print the current list.

## Architecture

**Everything is driven by real wall-clock time.** `VaultCreate` fixes `SubscriptionDate`/`RedemptionDate` immutably at creation (`CFG.subscriptionMinutes` / `CFG.investmentMinutes` in `seed.mjs`), and the Devnet enforces them for real — there is no time travel. `node seed.mjs status` prints the current phase computed from these dates; always check it before assuming which transactions are legal right now.

**State lives in `state.json`** (gitignored, contains wallet seeds — never commit it). Every step loads it, mutates it, and saves it back; `s.txs` / `s.rejections` accumulate a log of every transaction attempted. `tx-links.md` is populated automatically by `logTx()` on every `tesSUCCESS` — don't hand-edit it.

**The counterparty-signing patch.** `xrpl@5.2.0-beta.0`'s `signLoanSetByCounterparty` signs with the wrong hash prefix (`HashPrefix.transactionSig` / STX instead of the required `HashPrefix.counterpartyTransactionSig` / CST for XLS-66 counterparty signatures), so any double-signed `LoanSet` it produces is rejected. This is fixed twice, independently: a local reimplementation in `seed.mjs` (`signLoanSetByCounterparty`, using `encodeForSigningCounterparty` from `ripple-binary-codec` directly), and `patches/xrpl+5.2.0-beta.0.patch`, applied to `node_modules` by `patch-package` on `postinstall`. If you bump the `xrpl` version, re-check whether this is fixed upstream before assuming the patch still applies.

**LoanPay is not lenient about lateness — it needs a flag.** Per XLS-66 §3.11.4.2: once `currentTime >= Loan.NextPaymentDueDate`, `LoanPay` fails `tecEXPIRED` unless the transaction sets `Flags: LoanPayFlags.tfLoanLatePayment`. `GracePeriod` does **not** extend the payment window — it only delays when the broker becomes eligible to call `LoanManage` impair/default. In practice, submission + ledger-validation lag means a payment made "right at" the due date can still land a few seconds late and needs the flag; a ~15-20s safety margin past the due date avoided a separate `tecTOO_SOON` observed when cutting it too close. `payScheduled()` in `seed.mjs` (the `pay2` step) implements this correctly; the original `pay()` step (single-shot, no flag) is kept only because it's what the first loan's rejection/feedback evidence is based on.

**Two loans on the same vault/broker.** The first loan (`s.loanId`, created by `invest`) missed its entire payment schedule (all 4 windows expired before `pay` was first called) and is permanently unpayable — it's kept as-is because it's the source of a captured `tecEXPIRED` feedback entry. `s.loanId2` (created by `investFresh` / the `invest2` step) is the loan that actually gets repaid; `finish-phase4` runs cover top-up → `invest2` → `payScheduled` end to end. A second loan on the same broker needs extra `LoanBrokerCoverDeposit` first, since `CoverRateMinimum` is checked against total `DebtTotal` across all of the broker's loans.

**`tfVaultDonation` does not exist.** Despite being referenced in secondary planning material for this event, there is no donation flag on `VaultDeposit` in this xrpl.js version, in `ripple-binary-codec`'s definitions, or in the current XLS-65 spec/xrpl.org reference (confirmed: "There are no flags defined for VaultDeposit transactions"). The vault's yield mechanism is `LoanPay` itself: repayment raises `AssetsTotal` by the interest portion only (principal repayment is asset-neutral, since the outstanding loan was already counted as a vault asset) — cash-basis interest recognition, not a separate injection step.

**`xrpl-devex-hook/` is a vendored, separately-git-tracked tool**, not part of this app. It captures XRPL developer-experience feedback (`/xrpl-feedback`, `/xrpl-status`, `/xrpl-session-analysis`, `/xrpl-setup` skills) into `.xrpl-devex/` and reports to the event organizer. Its own docs (`xrpl-devex-hook/README.md`, `docs/TAXONOMY.md`) are authoritative for how it works; nothing in this app depends on it.

## Front-end (`web/`)

Next.js 16 (App Router) + TypeScript + Tailwind v4, scaffolded per `design/architecture.md` and styled per `design/design.md` (colours, type, spacing, components) and `design/copy-deck.md` (all UI strings — never invent copy). Only `/console` is built (the demo/jury page); `design/architecture.md` itself prioritizes console → one campaign page → the rest, and marketplace/campaign/dashboard/positions were cut for time.

**Deliberate deviations from `design/architecture.md`,** made under deadline pressure — reconcile if more time appears:
- **No `state/deployment.json` and no `lib/xrpl/*.mjs` extraction.** The existing root `state.json` (from `seed.mjs`) is the only source of truth; `web/` never talks to it directly. Instead, two small root-level scripts front it: `read-state.mjs` (read-only ledger snapshot: vault, broker, loan, txs, rejections, PPS) and `run-action.mjs <step>` (spawns one whitelisted `seed.mjs` step — currently `impair`/`default` — and reports exactly the new tx/rejection rows it produced). `web/src/app/api/state` and `web/src/app/api/manage` are thin wrappers that `spawnSync` these two scripts from the repo root. This reuses the already-debugged transaction logic (the `tfLoanLatePayment` fix, the timing margins, the `reject-red` label fix) instead of re-deriving it in TypeScript.
- **Tailwind v4, not v3.** `create-next-app` scaffolded the CSS-first config (`@theme` in `web/src/app/globals.css`), not a `tailwind.config.ts`. All of design.md §8's tokens (colours, `bg-brand`/`bg-header`/`bg-fade` gradients, radii, `shadow-glow`) are ported there as `--color-*` / `--background-image-*` / `--radius-*` / `--shadow-*` custom properties. Font family is Syne/Raleway/JetBrains Mono per design.md §3 (copy-deck and design.md agree on this trio; an earlier draft of prompts.md said Poppins — design.md wins per its own §11.4 precedence rule).
- **`tfVaultDonation` doesn't exist** (see above) — the console's "happy path" and `PPSCard` do not call a donate endpoint. There is no `/api/donate` route. The PPS proof instead shows the real mechanism: `LoanPay` repayment raising `AssetsTotal`.
- **The three guardrail rejections are shown as historical record, not live-retriggerable.** They were captured for real while this vault was actually in Subscription/Investment; those phases are now permanently in the past for this vault (dates are immutable, see above), so re-submitting them now would hit different, less meaningful ledger states. `GuardrailCard` renders the stored `rejections` from `state.json` with their real hashes.
- **The "happy path" repay/redeem buttons are disabled with a receipt shown below them**, not live either — this vault's second loan is already fully repaid and both lenders already redeemed. The **impair/default buttons are live** (loan #1 never received a payment and is untouched), which is why they're the ones actually wired to `/api/manage`.

## Deliverables the brief expects

`FEEDBACK.md` must be written by hand by the developer, not generated — see the format convention already used in the file and the six Track 2 questions listed in `CONTEXTE.md` §10. Do not draft or expand this file's content on the developer's behalf.
