# bangerz — prompts d'initialisation (Claude Code)

Prompts à envoyer dans l'ordre, un par session ou par message. Chacun suppose que le précédent est terminé et commité.

**Prérequis avant le prompt 0 :** `design/design.md`, `design/copy-deck.md` et `design/mockups/*.png` sont dans le repo, et `web/` a été scaffoldé avec `create-next-app`.

**Règle générale :** un prompt = un commit. Ne lance jamais deux prompts en parallèle sur le même dossier.

---

## Prompt 0 — Contexte et garde-fous

À envoyer une fois, en début de session. C'est celui qui évite 80 % des dérives.

```
Tu travailles sur bangerz, une plateforme de crowdlending d'événements sur le XRP Ledger,
construite pour un hackathon Ripple (deadline dimanche 12h30).

Avant d'écrire la moindre ligne, lis dans cet ordre :
1. design/design.md — système de design, autoritaire sur les couleurs, la typo, l'espacement et les composants
2. design/copy-deck.md — tous les textes de l'interface
3. design/mockups/*.png — les maquettes de référence
4. CLAUDE.md — conventions du repo

Règles non négociables :
- Le front vit UNIQUEMENT dans web/. N'ajoute jamais de dépendance Next au package.json racine.
- L'actif s'appelle XRP, jamais XRPL. Montants en XRP uniquement, aucun montant en dollars.
- Les montants du ledger sont des strings en drops partout, sauf au formatage d'affichage.
- Ne réimplémente jamais une transaction côté front. Tout passe par lib/xrpl/* appelé
  depuis web/src/app/api/*.
- Toute action on-chain produit un TxReceipt persistant avec hash + lien explorer. Jamais un toast.
- N'invente aucun texte d'interface : prends les strings dans copy-deck.md.
- Les titres de section terminent par un point (« Open campaigns. »), en sentence case.

Dis-moi ce que tu as compris du système de design en 5 lignes avant de commencer,
puis attends mon prompt suivant. N'écris pas de code maintenant.
```

Le « dis-moi en 5 lignes » n'est pas de la politesse : s'il restitue mal le zonage du dégradé ou la jauge à deux segments, tu le corriges avant qu'il génère 40 fichiers.

---

## Prompt 1 — Tokens et fondations

```
Mets en place les fondations du front dans web/ :

1. tailwind.config.ts — reprends exactement les tokens du §8 de design/design.md
   (couleurs, backgroundImage brand/header/fade, borderRadius card/input, boxShadow glow).
2. Polices via next/font/google : Poppins 400/500/600 en --font-poppins,
   JetBrains Mono 400 en --font-jetbrains. Câble-les dans tailwind.config fontFamily.
3. web/src/styles/globals.css — fond bg, texte ink, tabular-nums global,
   et les classes utilitaires de typo du §3 (display-xl, display, amount-xl, amount, h3,
   body, label, chip, mono) en @layer components.
4. web/src/lib/format.ts — dropsToXrp, xrpToDrops, formatAmount (séparateur de milliers,
   décimales seulement si non nulles), truncateAddress (8 premiers / 4 derniers), formatPct.
5. web/src/lib/explorer.ts — txUrl(hash), accountUrl(address), objectUrl(id)
   sur https://devnet.xrpl.org.
6. web/src/lib/types.ts — les types du §2 de web-architecture.md (Deployment, Vault,
   Broker, Loan, Campaign, LedgerSnapshot, TxResult). Montants en string.

Aucun composant visuel pour l'instant. Termine par une page /test qui affiche
tous les styles de typo et toutes les couleurs, pour que je valide visuellement.
```

La page `/test` te fait gagner un temps considérable : tu vois immédiatement si le dégradé, les polices et les nuances de surface sont justes, avant de les propager partout.

---

## Prompt 2 — Primitives UI

```
Crée web/src/components/ui/ :

- Button.tsx — variantes primary (blanc plein, texte bg), gradient (bg-brand, max 1 par vue),
  outline, ghost, destructive, disabled. 52px, radius 999px, poids 500.
  Prop `state` : idle | signing | submitting, avec les libellés du copy-deck
  (« Waiting for your signature… », « Submitting to the ledger… »). Jamais un spinner nu.
- Chip.tsx — variantes filter (active = bg-brand, inactive = surface-raised + 1px line)
  et status (fond à 12 % de la couleur sémantique, texte en couleur pleine).
- Amount.tsx — grand nombre tabulaire + unité en span à 60 % en ink-muted.
  Props : value (drops string), unit, size (xl | md).
- Address.tsx — mono tronqué + bouton copier avec état « Copied ».
- Card.tsx — surface, radius 20px, padding 24px, 1px line, pas de divider d'en-tête.
- HeaderBand.tsx — bandeau full-bleed avec prop `variant` : photo (image + scrim
  rgba(4,3,8,.45)) ou gradient (bg-header), toujours avec le fade vers bg en bas.
- DisplayTitle.tsx — titre display qui ajoute automatiquement le point final.

Respecte le §2.4 de design.md sur le zonage du dégradé. Ajoute chaque composant
à la page /test.
```

