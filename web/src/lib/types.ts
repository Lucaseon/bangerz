export type Phase = 'subscription' | 'investment' | 'redemption' | 'unknown'

export interface Broker {
  debtTotal: string
  coverAvailable: string
  coverRateMinimum: number
}

export interface Loan {
  principalOutstanding: string
  totalValueOutstanding: string
  paymentRemaining: number
  nextPaymentDueDate: string | null
  settled: boolean
}

export interface TxRow {
  label: string
  code: string
  hash: string
  at: string
}

export interface RejectionRow {
  label: string
  code?: string
  error?: string
  hash?: string
}

export interface LedgerSnapshot {
  error?: string
  network: string
  explorer: string
  vaultId: string
  phase: Phase
  phases: { subscriptionEnds: string; redemptionStarts: string } | null
  assetsTotal: number
  assetsAvailable: number
  shareMptId: string | null
  sharesTotal: number | null
  pps: number | null
  broker: Broker | null
  brokerAddress: string | null
  borrowerAddress: string | null
  lenders: LenderPosition[]
  loan: Loan | null
  loanId: string | null
  loanId2: string | null
  txs: TxRow[]
  rejections: RejectionRow[]
}

export interface LenderPosition {
  role: string
  address: string
  shares: number
  currentValue: string
}

export interface ActionResult {
  step: string
  code: number | null
  output: string
  newTxs: TxRow[]
  newRejections: RejectionRow[]
}
