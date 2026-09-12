## [client libraries] signLoanSetByCounterparty produit une signature refusée
Où : xrpl@5.2.0-beta.0, Wallet/counterpartySigner.js
Ce que j'essayais de faire : originer un prêt à double signature
Flux : client.autofill(loanSet) -> broker.sign() -> signLoanSetByCounterparty(borrower, tx_blob) -> submitAndWait(tx_blob)
Obtenu : "fails local checks: Counterparty: Invalid signature"
Note affichée : "For LoanSet transaction the auto calculated Fee accounts for total number of signers the counterparty has to avoid transaction failure"
Sévérité : bloquant (contourné par fix local)

### Cause racine identifiée
Dans `xrpl/dist/npm/Wallet/counterpartySigner.js` (l. 48) :
```javascript
tx.CounterpartySignature = {
  SigningPubKey: wallet.publicKey,
  TxnSignature: computeSignature(tx, wallet.privateKey),
}
```
`computeSignature` appelle `encodeForSigning(tx)` qui génère le préfixe de hachage de transaction classique : `HashPrefix.transactionSig` (`0x53545800` / `STX`).
Or, selon la spec XLS-66 et l'implémentation de `rippled`, la signature de contrepartie doit être préfixée avec `HashPrefix.counterpartyTransactionSig` (`0x43535400` / `CST`).

La fonction d'encodage correcte `encodeForSigningCounterparty` existe déjà dans `ripple-binary-codec`, mais n'est pas appelée par `signLoanSetByCounterparty`.

### Correction requise dans xrpl
Remplacer l'appel dans `counterpartySigner.js` par :
```javascript
const { encodeForSigningCounterparty, encodeForMultisigningCounterparty } = require('ripple-binary-codec')
const { sign } = require('ripple-keypairs')

// Single-sign :
tx.CounterpartySignature = {
  SigningPubKey: wallet.publicKey,
  TxnSignature: sign(encodeForSigningCounterparty(tx), wallet.privateKey),
}

// Multi-sign :
TxnSignature: sign(encodeForMultisigningCounterparty(tx, multisignAddress), wallet.privateKey)
```

### Workaround fonctionnel
Utiliser un helper custom qui encode via `encodeForSigningCounterparty` et signe avec `ripple-keypairs.sign`. Le prêt est alors accepté immédiatement (`tesSUCCESS`).