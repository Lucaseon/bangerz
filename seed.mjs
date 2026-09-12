/**
 * BANGERZ — seed Track 2 (vault closed-ended, XLS-65 + XLS-66)
 * xrpl@5.2.0-beta.1 · Public XRPL Devnet
 *
 * Usage (une étape à la fois, les phases sont gatées par l'heure réelle) :
 *   node seed.mjs accounts     # 4 comptes financés au faucet
 *   node seed.mjs vault        # VaultCreate closed-ended + LoanBrokerSet + cover
 *   node seed.mjs subscribe    # dépôts des prêteurs (phase Subscription)
 *   node seed.mjs reject-sub   # tente un LoanSet pendant Subscription -> doit échouer
 *   node seed.mjs invest       # LoanSet double signature (phase Investment)
 *   node seed.mjs reject-inv   # tente Deposit + Withdraw pendant Investment -> doivent échouer
 *   node seed.mjs pay          # LoanPay (rejouable)
 *   node seed.mjs redeem       # retraits (phase Redemption)
 *   node seed.mjs reject-red   # tente un LoanSet pendant Redemption -> doit échouer
 *   node seed.mjs impair       # LoanManage tfLoanImpair
 *   node seed.mjs default      # LoanManage tfLoanDefault
 *   node seed.mjs status       # état complet + PPS
 *
 * Tout est persisté dans state.json. Le front lit ce fichier.
 */

import fs from 'node:fs'
import {
  Client,
  Wallet,
  xrpToDrops,
  dropsToXrp,
  VaultKind,
  LoanManageFlags,
  LoanPayFlags,
  unixTimeToRippleTime,
  rippleTimeToUnixTime,
  // Native since xrpl@5.2.0-beta.1 (the version this event requires). On the previously
  // (wrongly) pinned 5.2.0-beta.0, this signed with the plain transaction hash prefix (STX)
  // instead of the counterparty prefix (CST) that XLS-66 requires, so every double-signed
  // LoanSet was rejected — see FEEDBACK.md. Upgrading removed the need for a local workaround.
  signLoanSetByCounterparty,
} from 'xrpl'

// ---------------------------------------------------------------- CONFIG

const NETWORK = 'wss://s.devnet.rippletest.net:51233/'
// STATE_FILE en variable d'env : permet de faire tourner un second vault (scénario
// impair/default) en parallèle du premier, sans toucher son state.json.
const STATE_FILE = process.env.STATE_FILE ?? './state.json'
const TX_LINKS_FILE = './tx-links.md'

const CFG = {
  // Fenêtres du vault closed-ended, en minutes à partir du VaultCreate.
  // /!\ IMMUABLE une fois le vault créé. Le Devnet suit l'heure réelle.
  // Surchargeables par env pour un second vault à fenêtres courtes.
  subscriptionMinutes: Number(process.env.SUBSCRIPTION_MINUTES) || 20,   // durée de la phase Subscription
  investmentMinutes: Number(process.env.INVESTMENT_MINUTES) || 180,     // durée de la phase Investment

  depositXrp: '60',          // par prêteur
  coverXrp: '20',            // first-loss capital du broker
  principalXrp: '100',       // montant du prêt

  // Taux en 1/10 de point de base : 1000 = 1 %, 10000 = 10 %
  interestRate: 10000,
  managementFeeRate: 500,
  coverRateMinimum: 20000,      // 20 % du DebtTotal
  coverRateLiquidation: 100000, // 100 % du cover requis mobilisable sur un défaut

  paymentTotal: 4,
  paymentIntervalSec: 300,   // 5 min — doit être >= 60
  gracePeriodSec: 120,       // >= 60 et <= paymentInterval

  // VaultCreate a un coût de transaction élevé (création d'objets).
  // Fixé explicitement pour éviter un telINSUF_FEE_P.
  vaultCreateFeeDrops: '5000000',
}

// ---------------------------------------------------------------- STATE

const loadState = () =>
  fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}

const saveState = (s) => {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
  return s
}

const logTx = (label, res) => {
  const code = res.result.meta?.TransactionResult
  const hash = res.result.hash
  const ok = code === 'tesSUCCESS'
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(26)} ${code}`)
  console.log(`     https://devnet.xrpl.org/transactions/${hash}`)
  if (ok) appendTxLink(label, hash)
  const s = loadState()
  s.txs = s.txs ?? []
  s.txs.push({ label, code, hash, at: new Date().toISOString() })
  saveState(s)
  return res
}

