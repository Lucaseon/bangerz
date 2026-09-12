const BASE = 'https://devnet.xrpl.org'

export const txUrl = (hash: string) => `${BASE}/transactions/${hash}`
export const accountUrl = (address: string) => `${BASE}/accounts/${address}`
export const objectUrl = (id: string) => `${BASE}/objects/${id}`