---

## Prompt 3 — Les cinq composants protocolaires

Le prompt le plus important du lot. Ce sont eux qui portent la note.

```
Crée web/src/components/protocol/. Ce sont les composants qui prouvent le protocole
au jury — soigne-les plus que le reste.

1. TxReceipt.tsx — carte persistante, surface-raised, radius 12px, bordure gauche 3px
   en ok (validated) ou bad (rejected). Contenu : type de transaction en h3, hash en mono
   tronqué + copie, engineResult en mono, ledgerIndex, lien « View on explorer » blanc souligné.
   JAMAIS un toast. Prévois un TxReceiptList qui empile du plus récent au plus ancien.

2. FundingBar.tsx — pill 999px. CRITIQUE : deux segments distincts et jointifs,
   pas un dégradé continu. Segment 1 en `secured` = le cover first-loss de l'organisateur
   (LoanBrokerCoverDeposit). Segment 2 en `community` = les dépôts des prêteurs (VaultDeposit).
   Reste en surface-raised. Au-dessus : montant levé en amount-xl + objectif en amount.
   En dessous : légende en trois parties avec une puce de 8px par segment.
   Props : coverDrops, depositsDrops, targetDrops, size (card 8px | detail 14px | dash 12px).
   Si 100 % financé : la piste restante disparaît, chip « 100% FUNDED » en ok.

3. PhaseStrip.tsx — trois segments égaux, conteneur 999px, 40px de haut, surface-raised.
   Terminé : fond line, texte ink-faint. Actif : bg-brand, texte blanc, compte à rebours
   en dessous en `due`. À venir : transparent, ink-muted.
   Labels : Subscription / Investment / Redemption.

4. GuardrailCard.tsx — état rejeté, présenté comme délibéré. Titre « Rejected by the protocol »
   en BLANC, pas en rouge (le rouge est réservé au défaut). Lignes : Attempted, Why
   (langage clair), Engine result (mono). Pied en ink-muted avec la phrase du copy-deck.
   Bordure gauche bad, tout le reste calme.

5. PPSCard.tsx — la preuve visuelle du rendement. Deux amount-xl avec une flèche entre,
   avant → après, delta en ok. Ligne de labels dessous : AssetsTotal / SharesTotal /
   Price per share, valeurs en mono.

Crée aussi web/src/lib/phase.ts : type Phase, currentPhase(now, subEnd, redStart),
la table ALLOWED du §4 de web-architecture.md, et gate(phase, action) qui renvoie
{ allowed, reason }. Tous les boutons d'action liront gate() et, si bloqué,
s'afficheront disabled avec la raison visible en dessous en `warn` — jamais un tooltip.
```

---

## Prompt 4 — Route handlers

À n'envoyer qu'une fois que `lib/xrpl/` existe et expose des fonctions. Vérifie auprès du dev.

```
Crée les route handlers dans web/src/app/api/. Chacun importe les fonctions de lib/xrpl/
à la racine du repo — ne réimplémente aucune transaction.

- GET  /api/state      → readState(), renvoie le snapshot complet :
                         deployment + assetsTotal, sharesTotal, pps, coverAvailable,
                         loanOutstanding, phase courante
- POST /api/deposit    → vaultDeposit({ persona, amountDrops })
- POST /api/withdraw   → vaultWithdraw({ persona, sharesDrops })
- POST /api/drawdown   → loanDrawdown()
- POST /api/repay      → loanPay({ amountDrops })
- POST /api/donate     → vaultDeposit avec le flag tfVaultDonation
- POST /api/manage     → loanManage({ action: 'impair' | 'default' })

Règles :
- Lis les seeds depuis state/deployment.json côté serveur uniquement. Aucun seed
  ne doit jamais atteindre le client.
- Un échec ledger (code tec*) n'est PAS une erreur HTTP : renvoie 200 avec
  { hash, engineResult, validated: false }. Le front doit pouvoir l'afficher.
- Chaque réponse inclut hash, engineResult, validated, ledgerIndex.
- Ajoute un paramètre `bypassGate: true` sur deposit et withdraw : les boutons
  garde-fous de la console doivent pouvoir soumettre malgré la phase, pour que
  ce soit le ledger qui refuse et qu'on capture un vrai code d'erreur.
- Après chaque transaction validée, append une ligne dans tx-links.md à la racine.
```

Le `bypassGate` est le point à ne pas laisser passer. Sans lui, ton UI bloque les rejets avant soumission et tu n'as rien à montrer.

---