// Récupère le LedgerIndex d'un objet créé par la transaction.
const createdId = (res, type) => {
  const node = res.result.meta.AffectedNodes.find(
    (n) => n.CreatedNode?.LedgerEntryType === type
  )
  if (!node) throw new Error(`Aucun ${type} créé dans cette transaction.`)
  return node.CreatedNode.LedgerIndex
}

const send = async (client, wallet, tx, label) => {
  const res = await client.submitAndWait(tx, { autofill: true, wallet })
  return logTx(label, res)
}

// Soumet en attendant un échec : c'est le comportement recherché.
const expectReject = async (client, wallet, tx, label) => {
  try {
    const res = await client.submitAndWait(tx, { autofill: true, wallet })
    const code = res.result.meta?.TransactionResult
    if (code === 'tesSUCCESS') {
      console.log(`!!   ${label} a RÉUSSI alors qu'un rejet était attendu.`)
    } else {
      console.log(`OK   rejet attendu · ${label.padEnd(20)} ${code}`)
      console.log(`     https://devnet.xrpl.org/transactions/${res.result.hash}`)
      const s = loadState()
      s.rejections = s.rejections ?? []
      s.rejections.push({ label, code, hash: res.result.hash })
      saveState(s)
    }
    return res
  } catch (err) {
    console.log(`OK   rejet attendu · ${label.padEnd(20)} ${err.data?.error_message ?? err.message}`)
    const s = loadState()
    s.rejections = s.rejections ?? []
    s.rejections.push({ label, error: err.data?.error_message ?? err.message })
    saveState(s)
  }
}

const w = (s, role) => Wallet.fromSeed(s.wallets[role].seed)

