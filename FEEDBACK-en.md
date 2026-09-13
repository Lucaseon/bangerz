# FEEDBACK.md — XLS-65 (Vaults) & XLS-66 (Loans)

**Track:** 2, closed-ended vault · **Flavour:** Vanilla
**Environment:** Public XRPL Devnet — `wss://s.devnet.rippletest.net:51233/` · explorer `https://devnet.xrpl.org`
**Library:** `xrpl@5.2.0-beta.1` (the version required by the Track 2 brief)

**Version note, please read first.** We built most of this project on `xrpl@5.2.0-beta.0`, taken from a secondary planning document, before re-reading the brief and discovering that Track 2 requires `5.2.0-beta.1`. We upgraded late in the weekend and the project now runs on the required version. This has a direct consequence for the first entry below: the counterparty-signature bug we spent several hours diagnosing **does not exist in `5.2.0-beta.1`**. We are reporting it anyway, because the diagnosis is still useful to anyone who lands on `beta.0`, and because the error message that misled us has not changed. Each entry states the version it was observed on.

---

## [client libraries] `signLoanSetByCounterparty` produces a signature `rippled` rejects

**Where exactly:** `xrpl@5.2.0-beta.0`, `Wallet/counterpartySigner.js` line 48, and `Wallet/utils.js` (`computeSignature`).

**What I was trying to do:** originate a dual-signature `LoanSet`. Flow: `client.autofill(loanSet)` → `broker.sign()` → `signLoanSetByCounterparty(borrower, tx_blob)` → `submitAndWait(tx_blob)`.

**Expected vs actual:** `RippledError: fails local checks: Counterparty: Invalid signature.` — rejected at the node's local check every time, never reaching consensus.

**Root cause:** `counterpartySigner.js` builds the signature like this:

```javascript
tx.CounterpartySignature = {
  SigningPubKey: wallet.publicKey,
  TxnSignature: computeSignature(tx, wallet.privateKey),
}
```

`computeSignature` delegates to `encodeForSigning(tx)`, which applies the ordinary transaction hash prefix `HashPrefix.transactionSig` (`0x53545800`, "STX"). The XLS-66 spec and the `rippled` implementation require the dedicated prefix `HashPrefix.counterpartyTransactionSig` (`0x43535400`, "CST") for a counterparty signature. The correct function `encodeForSigningCounterparty` already existed in `ripple-binary-codec` but was never called.

**Repro:** `originate_loan.mjs` against Ed25519 Devnet accounts, on `xrpl@5.2.0-beta.0`.

**Severity · lib + version:** Blocking on `5.2.0-beta.0`. **Already fixed upstream: `5.2.0-beta.1` and stable `5.2.0` call `computeSignature` with the correct `'counterparty'` role.** Verified by cloning `xrpl.js` (fix present on `main`) and by diffing the published npm tarballs.

**Proposed fix:** none needed on the library — the fix is already shipped. The **error message**, however, still deserves attention: `Counterparty: Invalid signature` points towards a key or algorithm problem (secp256k1 vs Ed25519), when the actual cause is a hash prefix. Distinguishing "cryptographically invalid signature" from "signature computed over the wrong payload" would save hours. Our workaround during the incident: a local helper encoding via `encodeForSigningCounterparty` and signing with `ripple-keypairs.sign` — immediate `tesSUCCESS`.

---

## [protocol design] `Vault.SharesTotal` does not exist — shares live on the MPT issuance

**Where exactly:** the `Vault` ledger object (XLS-65); on our side, `subscription_phase.mjs` line 80 — `const sharesTotal = node.SharesTotal || '0';`

**What I was trying to do:** write a `readState()` function returning `sharesTotal` and computing price per share (`AssetsTotal / SharesTotal`), the central metric of our yield demonstration.

**Expected vs actual:** the `Vault` object has no `SharesTotal` field at all. A live read of our vault lists its exact fields: `Account, Asset, AssetsAvailable, AssetsTotal, Flags, LEVersion, LedgerEntryType, Owner, OwnerNode, PreviousTxnID, PreviousTxnLgrSeq, RedemptionDate, Sequence, ShareMPTID, SubscriptionDate, VaultKind, WithdrawalPolicy, index`. Our code was therefore reading `undefined || '0'` and writing `"sharesTotal": "0"` permanently, **with no error**, regardless of the real share count. The actual count lives on the `MPTokenIssuance` object referenced by `Vault.ShareMPTID`, field `OutstandingAmount` — 46,000,000 at the time of verification, a value the Vault exposes nowhere.

