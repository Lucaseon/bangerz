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

---

## [UX] Les rejets de phase ne disent jamais quelle phase les a causés
Où : `VaultDeposit`, `VaultWithdraw`, `LoanSet` — n'importe quelle transaction gatée par phase
Ce que j'essayais de faire : capturer les 3 rejets de phase exigés par le minimum bar
Attendu vs obtenu :
- `VaultDeposit` pendant Investment → `tecEXPIRED` (hash `90EEC3D5F64E83802860925302D11CFD8DC5D2547C13E8F35DBBAD3289C24ED2`)
- `VaultWithdraw` pendant Investment → `tecTOO_SOON` (hash `6DE52FB750F96F7A4C277A10A12E8351D446270A1CA67C1605CBAE34482704EF`)
- `LoanSet` pendant Redemption → `tecEXPIRED` (hash `88F29B1283D101339830E148ED33DBAD6B7A7E857A6B22DCF9F9865F71C3D8DF`)

Sévérité : gênant, pas bloquant. Lib : `xrpl@5.2.0-beta.0`, Devnet.
Correctif proposé : un des deux codes génériques (`tecEXPIRED`/`tecTOO_SOON`) pourrait embarquer la phase courante et la date de transition dans le message d'erreur plutôt qu'un code nu.

---

## [protocol] LoanPay exige un flag `tfLoanLatePayment` non documenté hors du spec GitHub
Où : `LoanPay`, xrpl.js `LoanPayFlags.tfLoanLatePayment` (`0x00040000`)
Ce que j'essayais de faire : rembourser une échéance de prêt après sa date d'échéance
Attendu vs obtenu : `tecEXPIRED` dès que `currentTime >= NextPaymentDueDate` sans le flag posé (hash `54F874DC1208D1729900816DEC10A01F85C10A36A6C0633362E05E4DECB07A83`) ; corrigé, succès immédiat (hash `A26E1AEEF41BE550D67738BA78A238FE6254A0FA4A077DA6A036AEF5EC274EFF`)
Repro : voir `payScheduled()` dans `seed.mjs`
Sévérité : bloquant (30 min perdues). Lib : `xrpl@5.2.0-beta.0`.
Correctif proposé : documenter la règle sur les pages xrpl.org `LoanPay` et `Loan` ledger entry (actuellement seulement dans XLS-66 §3.11.4.2 sur GitHub) ; préciser explicitement que `GracePeriod` ne prolonge pas la fenêtre de paiement, il ne fait que retarder l'éligibilité du broker à `impair`/`default`.

---

## [protocol] tecTOO_SOON non documenté, même avec le flag de retard posé
Où : `LoanPay`, juste après `NextPaymentDueDate`
Ce que j'essayais de faire : rembourser une échéance ~8 secondes après son échéance, flag `tfLoanLatePayment` déjà posé
Attendu vs obtenu : `tecTOO_SOON` (hash `EF8FD8AEEB59814A56A70B98D7C2639CED6F69A8D1C2082F965C23196B0F29A7`) ; une marge d'environ 20 secondes après l'échéance a suffi à faire réussir le même paiement
Sévérité : gênant. Lib : `xrpl@5.2.0-beta.0`.
Correctif proposé : documenter la marge réelle exigée (probablement liée au temps de validation de ledger), ou renvoyer un code distinct de `tecTOO_SOON` pour ce cas précis.

---