const appendTxLink = (label, hash) => {
  if (!fs.existsSync(TX_LINKS_FILE)) {
    fs.writeFileSync(TX_LINKS_FILE, '# tx-links\n\n')
  }
  fs.appendFileSync(
    TX_LINKS_FILE,
    `- ${label} · https://devnet.xrpl.org/transactions/${hash}\n`
  )
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const sleepUntil = async (targetMs, label) => {
  const waitMs = targetMs - Date.now()
  if (waitMs <= 0) return
  console.log(`     … attente ${Math.ceil(waitMs / 1000)}s avant ${label}`)
  await sleepMs(waitMs)
}

// ---------------------------------------------------------------- STEPS

async function accounts(client) {
  const s = loadState()
  s.wallets = s.wallets ?? {}
  for (const role of ['broker', 'borrower', 'lender1', 'lender2']) {
    if (s.wallets[role]) {
      console.log(`skip ${role} déjà financé · ${s.wallets[role].address}`)
      continue
    }
    const { wallet } = await client.fundWallet()
    // Deuxième passage : les réserves (1 XRP base + 0,2 par objet) montent vite.
    await client.fundWallet(wallet)
    s.wallets[role] = { address: wallet.address, seed: wallet.seed }
    console.log(`OK   ${role.padEnd(9)} ${wallet.address}`)
  }
  saveState(s)
  console.log('\n/!\\ state.json contient des seeds. Ne le committez pas.')
}

async function vault(client) {
  const s = loadState()
  const broker = w(s, 'broker')
  const now = Math.floor(Date.now() / 1000)

  const subscriptionDate = unixTimeToRippleTime((now + CFG.subscriptionMinutes * 60) * 1000)
  const redemptionDate = unixTimeToRippleTime(
    (now + (CFG.subscriptionMinutes + CFG.investmentMinutes) * 60) * 1000
  )

  const res = await send(client, broker, {
    TransactionType: 'VaultCreate',
    Account: broker.address,
    Asset: { currency: 'XRP' },
    VaultKind: VaultKind.vaultKindClosed,
    SubscriptionDate: subscriptionDate,
    RedemptionDate: redemptionDate,
    AssetsMaximum: xrpToDrops('10000'),
    Fee: CFG.vaultCreateFeeDrops,
  }, 'VaultCreate (closed)')

  s.vaultId = createdId(res, 'Vault')
  s.phases = {
    subscriptionEnds: new Date((now + CFG.subscriptionMinutes * 60) * 1000).toISOString(),
    redemptionStarts: new Date(
      (now + (CFG.subscriptionMinutes + CFG.investmentMinutes) * 60) * 1000
    ).toISOString(),
  }
  saveState(s)
  console.log(`     VaultID ${s.vaultId}`)
  console.log(`     Subscription jusqu'à ${s.phases.subscriptionEnds}`)
  console.log(`     Redemption à partir de ${s.phases.redemptionStarts}`)

  const brokerRes = await send(client, broker, {
    TransactionType: 'LoanBrokerSet',
    Account: broker.address,
    VaultID: s.vaultId,
    ManagementFeeRate: CFG.managementFeeRate,
    DebtMaximum: xrpToDrops('5000'),
    CoverRateMinimum: CFG.coverRateMinimum,
    CoverRateLiquidation: CFG.coverRateLiquidation,
  }, 'LoanBrokerSet')

  s.loanBrokerId = createdId(brokerRes, 'LoanBroker')
  saveState(s)
  console.log(`     LoanBrokerID ${s.loanBrokerId}`)

  await send(client, broker, {
    TransactionType: 'LoanBrokerCoverDeposit',
    Account: broker.address,
    LoanBrokerID: s.loanBrokerId,
    Amount: xrpToDrops(CFG.coverXrp),
  }, 'CoverDeposit')
}

// Parameterized VaultDeposit for the web front's Lend button — role and amount come
// from env vars (set by run-action.mjs) instead of the fixed CFG.depositXrp, so a real
// visitor-chosen amount hits the real ledger, success or rejection alike.
async function depositCustom(client) {
  const s = loadState()
  const role = process.env.LEND_ROLE ?? 'lender1'
  const amountXrp = process.env.LEND_AMOUNT_XRP ?? '60'
  if (!s.wallets?.[role]) throw new Error(`Unknown lender role: ${role}`)
  await send(client, w(s, role), {
    TransactionType: 'VaultDeposit',
    Account: s.wallets[role].address,
    VaultID: s.vaultId,
    Amount: xrpToDrops(amountXrp),
  }, `VaultDeposit ${role} (web, ${amountXrp} XRP)`)
}

async function subscribe(client) {
  const s = loadState()
  for (const role of ['lender1', 'lender2']) {
    await send(client, w(s, role), {
      TransactionType: 'VaultDeposit',
      Account: s.wallets[role].address,
      VaultID: s.vaultId,
      Amount: xrpToDrops(CFG.depositXrp),
    }, `VaultDeposit ${role}`)
  }
}

function buildLoanSet(s) {
  return {
    TransactionType: 'LoanSet',
    Account: s.wallets.broker.address,
    Counterparty: s.wallets.borrower.address,
    LoanBrokerID: s.loanBrokerId,
    PrincipalRequested: xrpToDrops(CFG.principalXrp),
    InterestRate: CFG.interestRate,
    PaymentTotal: CFG.paymentTotal,
    PaymentInterval: CFG.paymentIntervalSec,
    GracePeriod: CFG.gracePeriodSec,
  }
}

async function invest(client) {
  const s = loadState()
  if (s.loanId) {
    console.log(`skip loan déjà créé · ${s.loanId}`)
    return
  }
  const broker = w(s, 'broker')
  const borrower = w(s, 'borrower')

  // 1. le broker autofill et signe en premier
  const prepared = await client.autofill(buildLoanSet(s))
  const first = broker.sign(prepared)

  // 2. l'emprunteur contresigne le blob
  const cosigned = signLoanSetByCounterparty(borrower, first.tx_blob)

  // 3. on soumet le blob contresigné
  const res = await client.submitAndWait(cosigned.tx_blob)
  logTx('LoanSet (double sign)', res)

  s.loanId = createdId(res, 'Loan')
  saveState(s)
  console.log(`     LoanID ${s.loanId}`)
}

async function pay(client) {
  const s = loadState()
  const borrower = w(s, 'borrower')
  const amount = (Number(xrpToDrops(CFG.principalXrp)) / CFG.paymentTotal).toFixed(0)
  await send(client, borrower, {
    TransactionType: 'LoanPay',
    Account: borrower.address,
    LoanID: s.loanId,
    Amount: amount,
  }, 'LoanPay')
}

async function redeem(client) {
  const s = loadState()
  for (const role of ['lender1', 'lender2']) {
    await send(client, w(s, role), {
      TransactionType: 'VaultWithdraw',
      Account: s.wallets[role].address,
      VaultID: s.vaultId,
      Amount: xrpToDrops(CFG.depositXrp),
    }, `VaultWithdraw ${role}`)
  }
}

async function manage(client, flag, label) {
  const s = loadState()
  await send(client, w(s, 'broker'), {
    TransactionType: 'LoanManage',
    Account: s.wallets.broker.address,
    LoanID: s.loanId,
    Flags: flag,
  }, label)
}

// ---------------------------------------------------------------- SECOND LOAN
// Le premier prêt (s.loanId) a raté ses 4 fenêtres de paiement (tecEXPIRED, voir feedback).
// PaymentRemaining/PrincipalOutstanding n'ont jamais bougé dessus : il est irrécupérable.
// On ouvre un second prêt sur le même vault/broker, avec un LoanPay cadencé au plus près
// de NextPaymentDueDate + GracePeriod au lieu d'un rythme "à peu près 5 min".

async function readLoan(client, loanId) {
  const res = await client.request({
    command: 'ledger_entry',
    index: loanId,
    ledger_index: 'validated',
  })
  return res.result.node
}

async function coverTopUp(client) {
  const s = loadState()
  await send(client, w(s, 'broker'), {
    TransactionType: 'LoanBrokerCoverDeposit',
    Account: s.wallets.broker.address,
    LoanBrokerID: s.loanBrokerId,
    Amount: xrpToDrops(CFG.coverXrp),
  }, 'CoverDeposit (top-up prêt 2)')
}

async function investFresh(client) {
  const s = loadState()
  if (s.loanId2) {
    console.log(`skip second loan déjà créé · ${s.loanId2}`)
    return
  }
  const broker = w(s, 'broker')
  const borrower = w(s, 'borrower')

  const prepared = await client.autofill(buildLoanSet(s))
  const first = broker.sign(prepared)
  const cosigned = signLoanSetByCounterparty(borrower, first.tx_blob)

  const res = await client.submitAndWait(cosigned.tx_blob)
  logTx('LoanSet #2 (double sign)', res)
  if (res.result.meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`LoanSet #2 a échoué : ${res.result.meta?.TransactionResult}`)
  }

  s.loanId2 = createdId(res, 'Loan')
  saveState(s)
  console.log(`     LoanID #2 ${s.loanId2}`)
}

