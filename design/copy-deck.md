# bangerz — copy-deck.md

Every string in the product. **Authoritative.** If a string isn't here, it isn't in the UI — ask for it rather than inventing it.

**Rules baked into this deck:**
- English only. No French anywhere in the interface.
- `bangerz` is always lowercase, mid-sentence included.
- The asset is `XRP`, never `XRPL`. No dollar figures anywhere.
- Display headings end in a period. Card titles, labels, buttons never do.
- `label` and `chip` strings are written here in caps because they render in caps.
- Marketing surfaces say *invest / investor*. Everything inside the app says *lend / lender / yield*. The boundary is the campaign hero CTA.
- Banned in every string: "returns", "APY", "guaranteed", "risk-free", "safe", "no risk".

---

## §1 Global

### 1.1 Nav

| Slot | String |
|---|---|
| Wordmark | `bangerz` |
| Links | `campaigns` · `explore` · `organise` · `invest` |
| Account (unauth) | `Log in` |
| CTA | `Create a new party` |
| Network chip | `XRP Devnet` |

### 1.2 Footer

| Slot | String |
|---|---|
| Tagline | `Nightlife crowdlending infrastructure on the XRP Ledger.` |
| Links | `Protocol docs` · `Risk framework` · `Ledger explorer` · `Terms` |
| Status | `Devnet · test funds only` |

### 1.3 Button states

Every on-chain button moves through four states. Never a bare spinner.

| State | String |
|---|---|
| idle | *the action label, e.g.* `Lend 250 XRP` |
| signing | `Waiting for your signature…` |
| submitting | `Submitting to the ledger…` |
| done | *button returns to idle; the receipt carries the outcome* |

### 1.4 Shared micro-copy

| Key | String |
|---|---|
| copy.idle | `Copy` |
| copy.done | `Copied` |
| explorer | `View on explorer` |
| empty.generic | `Nothing here yet.` |
| loading.state | `Reading the ledger…` |
| error.network | `Could not reach the ledger. Retrying.` |
| amount.unit | `XRP` |
| shares.unit | `MPT` |

### 1.5 Status chips

| Chip | Colour | When |
|---|---|---|
| `100% FUNDED` | ok | target reached |
| `FUNDING` | community | subscription open, below target |
| `READY TO DRAW` | warn | loan set, not drawn |
| `DRAWN` | community | principal drawn down |
| `REPAID` | ok | principal + yield back in the vault |
| `READY TO REDEEM` | ok | redemption open, position settleable |
| `EARNING` | community | position held, before redemption |
| `IMPAIRED` | warn | `tfLoanImpair` applied |
| `DEFAULTED` | bad | `tfLoanDefault` applied |
| `LOSS COVERED` | warn | cover absorbed the shortfall |
| `SETTLED` | ink-muted | position closed |

---

## §2 `/` Marketplace

### 2.1 Hero

| Slot | String |
|---|---|
| Eyebrow | `Closed-ended vaults · XLS-65 / XLS-66 on XRP Devnet` |
| Headline | `fund the night.` / `get paid back.` — gradient on `the night.` only |
| Subhead | `Organisers post first-loss capital. The community lends the rest through auditable vaults. Everything settles on the XRP Ledger.` |
| Primary CTA | `Invest in a campaign` |
| Secondary CTA | `Start a campaign` |
| Trust line *(replaces the fake reviews — see design.md §6)* | `Settled on the XRP Ledger · every transaction publicly verifiable` |

**Removed on purpose:** the `★★★★★ 4.9 sur 19k avis` block, and any aggregate stat strip (`total lent`, `historical default`, `completed vaults`). bangerz has no history yet; inventing one in front of the jury costs more than the slot is worth.

### 2.2 Listing

| Slot | String |
|---|---|
| Section title | `Open campaigns.` |
| Section meta | `{n} vaults accepting deposits` |
| Filters | `all campaigns` · `party` · `festival` · `funding soon` · `closing soon` |
| Search placeholder | `Venue, city or collective…` |
| Sort | `Sort: closing soonest` |
| Empty | `No campaign matches these filters.` |

### 2.3 Campaign card

| Slot | String |
|---|---|
| Organiser line | `{organiser}` |
| Location row | `{venue}, {city}` |
| Date row | `{weekday}, {d} {month} {year}` |
| Label | `FIXED YIELD` |
| Label | `TENOR / LOAN` |
| Tenor value | `{n} days` |
| Label | `RAISED` |
| Label | `GOAL` |
| Bar caption | `{cover} XRP cover · {lent} XRP lent · {remaining} XRP to go` |
| Bar caption, funded | `{cover} XRP cover · {lent} XRP lent · fully funded` |
| Deadline | `Subscription closes in {countdown}` |
| CTA | `View the campaign` |

