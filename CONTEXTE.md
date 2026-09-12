# CONTEXTE — BANGERZ · XRPL Lending Protocol Hackathon

À lire en entier avant toute action.

---

## 1. L'événement

XRPL Lending Protocol Hackathon, DeVinci Blockchain × Ripple, IIM Nanterre.
Samedi 12 → dimanche 13 septembre 2026.

- **Code freeze** : dimanche 12:30
- **Soumission** : dimanche 13:00
- **Pitch** : dimanche 14:00, 4 minutes de démo + 2 de Q&A

**Barème** : feedback développeur 40 % · exécution technique XRPL 30 % · créativité et use case 20 % · présentation 10 %.
Bonus explicite : une PR, une correction de doc, un sample réutilisable.

Le rapport de feedback est le premier poste de notation. Le brief précise qu'il doit être **écrit à la main, pas généré par un LLM**.

---

## 2. Le projet

**BANGERZ** — micro-crédit événementiel pour associations étudiantes.

Une asso finance la logistique de sa soirée en empruntant à sa communauté. Les membres déposent dans un vault, BANGERZ joue le rôle de loan broker et engage du capital first-loss, l'organisateur rembourse sur la billetterie.

Le cycle Subscription → Investment → Redemption du vault closed-ended épouse le cycle d'une soirée. C'est l'argument créativité.

**Track 2** (vault closed-ended, Lending Protocol V1.1), **flavour Vanilla**.

### Règles du protocole à ne pas oublier

- Les prêts XLS-66 sont **non collatéralisés**. L'emprunteur ne dépose rien.
- Le first-loss capital appartient au **broker**, déposé via `LoanBrokerCoverDeposit`.
- Le vault ne détient rien lui-même : un **pseudo-account** stocke les actifs et émet les parts (MPT).
- Les taux sont en **1/10 de point de base** : 1000 = 1 %, 10000 = 10 %.
- Seul le propriétaire du vault peut créer le LoanBroker.
- `CoverRateMinimum` et `CoverRateLiquidation` sont **figés à la création**.

---

## 3. Environnement — à ne jamais mélanger

```
Réseau   : Public XRPL Devnet
WSS      : wss://s.devnet.rippletest.net:51233/
Faucet   : https://faucet.devnet.rippletest.net/accounts
Explorer : https://devnet.xrpl.org
Lib      : xrpl@5.2.0-beta.1 (exactement — requis par le brief officiel pour Track 2, voir §5)
Projet   : C:\Users\lucas\Documents\Hackathon-XRP\bangerz
Repo     : https://github.com/Lucaseon/bangerz (public)
```

Réserves XRPL : 1 XRP de base + 0,2 XRP par objet possédé. Financer chaque compte deux fois au faucet.

---

## 4. État on-chain

Vault **closed-ended** créé, actuellement en phase **INVESTMENT** jusqu'à **16:12 UTC** (18:12 Paris).

Objets existants (IDs complets dans `state.json`) :
- Vault
- LoanBroker, avec first-loss capital déposé
- Loan actif, créé par `LoanSet` à double signature

`AssetsTotal` au dernier relevé : **120 XRP** (2 dépôts de 60).

Rejets déjà capturés :
- `VaultDeposit` pendant Investment → `tecEXPIRED`
- `VaultWithdraw` pendant Investment → `tecTOO_SOON`

> Les deux codes ne mentionnent pas la phase du vault alors que c'est la cause réelle. C'est une entrée de feedback, le brief demande explicitement si les erreurs de phase sont lisibles.

---

## 5. Le bug xrpl.js — trouvé, contourné, puis résolu par la bonne version