async function payScheduled(client) {
  const s = loadState()
  if (!s.loanId2) throw new Error('Pas de second prêt. Lance investFresh (via finish-phase4) d\'abord.')
  const borrower = w(s, 'borrower')

  for (let i = 0; i < CFG.paymentTotal; i++) {
    const loan = await readLoan(client, s.loanId2)
    if (Number(loan.PaymentRemaining) === 0) {
      console.log('     Prêt #2 déjà entièrement remboursé.')
      break
    }
    const dueMs = rippleTimeToUnixTime(loan.NextPaymentDueDate)
    // Le spec XLS-66 (§3.11.4.2) est explicite : dès que currentTime >= NextPaymentDueDate,
    // LoanPay échoue en tecEXPIRED SAUF si le flag tfLoanLatePayment est posé. GracePeriod
    // ne prolonge pas la fenêtre de paiement, il ne fait que retarder l'éligibilité au
    // impair/default côté broker. On vise donc juste après l'échéance, sans se soucier
    // d'une fenêtre de grâce qui n'existe pas pour LoanPay.
    // +3s s'est révélé trop juste (tecTOO_SOON observé à due+8s réel) : marge élargie
    // pour absorber le délai de validation de ledger (submitAndWait attend le prochain
    // ledger validé, ~4-6s de plus après le close_time visé).
    await sleepUntil(dueMs + 20000, `échéance ${i + 1}/${CFG.paymentTotal}`)

    const isLate = Date.now() >= dueMs
    const amount = Math.ceil(Number(loan.PeriodicPayment)).toString()
    const res = await send(client, borrower, {
      TransactionType: 'LoanPay',
      Account: borrower.address,
      LoanID: s.loanId2,
      Amount: amount,
      ...(isLate ? { Flags: LoanPayFlags.tfLoanLatePayment } : {}),
    }, `LoanPay #2 (${i + 1}/${CFG.paymentTotal})${isLate ? ' [late]' : ''}`)

    if (res.result.meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`LoanPay ${i + 1}/${CFG.paymentTotal} a échoué : ${res.result.meta?.TransactionResult}`)
    }
  }
}

async function finishPhase4(client) {
  const before = await client.request({
    command: 'ledger_entry',
    vault: loadState().vaultId,
    ledger_index: 'validated',
  })
  console.log(`\nAssetsTotal avant : ${dropsToXrp(before.result.node.AssetsTotal)} XRP`)

  await coverTopUp(client)
  await investFresh(client)
  await payScheduled(client)

  const after = await client.request({
    command: 'ledger_entry',
    vault: loadState().vaultId,
    ledger_index: 'validated',
  })
  const beforeXrp = Number(dropsToXrp(before.result.node.AssetsTotal))
  const afterXrp = Number(dropsToXrp(after.result.node.AssetsTotal))
  console.log(`AssetsTotal après : ${afterXrp} XRP`)
  console.log(`Delta             : ${(afterXrp - beforeXrp).toFixed(6)} XRP`)
}

// --- les trois rejets exigés par le minimum bar Track 2 ---