## [documentation] `tfVaultDonation` n'existe pas
Où : `VaultDeposit`
Ce que j'essayais de faire : injecter de l'intérêt dans le vault, comme décrit par du matériel de planification secondaire pour l'event
Attendu vs obtenu : xrpl.org (page `VaultDeposit`) indique explicitement « There are no flags defined for VaultDeposit transactions » — confirmé absent aussi du spec XLS-65 et du tutoriel « Deposit into a Vault »
Sévérité : gênant (piste d'investigation perdue). Lib/spec : `xrpl@5.2.0-beta.0`, XLS-65.
Correctif proposé : le mécanisme réel (le remboursement `LoanPay` fait monter `AssetsTotal` directement) mériterait d'être documenté explicitement comme LE mécanisme de rendement en V1.1, pour éviter la confusion avec un flag qui n'existe pas.

---

## [protocol] tecNO_PERMISSION non résolu sur un second LoanSet
Où : `LoanSet`, second vault/broker
Ce que j'essayais de faire : créer un second prêt sur un second vault, avec des paramètres structurellement identiques à un `LoanSet` qui avait réussi ailleurs (mêmes rôles broker/owner, cover au seuil exact des 20 %, aucun flag freeze)
Attendu vs obtenu : `tecNO_PERMISSION` de façon reproductible (hashes `0969BA453CA6E819D5FEE879060FE2917E7A832E3D24401D35E6DE4754569CAB`, `75DFC340C7A1699AA4D2F669B7C2385817AF59A8FA6173BE2B9F228DE1F905C2`, `42EFEA7E0D75C3F7B4BCB7B381A3F285EA3A7A34C374AE645CFDFF6730C738B1`)
Sévérité : bloquant sur ce second vault (scénario abandonné). Lib : `xrpl@5.2.0-beta.0`.
Correctif proposé : aucun trouvé — signalé tel quel à l'organisateur, cause encore inconnue malgré vérification de toutes les conditions d'échec documentées du spec.

---

## [other] Le bug de signature de contrepartie n'a pas besoin de PR — déjà corrigé une version plus tard
Où : `xrpl@5.2.0-beta.0` vs `xrpl@5.2.0-beta.1` / `xrpl@5.2.0`
Ce que j'essayais de faire : préparer une PR sur `xrpl.js` pour le bug STX/CST (voir première entrée)
Obtenu : en clonant `xrpl.js` pour préparer la PR, le correctif était déjà présent sur `main`. En téléchargeant et diffant les tarballs npm des versions publiées, `xrpl@5.2.0-beta.1` et la stable `xrpl@5.2.0` (toutes deux déjà publiées) appellent déjà `computeSignature` avec le rôle `'counterparty'` correct. Seule la version épinglée pour cet event, `5.2.0-beta.0`, a le bug.
Sévérité : aucune (aucune action requise sur le repo).
Correctif proposé : signaler à l'organisateur que la version recommandée pour cet event pourrait être mise à jour vers `5.2.0-beta.1` ou `5.2.0` pour épargner ce bug à toute équipe utilisant le flux à double signature.

---

## Réponses aux 6 questions Track 2

1. **Intuitivité des trois phases (Subscription/Investment/Redemption)** : globalement claire une fois le modèle compris, mais la relation entre `GracePeriod`/échéance de prêt et la phase du vault a été mal comprise au départ (voir l'entrée `tfLoanLatePayment` ci-dessus) — deux notions de temporalité différentes qui se ressemblent.
2. **Clarté de `VaultKind` / `SubscriptionDate` / `RedemptionDate`** : le nommage est clair, mais leur immuabilité totale après `VaultCreate` (aucun champ de date dans `VaultSet`) n'est signalée nulle part côté client au moment de la création — on ne le découvre qu'en lisant le spec ou en se plantant.
3. **Lisibilité des erreurs de phase** : non — voir l'entrée `[UX]` ci-dessus, aucun des codes rencontrés ne référence la phase ou la date en cause.
4. **Clarté de la contrainte dernière-échéance-avant-Redemption** : jamais été un vrai problème dans notre cas (le prêt s'est soldé avant la Redemption), mais rien dans le protocole ne vérifie ni n'avertit automatiquement si l'échéancier d'un prêt dépasse la `RedemptionDate` du vault au moment du `LoanSet`.
5. **Facilité de vérification sur l'explorer** : bonne — `devnet.xrpl.org` affiche clairement `meta.TransactionResult`, les champs des objets Vault/Loan/LoanBroker sont lisibles sans outil supplémentaire.
6. **Comportement de la comptabilité de caisse** : confirmé — l'intérêt est reconnu au paiement (`LoanPay`), pas à l'origination du prêt. Delta réel observé sur `AssetsTotal` après remboursement : +0.000237 XRP, cohérent avec un taux de 10 %/an sur un prêt compressé à ~20 minutes simulées.