## Prompt 5 — `/console`

```
Construis web/src/app/console/page.tsx, la page de démo pour le jury.

Structure : HeaderBand gradient, DisplayTitle « Demo console. », sous-titre du copy-deck.
Puis PhaseStrip en haut, toujours visible. Puis PPSCard. Puis trois groupes de boutons,
chacun rendant un TxReceipt en dessous après exécution :

- « Happy path » : simuler la billetterie et rembourser intégralement (repay),
  faire entrer l'intérêt dans le vault (donate, tfVaultDonation), racheter les positions (withdraw)
- « Failure path » : impair puis default, en boutons destructive
- « Guardrails » : trois boutons qui appellent les API avec bypassGate: true —
  deposit pendant Investment, withdraw pendant Investment, loanSet pendant Redemption.
  Chacun rend un GuardrailCard, pas un TxReceipt.

En bas : « Session transactions. » — table de tous les reçus de la session
(type, hash, engineResult, ledger) avec un bouton d'export JSON.

Polling de /api/state toutes les 5 secondes pour que la phase et le PPS se mettent à jour
en direct pendant la démo. Textes exclusivement depuis copy-deck.md §7 et §8.
```

---

## Prompt 6 — `/campaign/[id]`

```
Construis web/src/app/campaign/[id]/page.tsx en suivant design/mockups/02-campaign.png,
avec les corrections du §9 de design.md.

Layout deux colonnes : contenu à gauche (~62 %), LendPanel sticky à droite (~38 %),
gutter 48px, panneau collé à 96px du haut.

Header : HeaderBand variant photo avec le flyer, breadcrumb, titre de l'événement en display,
ligne de méta (adresse, lieu, date), CTA gradient « Invest in the campaign ».

Colonne gauche : PhaseStrip, DisplayTitle « Campaign funding. » (pas « Campaigns investments. »),
la rangée de métriques (raised / goal / fixed yield / tenor) en MetaRow, FundingBar en taille detail,
la description de l'événement, LoanTimeline, puis DisplayTitle « Activity. » + TxReceiptList.

LendPanel : suis le §5.7 de design.md à la lettre — titre « Back this bangerz », label
« Amount to lend » en `due`, « min 50 XRP » à droite, input avec sélecteur d'actif,
chips +50/+100/+150/+200/+250 et MAX en pink, encart surface-inset avec PRINCIPAL /
PROJECTED YIELD en ok / TOTAL PAYOUT, note de cover avec glyphe bouclier en secured,
CTA blanc plein. Ajoute sous le CTA la ligne de risque du §5.7.

Le bouton de prêt lit gate() : hors Subscription, il est disabled avec la raison visible.
Textes depuis copy-deck.md §3. Tout en anglais.
```

---

## Prompts 7 à 9 — le reste

```
7. Construis /dashboard d'après design/mockups/03-borrower-panel.png. Ajoute ce qui manque
   dans la maquette : le cover de l'organisateur affiché séparément des dépôts, les actions
   drawdown et repay gated par phase avec raison visible, et une section Activity. avec
   les TxReceipt. Textes depuis copy-deck.md §5.

8. Construis /positions d'après design/mockups/04-lender-positions.png. Corrige la rangée
   de totaux — la maquette répète trois fois PRINCIPAL ; ce doit être Total lent /
   Current value / Accrued yield / Positions. Puis crée les PositionCard qui manquent
   entièrement à la maquette : vault shares, deposited, current value, yield, chip de statut,
   bouton redeem gated sur Redemption. Textes depuis copy-deck.md §6.

9. Construis / d'après design/mockups/01-marketplace.png. SUPPRIME le bloc de faux avis
   « 4.9 sur 19k avis ». Une campagne réelle depuis /api/state, deux ou trois seedées
   en statique pour remplir la grille. Cartes avec FundingBar compacte à deux segments.
   Textes depuis copy-deck.md §2.
```

---

## Prompts de correction, à garder sous la main

```
« Tu as utilisé un dégradé sur plus d'une zone dans cette vue. Relis le §2.4 de design.md
  et ramène-toi à trois zones maximum : header, barre de progression, un seul CTA. »

« Tu as affiché XRPL comme ticker. L'actif est XRP. Corrige partout dans ce fichier. »

« Ce toast doit être un TxReceipt persistant. Relis le §5.4 de design.md. »

« Tu as inventé ce texte. Prends la string correspondante dans design/copy-deck.md
  ou demande-moi si elle n'existe pas. »

« La FundingBar affiche un seul segment. Le cover de l'organisateur et les dépôts
  de la communauté sont deux mécanismes distincts et doivent apparaître comme deux
  segments. Relis le §5.2. »
```

Ces cinq-là couvrent les dérives que tu verras réellement. Garde-les dans un coin, tu vas les réutiliser.