**Repro:** `ledger_entry` on vault `BB47589C98E26F1473293DA2234DA900D34FA1CFAC7A07BF999FC2EFB04BF6AB` (no `SharesTotal`), then `ledger_entry` with `mpt_issuance: "00000001BDD53F52C17E79E22367BE87E10DF77561D391A1"` (`OutstandingAmount: 46000000`), both in the same session.

**Severity · lib + version:** High — a price per share computed on a permanently zero denominator is either a division by zero or a silently wrong number. `xrpl@5.2.0-beta.0`.

**Proposed fix:** document explicitly, in the XLS-65 spec and in the `ShareMPTID` JSDoc, that a **second `ledger_entry` call by `mpt_issuance`** is required to obtain outstanding shares. Price per share being the fundamental metric of a vault, making it unreachable in a single read is counter-intuitive.

---

## [protocol design] `VaultWithdraw.Amount` carries an asset amount, not a share count

**Where exactly:** the `VaultWithdraw` transaction, `Amount` field — `models/transactions/vaultWithdraw.d.ts`.

**What I was trying to do:** expose a withdrawal in our application and name its parameter correctly. An XLS-65 vault issues shares via `ShareMPTID`, so a withdrawal seemed like it should be expressed in shares.

**Expected vs actual:** `Amount` takes an amount of the **underlying asset** in drops. `VaultWithdraw { Amount: xrpToDrops('5') }` returns `tesSUCCESS` and the ledger burns the equivalent in shares at the current price per share. Neither the field name nor its `Amount | MPTAmount` type signals which of the two units is expected.

**Why this is a trap:** the two units are numerically identical as long as price per share equals 1 — which is to say, throughout testing. They diverge the moment the first interest is collected, exactly when the vault becomes interesting. A caller who wrote `Amount = sharesToWithdraw` sees their code keep "working", then withdraw a wrong amount after the first `LoanPay`, with no error raised.

**Repro:** deposit 30 XRP (`AssetsTotal = 30000000`, `OutstandingAmount = 30000000` — the two coincide), withdraw `Amount: "5000000"` → `tesSUCCESS`; raise price per share via a `LoanPay` carrying interest, replay the same withdrawal: the number of shares consumed is no longer the same.

**Severity · lib + version:** Medium. No loss of funds, but a class of silent bug that only manifests under non-zero yield, so rarely in testing. `xrpl@5.2.0-beta.0`, `ripple-binary-codec@2.11.0`.

**Proposed fix:** expose two mutually exclusive fields, `Amount` (asset) and `Shares` (shares), so the caller's intent is explicit and verifiable by the node rather than inferred. Failing that, document the unit in the spec and JSDoc — one sentence is enough: "asset amount, not share count".

---

## [protocol design] `PrincipalRequested` does not exist on the created `Loan` object — it becomes `PrincipalOutstanding`

**Where exactly:** the `LoanSet` transaction vs the `Loan` ledger object (XLS-66).

**What I was trying to do:** read the principal of a freshly originated loan in order to display it.

**Expected vs actual:** `PrincipalRequested` is a field of the `LoanSet` **transaction**, but the created `Loan` object never carries it under that name. The `NewFields` of the created loan: `Borrower, GracePeriod, InterestRate, LoanBrokerID, LoanSequence, NextPaymentDueDate, PaymentInterval, PaymentRemaining, PeriodicPayment, PrincipalOutstanding, StartDate, TotalValueOutstanding`. Code reading `loanObject.PrincipalRequested` receives `undefined` silently.

**Repro:** https://devnet.xrpl.org/transactions/175140ADDD72CF1EE58418A0AD6D5A0295E186F052015AF566F454A2379DB01B — the transaction carries `PrincipalRequested: "25000000"`, the created object's `NewFields` carries `PrincipalOutstanding: "25000000"`.

**Severity · lib + version:** Low to medium — workaroundable with a `??`, but an integrator without that guard will reproduce the bug. `xrpl@5.2.0-beta.0`.

**Proposed fix:** either align the name between the transaction and the object it creates, or document the rename explicitly in the XLS-66 spec.

---

## [documentation] `LoanDrawdown` does not exist — the deferred-drawdown mental model does not apply

**Where exactly:** XLS-66, loan lifecycle.

**What I was trying to do:** implement a drawdown step where the borrower pulls funds after loan origination, following the mental model inherited from conventional lending protocols: open a credit line, then draw on it as needed.