async function rejectSub(client, label = 'LoanSet pendant Subscription') {
  const s = loadState()
  const prepared = await client.autofill(buildLoanSet(s))
  const first = w(s, 'broker').sign(prepared)
  const cosigned = signLoanSetByCounterparty(w(s, 'borrower'), first.tx_blob)
  try {
    const res = await client.submitAndWait(cosigned.tx_blob)
    console.log(`     ${label} -> ${res.result.meta?.TransactionResult}`)
    const st = loadState()
    st.rejections = st.rejections ?? []
    st.rejections.push({
      label,
      code: res.result.meta?.TransactionResult,
      hash: res.result.hash,
    })
    saveState(st)
  } catch (err) {
    console.log(`OK   rejet attendu · ${label} ${err.data?.error_message ?? err.message}`)
  }
}

async function rejectInv(client) {
  const s = loadState()
  await expectReject(client, w(s, 'lender1'), {
    TransactionType: 'VaultDeposit',
    Account: s.wallets.lender1.address,
    VaultID: s.vaultId,
    Amount: xrpToDrops('5'),
  }, 'Deposit en Investment')

  await expectReject(client, w(s, 'lender1'), {
    TransactionType: 'VaultWithdraw',
    Account: s.wallets.lender1.address,
    VaultID: s.vaultId,
    Amount: xrpToDrops('5'),
  }, 'Withdraw en Investment')
}

async function rejectRed(client) {
  await rejectSub(client, 'LoanSet pendant Redemption') // même transaction, autre phase
}

async function status(client) {
  const s = loadState()
  if (!s.vaultId) return console.log('Pas encore de vault. Lance : node seed.mjs vault')

  const v = await client.request({
    command: 'ledger_entry',
    vault: s.vaultId,
    ledger_index: 'validated',
  })
  const node = v.result.node
  console.log('\n--- VAULT ---')
  console.log(`VaultID          ${s.vaultId}`)
  console.log(`AssetsTotal      ${dropsToXrp(node.AssetsTotal)} XRP`)
  console.log(`AssetsAvailable  ${dropsToXrp(node.AssetsAvailable)} XRP`)
  console.log(`LossUnrealized   ${node.LossUnrealized}`)
  console.log(`ShareMPTID       ${node.ShareMPTID}`)
  console.log(`Pseudo-account   ${node.Account}`)

  console.log('\n--- PHASES (heure locale) ---')
  console.log(`Subscription jusqu'à  ${s.phases?.subscriptionEnds}`)
  console.log(`Redemption à partir de ${s.phases?.redemptionStarts}`)
  const now = new Date()
  const phase =
    now < new Date(s.phases.subscriptionEnds) ? 'SUBSCRIPTION'
      : now < new Date(s.phases.redemptionStarts) ? 'INVESTMENT'
        : 'REDEMPTION'
  console.log(`Phase courante        ${phase}`)

  if (s.loanBrokerId) {
    const b = await client.request({
      command: 'ledger_entry',
      index: s.loanBrokerId,
      ledger_index: 'validated',
    })
    const bn = b.result.node
    console.log('\n--- BROKER ---')
    console.log(`DebtTotal        ${bn.DebtTotal}`)
    console.log(`CoverAvailable   ${bn.CoverAvailable}`)
    console.log(`CoverRateMinimum ${bn.CoverRateMinimum}`)
  }

  console.log(`\n${(s.txs ?? []).length} transactions, ${(s.rejections ?? []).length} rejets capturés.`)
}

// ---------------------------------------------------------------- MAIN

const STEPS = {
  accounts,
  vault,
  subscribe,
  'reject-sub': rejectSub,
  invest,
  'reject-inv': rejectInv,
  pay,
  redeem,
  'reject-red': rejectRed,
  impair: (c) => manage(c, LoanManageFlags.tfLoanImpair, 'LoanManage impair'),
  default: (c) => manage(c, LoanManageFlags.tfLoanDefault, 'LoanManage default'),
  status,
  'cover-topup': coverTopUp,
  'deposit-custom': depositCustom,
  'invest2': investFresh,
  'pay2': payScheduled,
  'finish-phase4': finishPhase4,
}

const step = process.argv[2]
if (!step || !STEPS[step]) {
  console.log('Étapes : ' + Object.keys(STEPS).join(' · '))
  process.exit(1)
}

const client = new Client(NETWORK)
await client.connect()
try {
  await STEPS[step](client)
} catch (err) {
  console.error('\nERREUR :', err.data?.error_message ?? err.message)
  if (err.data) console.error(JSON.stringify(err.data, null, 2))
} finally {
  await client.disconnect()
}
