import type { Phase } from './types'

export type Action = 'deposit' | 'withdraw' | 'loanSet' | 'repay' | 'redeem'

type GateTable = Record<Phase, Partial<Record<Action, boolean>>>

const ALLOWED: GateTable = {
  subscription: { deposit: true, withdraw: true, loanSet: false, repay: false, redeem: false },
  investment: { deposit: false, withdraw: false, loanSet: true, repay: true, redeem: false },
  redemption: { deposit: false, withdraw: true, loanSet: false, repay: true, redeem: true },
  unknown: {},
}

const REASONS: Partial<Record<Action, Partial<Record<Phase, string>>>> = {
  deposit: {
    investment: 'Deposits closed when the subscription window ended.',
    redemption: 'This vault is in redemption. It no longer accepts deposits.',
  },
  withdraw: {
    investment: 'Withdrawals are locked while the loan is outstanding.',
  },
  loanSet: {
    subscription: 'The loan can only be issued once subscription closes.',
    redemption: 'Redemption has opened. No new loan can be issued.',
  },
  repay: {
    subscription: 'There is no outstanding loan to repay yet.',
  },
  redeem: {
    subscription: 'Redemption opens once the vault matures.',
    investment: 'Redemption opens once the vault matures.',
  },
}

export function gate(phase: Phase, action: Action): { allowed: boolean; reason?: string } {
  const allowed = Boolean(ALLOWED[phase]?.[action])
  if (allowed) return { allowed: true }
  return { allowed: false, reason: REASONS[action]?.[phase] ?? 'Blocked in the current phase.' }
}

const WHY: Record<string, string> = {
  tecNO_PERMISSION: "This account isn't permitted to perform this action on this vault.",
  tecWRONG_ASSET: "The vault only accepts XRP. The submitted asset doesn't match.",
  tecINSUFFICIENT_RESERVE: "The account doesn't hold enough XRP to cover the ledger reserve for a new object.",
  tecINSUFFICIENT_FUNDS: "The account balance doesn't cover this amount.",
  tecLIMIT_EXCEEDED: 'This exceeds the limit set on the vault or the loan.',
  tecOBJECT_NOT_FOUND: "The vault, broker or loan referenced here doesn't exist on this ledger.",
  tecPATH_DRY: "The ledger couldn't fund this transfer.",
  temBAD_SIGNER: "The counterparty signature is missing or doesn't serialise correctly.",
  temMALFORMED: 'The transaction is malformed and was never submitted.',
  tecEXPIRED: 'This action landed after the ledger-enforced window for it had closed.',
  tecTOO_SOON: 'This action landed before the ledger-enforced window for it had opened.',
  tecKILLED: 'The ledger considers this obligation already settled.',
}

export function whyString(code?: string | null): string {
  if (!code) return 'The ledger rejected this transaction. The code below is the exact reason.'
  return WHY[code] ?? 'The ledger rejected this transaction. The code below is the exact reason.'
}