**Expected vs actual:** no `LoanDrawdown` transaction exists. `models/transactions/` contains only `loanSet`, `loanPay`, `loanManage`, `loanDelete`, `loanBroker{Set,Delete,CoverDeposit,CoverWithdraw,CoverClawback}` — confirmed in `ripple-binary-codec/dist/enums/definitions.json` (`TRANSACTION_TYPES.LoanDrawdown === undefined`) and by a case-insensitive grep across both packages: zero occurrences of "drawdown". Tracing the metadata of a validated `LoanSet`, the principal (`PrincipalRequested: 25000000`) is transferred atomically to the `Counterparty` **within that same transaction**: their balance moves from 110,000,000 to 135,000,000 drops. There is nothing left to draw down afterwards.

**Repro:** https://devnet.xrpl.org/transactions/175140ADDD72CF1EE58418A0AD6D5A0295E186F052015AF566F454A2379DB01B — `LoanSet`, `tesSUCCESS`, ledger 5253950.

**Severity · lib + version:** Medium — a cost in design time, no technical impact once understood. `xrpl@5.2.0-beta.0`.

**Proposed fix:** a "lifecycle step → exact `TransactionType`" table in the XLS-66 documentation. That `LoanSet` transfers the principal atomically is a strong and counter-intuitive design decision for anyone arriving from other lending protocols; it deserves to be stated rather than inferred.

---

## [documentation] `tfVaultDonation` does not exist — interest enters natively on `LoanPay`

**Where exactly:** `VaultDeposit` (XLS-65) and the XLS-66 repayment cycle.

**What I was trying to do:** inject interest into the vault after repayment, without issuing shares, via a `VaultDeposit` carrying a donation flag.

**Expected vs actual:** `VaultDeposit` has no flags at all. `TRANSACTION_FLAGS.VaultDeposit` is absent from `definitions.json`, unlike `VaultCreate` which has two (`tfVaultPrivate`, `tfVaultShareNonTransferable`), and the xrpl.org page states explicitly that no flags are defined for this transaction. Any attempt returns `temINVALID_FLAG`. Tracing the real `LoanPay` that repaid our loan, `Vault.AssetsTotal` moves from 30,000,000 to 30,000,229 drops **inside that single transaction's metadata**, with no accompanying `VaultDeposit` and no modification to the `MPTokenIssuance` node — so no shares issued, and price per share rises mechanically.

**Repro:** https://devnet.xrpl.org/transactions/D5F9FDD1FF64236729AC1D1D3340494924EC509CEC4ABD1C063499785217D8B0 — `LoanPay`, `tesSUCCESS`, ledger 5254504, `Amount` 25,000,229 drops.

**Severity · lib + version:** Medium — a lost line of investigation, no blocker. `xrpl@5.2.0-beta.0`, XLS-65.

**Proposed fix:** document explicitly that **crediting interest to `Vault.AssetsTotal` at `LoanPay` time is THE yield mechanism** in V1.1. This is first-order information for an integrator: it determines which transaction to observe in order to build a yield proof, and it prevents the search for a separate donation mechanism that does not exist.

---

## [documentation] `LoanPay` requires a `tfLoanLatePayment` flag documented only in the GitHub spec

**Where exactly:** `LoanPay`; `LoanPayFlags.tfLoanLatePayment` (`0x00040000`). The rule is in XLS-66 §3.11.4.2 on GitHub, absent from the xrpl.org `LoanPay` and `Loan` pages.

**What I was trying to do:** repay an instalment after its due date.

**Expected vs actual:** `tecEXPIRED` as soon as `currentTime >= NextPaymentDueDate` without the flag set (hash `54F874DC1208D1729900816DEC10A01F85C10A36A6C0633362E05E4DECB07A83`). With the flag set: immediate success (hash `A26E1AEEF41BE550D67738BA78A238FE6254A0FA4A077DA6A036AEF5EC274EFF`).

**Repro:** `payScheduled()` in `seed.mjs`.

**Severity · lib + version:** Blocking, 30 minutes lost. `xrpl@5.2.0-beta.0`.

**Proposed fix:** carry the rule onto the xrpl.org `LoanPay` and `Loan` pages. State explicitly that **`GracePeriod` does not extend the payment window**: it only delays the broker's eligibility to `impair`/`default`. This confusion between two similar-looking time windows is the main trap of the repayment flow.

---

## [documentation] `tecTOO_SOON` on a late `LoanPay` with the flag already set — undocumented margin

**Where exactly:** `LoanPay`, immediately after `NextPaymentDueDate`.

**What I was trying to do:** repay an instalment roughly 8 seconds after its due date, with `tfLoanLatePayment` already set.

**Expected vs actual:** `tecTOO_SOON` (hash `EF8FD8AEEB59814A56A70B98D7C2639CED6F69A8D1C2082F965C23196B0F29A7`). A margin of about 20 seconds was enough to make the exact same payment succeed.