---

## §3 `/campaign/[id]`

### 3.1 Header

| Slot | String |
|---|---|
| Breadcrumb | `all campaigns` › `{campaign title}` |
| Title | `{campaign title}` *(no trailing period — it's content, not a display heading)* |
| Meta row | `{address}` · `{venue}` · `{weekday} {d} {month} · {start}–{end}` |
| Hero CTA | `Invest in the campaign` |

### 3.2 Funding block

| Slot | String |
|---|---|
| Section title | `Campaign funding.` *(not `Campaigns investments.`)* |
| Label | `RAISED TILL NOW` |
| Label | `GOAL` |
| Label | `FIXED YIELD` |
| Label | `TENOR / LOAN` |
| Bar caption | `{cover} XRP cover · {lent} XRP lent · {remaining} XRP to go` |
| Cover footnote | `Cover is the organiser's own capital, deposited before the community's.` |

### 3.3 About

| Slot | String |
|---|---|
| Section title | `About this night.` |
| Body | *organiser-supplied, English* |
| Subhead | `What the loan pays for.` |
| Subhead | `What lenders should know.` |

### 3.4 Loan timeline

| Slot | String |
|---|---|
| Section title | `Loan lifecycle.` |
| Step 1 | `Cover deposited` — `The organiser's first-loss capital is locked in the vault.` |
| Step 2 | `Community subscription` — `Lenders deposit XRP and receive vault shares.` |
| Step 3 | `Loan issued` — `The loan is set by both parties and drawn down by the organiser.` |
| Step 4 | `Repayment` — `Ticket revenue repays principal. Interest enters the vault as a donation.` |
| Step 5 | `Redemption` — `Lenders withdraw at the final price per share.` |
| Step status | `COMPLETED` · `ACTIVE` · `PENDING` |

### 3.5 Lend panel

| Slot | String |
|---|---|
| Title | `Back this bangerz` |
| Meta | `FIXED YIELD: {rate}%` · `REPAYMENT ON {d} {month} {year}` |
| Field label | `Amount to lend` |
| Field hint | `min {min} XRP` |
| Quick-add | `+50` `+100` `+150` `+200` `+250` `MAX` |
| Summary label | `PRINCIPAL` |
| Summary label | `PROJECTED YIELD ({rate}%)` |
| Summary label | `TOTAL PAYOUT` |
| Cover note | `First {cover} XRP covered by organiser` |
| CTA | `Lend {amount} XRP` |
| Risk line *(directly under the CTA)* | `First-loss cover absorbs losses before yours. It does not remove your risk.` |
| Balance | `Available balance: {balance} XRP` |
| Error, below min | `Minimum deposit is {min} XRP.` |
| Error, above balance | `That's more than this account holds.` |
| Error, above remaining | `Only {remaining} XRP left in this vault.` |

### 3.6 Activity

| Slot | String |
|---|---|
| Section title | `Activity.` |
| Empty | `No ledger activity in this session yet.` |

---

## §4 Phase & gating

### 4.1 PhaseStrip

| Slot | String |
|---|---|
| Labels | `Subscription` · `Investment` · `Redemption` |
| Active countdown | `{next phase} opens in {countdown}` |
| Final phase countdown | `Redemption closes in {countdown}` |
| Phase caption, subscription | `Deposits and withdrawals are open. No loan can be issued yet.` |
| Phase caption, investment | `The vault is closed. The loan is live and being serviced.` |
| Phase caption, redemption | `Withdrawals are open at the final price per share.` |

### 4.2 Gate reasons

Returned by `gate(phase, action)` and rendered in `warn` directly beneath the disabled button. Never a tooltip, never silence.

| Action blocked in | Reason string |
|---|---|
| deposit · Investment | `Deposits closed when the subscription window ended.` |
| deposit · Redemption | `This vault is in redemption. It no longer accepts deposits.` |
| withdraw · Investment | `Withdrawals are locked while the loan is outstanding.` |
| loanSet · Subscription | `The loan can only be issued once subscription closes.` |
| loanSet · Redemption | `Redemption has opened. No new loan can be issued.` |
| repay · Subscription | `There is no outstanding loan to repay yet.` |
| redeem · Subscription | `Redemption opens {date}.` |
| redeem · Investment | `Redemption opens {date}.` |
| drawdown · Subscription | `Funds can be drawn once the loan is issued.` |
| drawdown, already drawn | `This loan has already been drawn down.` |

---

## §5 `/dashboard` — organiser

| Slot | String |
|---|---|
| Page title | `Your campaign.` |
| Subtitle | `{campaign title}` |
| Meta | `{address}` |
| Action | `Export transaction log` |
| Section title | `Your loan.` |
| Label | `CAPITAL STATE` |
| Label | `YOUR COVER` |
| Label | `COMMUNITY DEPOSITS` |
| Label | `PRINCIPAL` |
| Label | `OUTSTANDING BALANCE` |
| Label | `RATE OFFERED` |
| Label | `NEXT PAYMENT DUE` |
| Cover note | `Your first-loss capital, locked ahead of every lender.` |
| Section title | `Activity.` |

### 5.1 Drawdown

| Slot | String |
|---|---|
| Title | `Draw down your funds` |
| Body | `Move the borrowed capital to your operating wallet to pay the venue deposit, sound rental and crew advances.` |
| Label | `AVAILABLE TO DRAW` |
| Label | `DESTINATION WALLET` |
| Label | `NETWORK FEE` |
| CTA | `Draw down {amount} XRP` |

### 5.2 Repayment

| Slot | String |
|---|---|
| Title | `Repay from ticket revenue` |
| Body | `Send principal back to the vault, then pay the interest in as a donation. Lenders can redeem immediately after.` |
| Field label | `Amount to repay` |
| Quick-add | `+2,500` `+5,000` `FULL` |
| CTA | `Repay {amount} XRP` |
| Donation title | `Pay the interest in` |
| Donation body | `Interest enters the vault as a donation. The price per share rises and no new shares are issued — this is what pays your lenders.` |
| Donation CTA | `Pay in {amount} XRP interest` |

---

## §6 `/positions` — lender

| Slot | String |
|---|---|
| Page title | `Your positions.` |
| Subtitle | `Track your vault shares, accrued yield, and redeem principal on maturity across XRP Ledger vaults.` |
| Filters | `all positions ({n})` · `earning ({n})` · `ready to redeem ({n})` · `settled ({n})` |
| Label | `TOTAL LENT` |
| Label | `CURRENT VALUE` |
| Label | `ACCRUED YIELD` |
| Label | `POSITIONS` |
| Cover banner | `Covered by the organiser's first-loss capital, ahead of your position.` |
| Empty | `You haven't lent to a campaign yet.` |
| Empty CTA | `Browse open campaigns` |

### 6.1 Position card

| Slot | String |
|---|---|
| Label | `VAULT SHARES` |
| Label | `DEPOSITED` |
| Label | `CURRENT VALUE` |
| Label | `YIELD` |
| Yield value | `+{amount} XRP ({rate}% fixed)` |
| Maturity | `Maturity countdown` |
| Maturity meta | `{n} days remaining of {total}` |
| Cover line | `{amount} XRP organiser cover locked ahead of your position` |
| CTA, open | `Redeem {amount} XRP` |
| CTA, blocked | `Redemption opens {d} {month} {year}` |
| CTA, settled | `Settled and redeemed` |
| Loss-covered note | `The loan defaulted. The organiser's first-loss capital absorbed {pct}% of your position. {amount} XRP returned to your wallet.` |

---

## §7 `/console` — demo

| Slot | String |
|---|---|
| Eyebrow | `Developer and jury instrumentation` |
| Page title | `Demo console.` |
| Subtitle | `Every flow in this product is triggered on-ledger. Nothing here is mocked.` |
| Label | `ACTIVE KEY` |
| Label | `LIQUID BALANCE` |
| Persona switcher | `platform / broker` · `organiser` · `lender A` · `lender B` |

### 7.1 Happy path

| Slot | String |
|---|---|
| Group title | `Happy path lifecycle` |
| Group body | `Full lifecycle from loan settlement through ticket-revenue repayment to lender redemption.` |
| Step 1 | `Simulate ticket revenue and repay in full` → CTA `Trigger full loan repayment` |
| Step 2 | `Pay the interest into the vault` → CTA `Donate {amount} XRP interest` |
| Step 3 | `Redeem lender positions` → CTA `Redeem vault shares` |

### 7.2 Failure path

| Slot | String |
|---|---|
| Group title | `Failure path and cover waterfall` |
| Group body | `Adverse lifecycle: impairment, default declaration, and the broker cover absorbing the shortfall.` |
| Step 1 | `Mark the loan impaired` → CTA `Impair loan` |
| Step 2 | `Declare default and mobilise cover` → CTA `Default loan` |
| Outcome note | `{amount} XRP of cover distributed. {pct}% loss reached the community.` |

### 7.3 Guardrails

| Slot | String |
|---|---|
| Group title | `Protocol guardrails` |
| Group body | `Phase rules are enforced by the ledger, not by this interface. These submit anyway so the rejection is real.` |
| Guardrail 1 | `Deposit during Investment` → CTA `Attempt deposit during Investment` |
| Guardrail 2 | `Withdraw during Investment` → CTA `Attempt withdrawal during Investment` |
| Guardrail 3 | `Issue a loan during Redemption` → CTA `Attempt loan during Redemption` |

### 7.4 PPSCard

| Slot | String |
|---|---|
| Title | `Price per share` |
| Label | `ASSETS TOTAL` |
| Label | `SHARES TOTAL` |
| Label | `PRICE PER SHARE` |
| Delta | `+{pct}%` |
| Caption | `Interest entered the vault as a donation. No shares were issued, so every existing share is worth more.` |

### 7.5 Session log

| Slot | String |
|---|---|
| Section title | `Session transactions.` |
| Meta | `{n} recorded · {n} validated · {n} rejected` |
| Columns | `HASH` · `TYPE` · `ACTION` · `ENGINE RESULT` · `LEDGER` · `TIME` · `EXPLORER` |
| Row link | `view` |
| Export | `Export transaction log (.json)` |
| Empty | `No transaction in this session yet. Run the happy path to start.` |

---

## §8 Receipts, rejections, errors

### 8.1 TxReceipt

| Slot | String |
|---|---|
| Chip, validated | `VALIDATED` |
| Chip, rejected | `REJECTED` |
| Label | `TYPE` |
| Label | `HASH` |
| Label | `ENGINE RESULT` |
| Label | `LEDGER` |
| Link | `View on explorer` |
| Pending | `Waiting for validation…` |

### 8.2 GuardrailCard

| Slot | String |
|---|---|
| Heading | `Rejected by the protocol` *(white, never red)* |
| Row | `ATTEMPTED` |
| Row | `WHY` |
| Row | `ENGINE RESULT` |
| Footer | `This is the protocol enforcing its own rules. The transaction never touched the vault and no capital moved.` |

### 8.3 `WHY` strings by engine result

Plain language, one sentence. Never show a raw code without one of these beside it.

| Code | Why string |
|---|---|
| `tecNO_PERMISSION` | `This account isn't permitted to perform this action on this vault.` |
| `tecWRONG_ASSET` | `The vault only accepts XRP. The submitted asset doesn't match.` |
| `tecINSUFFICIENT_RESERVE` | `The account doesn't hold enough XRP to cover the ledger reserve for a new object.` |
| `tecINSUFFICIENT_FUNDS` | `The account balance doesn't cover this amount.` |
| `tecLIMIT_EXCEEDED` | `This exceeds the limit set on the vault or the loan.` |
| `tecOBJECT_NOT_FOUND` | `The vault, broker or loan referenced here doesn't exist on this ledger.` |
| `tecPATH_DRY` | `The ledger couldn't fund this transfer.` |
| `temBAD_SIGNER` | `The counterparty signature is missing or doesn't serialise correctly.` |
| `temMALFORMED` | `The transaction is malformed and was never submitted.` |
| *fallback* | `The ledger rejected this transaction. The code below is the exact reason.` |

### 8.4 Default and impairment

| Slot | String |
|---|---|
| Impaired heading | `Loan marked impaired` |
| Impaired body | `The organiser has flagged repayment as at risk. Cover has not yet been mobilised.` |
| Default heading | `Loan defaulted` |
| Default body | `The loan reached maturity unpaid. The organiser's first-loss cover is being applied to lender positions.` |
| Cover outcome | `{amount} XRP of cover applied. Lenders recovered {pct}% of principal.` |

### 8.5 Not-yet states

Rendered when a key in `deployment.json` is empty. Never a crash, never a blank screen.

| Missing | String |
|---|---|
| `vault.id` | `The vault hasn't been created on the ledger yet.` |
| `broker.id` | `No loan broker set up for this campaign yet.` |
| `loan.id` | `No loan issued yet. It can be set once subscription closes.` |
| `campaign` | `No campaign seeded on this ledger yet.` |
| deployment absent | `No deployment found. Run the seed script to create the vault.` |

---

## §9 Strings to never write

| Never | Write instead |
|---|---|
| `XRPL 250` / `250 XRPL` | `250 XRP` |
| `10,000$` / any dollar figure | `10,000 XRP` |
| `APY` / `returns` | `fixed yield` |
| `guaranteed` / `risk-free` / `safe` | *nothing — say what the cover does and doesn't do* |
| `Campaigns investments.` | `Campaign funding.` |
| `4.9 sur 19k avis` | `Settled on the XRP Ledger · every transaction publicly verifiable` |
| `Error` / `Failed` on a `tec*` | `Rejected by the protocol` |
| `Investors` *(inside the app)* | `Lenders` |
| `BANGERZ` / `Bangerz` | `bangerz` |