On a tourné sur `xrpl@5.2.0-beta.0` pendant une bonne partie du build (repris d'un doc de planification secondaire, pas du brief officiel). Dessus, `signLoanSetByCounterparty` produisait une signature systématiquement refusée : `fails local checks: Counterparty: Invalid signature`.

**Cause racine** : `computeSignature` appelait `encodeForSigning`, qui préfixe avec `HashPrefix.transactionSig` (`0x53545800`, « STX »). XLS-66 et rippled exigent pour la contrepartie `HashPrefix.counterpartyTransactionSig` (`0x43535400`, « CST »).

**Contourné à deux endroits** (implémentation locale dans `seed.mjs`, puis un patch `patch-package`), avant de relire le vrai brief : Track 2 exige explicitement `xrpl.js@5.2.0-beta.1`, pas `beta.0`. En clonant `xrpl.js` pour préparer une PR, le correctif était déjà présent en amont — `5.2.0-beta.1` (et la stable `5.2.0`) appellent déjà `computeSignature` avec le rôle `'counterparty'` correct.

**Résolu proprement** : upgrade vers `xrpl@5.2.0-beta.1` (la version requise), les deux contournements supprimés, `seed.mjs` importe `signLoanSetByCounterparty` directement depuis `xrpl`. Le détail complet, y compris la découverte de l'erreur de version elle-même, est dans `FEEDBACK.md`.

---

## 6. Le script

`seed.mjs` à la racine, découpé en étapes parce que les phases sont gatées par l'heure réelle. État persisté dans `state.json` (gitignoré, contient les seeds).

```
node seed.mjs accounts     # fait
node seed.mjs vault        # fait
node seed.mjs subscribe    # fait
node seed.mjs reject-sub   # faux positif, voir §7
node seed.mjs invest       # fait
node seed.mjs reject-inv   # fait, 2 rejets
node seed.mjs pay          # À FAIRE
node seed.mjs redeem       # après 16:12 UTC
node seed.mjs reject-red   # après 16:12 UTC
node seed.mjs impair       # second vault seulement
node seed.mjs default      # second vault seulement
node seed.mjs status       # état + phase courante
```

---

## 7. Ce qui reste dans la Phase 4 (Investment)

**Avant 16:12 UTC, dans l'ordre :**

1. `node seed.mjs status` → relever `AssetsTotal`
2. `node seed.mjs pay` → 4 échéances configurées, espacées de 5 minutes, donc à relancer 4 fois
3. `node seed.mjs status` → vérifier que `AssetsTotal` dépasse 120 XRP

Le dépassement est la **preuve du rendement**, et l'item « withdraw capital plus accrued yield » du minimum bar en dépend. C'est aussi la réponse à la question du brief sur la comptabilité de caisse : en V1.1 l'intérêt est reconnu au paiement, pas à l'origination.

**À corriger dans le script** : `reject-sub` a produit un faux positif. Il a compté l'échec de signature comme le rejet attendu, pas un refus du ledger lié à la phase. Le vrai rejet de `LoanSet` hors phase reste à capturer — ce sera `reject-red` pendant la Redemption, qui vaut pour le minimum bar.

**Ne pas lancer `impair` ni `default` sur ce prêt.** Un défaut mobilise le cover et abîme la sortie des prêteurs, ce qui ferait perdre l'item de retrait avec rendement. Le scénario de défaut se fera sur un second vault.

---

## 8. Reste à faire, hors Phase 4

**Ce soir**
- PR sur `XRPLF/xrpl.js` avec le correctif STX → CST — bonus explicite du barème, time-box 45 min
- `tx-links.md` : tous les hashes explorer, avant qu'ils sortent de l'historique du terminal
- Front minimal

**Après 16:12 UTC**
- `reject-red` puis `redeem` → minimum bar bouclé

**Demain matin**
- Second vault, fenêtres courtes, pour `impair` puis `default`
- `README.md` : setup, track, environnement, version de lib, **liste de toutes les transactions XLS-65/66 utilisées**
- `FEEDBACK.md` au propre, 3 pages max, écrit à la main
- Vidéo de secours de la démo
- Deck, 10 slides max
- Formulaire DevEx avec les handles GitHub

---

## 9. Le front — périmètre, 10 % de la note

Quatre éléments, pas un de plus. Lit `state.json` et le ledger, pas de base de données.

1. **Phase courante du vault**, actions grisées selon la phase — meilleur visuel du projet, rend le lifecycle V1.1 lisible d'un coup d'œil
2. Jauge de collecte, cover broker affiché **séparément** des dépôts (deux mécanismes différents)
3. `AssetsTotal` avant / après remboursement — la preuve du rendement
4. Panneau admin : rembourser, impair, default

---

## 10. Entrées de feedback déjà acquises

1. **[client libraries, bloquant]** `signLoanSetByCounterparty` utilise le mauvais préfixe de hash. Cause racine, repro et patch disponibles.
2. **[UX]** `tecEXPIRED` et `tecTOO_SOON` pour des rejets dont la cause réelle est la phase du vault. Aucun des deux ne le dit.
3. **[documentation/tutorials]** `tfVaultDonation` est référencé par du matériel de planification secondaire pour l'injection d'intérêts en closed-ended, mais n'existe dans aucune version testée (`5.2.0-beta.0` comme la `5.2.0-beta.1` requise), ni dans le spec XLS-65, ni sur xrpl.org. `VaultDeposit` n'expose que `VaultID` et `Amount`.
4. **[missing primitive]** Le minimum bar demande « execute a drawdown » alors que V1.1 n'expose aucune transaction dédiée. Le principal part avec `LoanSet`.

Format attendu par entrée, calé sur le barème (« cite the exact spot, propose the fix ») : catégorie, titre, où exactement, ce qu'on tentait, attendu vs obtenu avec le code d'erreur, repro ou lien de transaction, sévérité, lib et version, **correctif proposé**.

Répondre explicitement aux six questions Track 2 : intuitivité des trois phases, clarté de `VaultKind` / `SubscriptionDate` / `RedemptionDate`, lisibilité des erreurs de phase, clarté de la contrainte dernière-échéance-avant-Redemption, facilité de vérification sur l'explorer, comportement de la comptabilité de caisse.

---

## 11. Règles de travail

- Ne jamais committer `state.json` — il contient les seeds.
- Coller chaque hash dans `tx-links.md` immédiatement après une transaction réussie.
- `/xrpl-feedback <ce qui coince>` à chaud dans l'agent, à chaque blocage.
- `/xrpl-session-analysis` en milieu et fin de journée.
- Le hook DevEx est installé, équipe `BANGERZ`, pseudonyme `calm-hare-71`.
- Aucune ligne de CSS tant que le cycle complet ne tourne pas.