**Severity · lib + version:** Annoying. `xrpl@5.2.0-beta.0`.

**Proposed fix:** document the real margin required — presumably tied to ledger validation time — or return a code distinct from `tecTOO_SOON` for this case, which is not "too soon" in the sense of the payment schedule but "too soon" in the sense of propagation.

---

## [UX / engine codes] Phase rejections never say which phase caused them

**Where exactly:** `VaultDeposit`, `VaultWithdraw`, `LoanSet` — any transaction gated by vault phase.

**What I was trying to do:** capture the three phase rejections required by the minimum bar, and surface them to the user with a readable explanation rather than a bare code.

**Expected vs actual:** all three rejections work and are deterministic, but the codes are generic and reference neither the current phase nor the transition date:

| Rejection | Code | Hash |
|---|---|---|
| `VaultDeposit` during Investment | `tecEXPIRED` | `90EEC3D5F64E83802860925302D11CFD8DC5D2547C13E8F35DBBAD3289C24ED2` |
| `VaultWithdraw` during Investment | `tecTOO_SOON` | `6DE52FB750F96F7A4C277A10A12E8351D446270A1CA67C1605CBAE34482704EF` |
| `LoanSet` during Redemption | `tecEXPIRED` | `88F29B1283D101339830E148ED33DBAD6B7A7E857A6B22DCF9F9865F71C3D8DF` |

Worth noting: the same `tecEXPIRED` covers two opposite situations (subscription closed / loan window closed), and `tecTOO_SOON` is also used for an unrelated propagation case (see the previous entry). To build an interface that explains a rejection, you therefore have to cross-reference the code with the phase read separately — the code alone is insufficient.

**Severity · lib + version:** Annoying, not blocking. `xrpl@5.2.0-beta.0`, Devnet.

**Proposed fix:** carry the current phase and transition date in the error response, or introduce distinct codes per cause. A phase rejection is an **expected** event in a closed-ended vault, not an anomaly: it deserves to be as readable as a success.

---

## [other] Unresolved `tecNO_PERMISSION` on a second `LoanSet`

**Where exactly:** `LoanSet`, second vault and second broker.

**What I was trying to do:** create a second loan on a second vault, with parameters structurally identical to a `LoanSet` that had succeeded elsewhere: same broker/owner roles, cover at exactly the 20% threshold, no freeze flags.

**Expected vs actual:** `tecNO_PERMISSION`, reproducibly, three times — hashes `0969BA453CA6E819D5FEE879060FE2917E7A832E3D24401D35E6DE4754569CAB`, `75DFC340C7A1699AA4D2F669B7C2385817AF59A8FA6173BE2B9F228DE1F905C2`, `42EFEA7E0D75C3F7B4BCB7B381A3F285EA3A7A34C374AE645CFDFF6730C738B1`. We checked every failure condition documented in the spec, one by one.

**Severity · lib + version:** Blocking on that second vault; scenario abandoned. `xrpl@5.2.0-beta.0`.

**Proposed fix:** none found — reported as-is. This is the point where we most needed a diagnostic mechanism: `tecNO_PERMISSION` without any indication of **which** permission is missing leaves the integrator with no thread to pull, and we gave up for lack of time rather than for lack of ideas.

---

## [protocol design] Undocumented constraint on the `RedemptionDate` − `SubscriptionDate` gap

**Where exactly:** `VaultCreate`, SDK-side validation.

**What I was trying to do:** shorten the phase windows to allow fast automated tests of the full cycle.

**Expected vs actual:** `RedemptionDate - SubscriptionDate must be within [180, 946708560) seconds`. A minimum three-minute investment phase is imposed by design.

**Severity · lib + version:** Low, but structural for test strategy. `xrpl@5.2.0-beta.0`.

**Proposed fix:** document this bound on the `VaultCreate` page, alongside `SubscriptionDate` and `RedemptionDate`. It directly determines whether an end-to-end test suite is feasible, and you only discover it by hitting it.

---

## [Devnet infra] Public node `s.devnet.rippletest.net:51233` unreachable for over 12 hours

**Where exactly:** the public Track 2 Devnet endpoint. The mirror `wss://clio.devnet.rippletest.net:51233/` was tested too, with the same result.

**What I was trying to do:** read live vault state and submit transactions while building the interface.

**Expected vs actual:** last successful call at ledger close `2026-09-12T18:58:22Z`. After that, on both endpoints, across several attempts spaced out over time and never in a tight loop: `Error: connect() timed out after 15000 ms`, then later an immediate refusal (`connect=0.000000s` on raw TCP to port 51233). The node responded again at ledger close `2026-09-13T07:40:00Z` — an outage of at least 12h30, bounded by those two successful reads. `devnet.xrpl.org` (HTTP) remained reachable throughout the WebSocket port outage, which rules out a general network problem on our workstation.

**Repro:** no hash — this is an absence of response, not a rejection. Reproducible by pointing any `xrpl.js` client at the endpoint during that window.

**Severity · lib + version:** Critical for the duration of the outage — blocks every read and every transaction, with no client-side workaround. Unversioned public endpoint.

**Proposed fix:** for a hackathon with a hard deadline, a single shared public Devnet node is a single point of failure. A documented fallback endpoint, or instructions for running a local `rippled` as a last resort, would prevent an infrastructure outage from consuming a team's working night.

---

## [DX] Opening one `xrpl.Client` per HTTP request degrades the connection rather than absorbing it

**Where exactly:** our own server layer, `withLedger` — initial version, since corrected.

**What I was trying to do:** refresh vault state every 5 seconds from a server route, so phase and price per share update live.

**Expected vs actual:** the first version called `new xrpl.Client(...).connect()` on every route invocation — reasonable for a CLI script that runs once, unsuited to a handler polled every 5 seconds. The log shows the tipping point plainly: after a series of calls at ~2s each, nineteen consecutive `503` responses at ~20s (the connection timeout). We **cannot** claim this behaviour caused the outage described above — it may have been entirely external, and the Clio mirror was equally unreachable — but stacking unclosed WebSocket connections is exactly the kind of load a shared public node eventually refuses.

**Repro:** dev server log, `GET /api/state 503 in 20.2s` repeated nineteen times.

**Severity · lib + version:** Medium, fixed within the same session. `xrpl@5.2.0-beta.0`.

**Proposed fix:** done on our side — cached client, reconnect only when `isConnected()` is false, invalidate on explicit error. On the SDK documentation side: an explicit warning against opening an `xrpl.Client` per request in an HTTP server context would help. It is the most natural integration mistake for anyone coming from the REST world who discovers that an XRPL client is a persistent connection, not a stateless HTTP client.

---

## Answers to the six Track 2 questions

**1. Intuitiveness of the three phases (Subscription / Investment / Redemption).** Broadly clear once the model clicks — the cycle maps well onto a fixed-term use case. The difficulty wasn't the phases themselves but their **coexistence with a second timeline**: the loan payment schedule, with `NextPaymentDueDate` and `GracePeriod`. Two different clocks that look alike, and whose interaction is explained nowhere (see the `tfLoanLatePayment` entry).

**2. Clarity of `VaultKind` / `SubscriptionDate` / `RedemptionDate`.** The naming is clear. What isn't: their **total immutability** after `VaultCreate` — there is no date field in `VaultSet` — is flagged nowhere client-side at creation time. You only discover it by reading the spec, or by getting it wrong. On a network that follows real time and does not rewind, that mistake is permanent. A warning on the `VaultCreate` page would be enough.

**3. Readability of phase errors.** No. None of the codes we encountered reference the phase or the date at fault, `tecEXPIRED` covers two opposite situations, and `tecTOO_SOON` is shared with an unrelated propagation case. See the dedicated entry. This is our most important developer-experience feedback: in a closed-ended vault, a phase rejection is a normal lifecycle event and should be as readable as a success.

**4. Clarity of the "last instalment before `RedemptionDate`" constraint.** It never became a problem for us — our loan settled before Redemption. But we note that **nothing in the protocol checks or warns** if a loan's schedule extends past its vault's `RedemptionDate` at `LoanSet` time. The constraint exists conceptually but is not enforced at origination, which leaves room to create a loan structurally incompatible with its vault.

**5. Ease of verification on the explorer.** Good. `devnet.xrpl.org` displays `meta.TransactionResult` clearly, and the fields of `Vault`, `Loan` and `LoanBroker` objects are readable without additional tooling. This is what let us settle several of the questions above empirically — notably the interest credit at `LoanPay`, visible directly in the metadata. One reservation: linking a Vault to its `MPTokenIssuance` requires manual navigation (see the `SharesTotal` entry).

**6. Cash-basis accounting behaviour.** Confirmed, and consistent with our expectations once the mechanism was understood: interest is recognised **at payment** (`LoanPay`), not at origination. Real delta observed on `AssetsTotal` after repayment: +229 drops, i.e. +0.000229 XRP, consistent with the applied rate over a deliberately compressed loan term. What surprised us was not the principle but the **path**: we were looking for an explicit donation transaction where the ledger credits atomically inside the repayment transaction.
