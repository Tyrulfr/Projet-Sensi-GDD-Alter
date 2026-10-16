# Rapport de tests — prototype v0.1.0 (modules 1 et 2)

Date : 12 octobre 2026. Environnement : macOS, navigateur Chromium intégré à Cursor, serveur local `python3 -m http.server`.

Légende : **OK** = testé et conforme ; **Non testé** = pas encore réalisé.

Les sections 1 à 3 concernent le module 1 (premier prototype) ; la section 7 décrit les tests du module 2 et la non-régression du module 1.

## 1. Tests automatisés

| Test | Résultat |
|---|---|
| Tests unitaires du moteur (`tests/index.html`) | **OK — 19 / 19** (27 / 27 depuis l'ajout du module 2) |
| Validation des contenus réels | **OK** — 0 erreur, 0 avertissement |
| Validateur sur contenu volontairement erroné (réponse inexistante, objectif inconnu, activité introuvable, tableau incomplet, seuil 120 %) | **OK** — les 5 erreurs sont détectées avec leur emplacement |
| Manifeste `imsmanifest.xml` bien formé (`xmllint`) | **OK** |
| Intégrité du ZIP (`unzip -t`), manifeste à la racine | **OK** — 12 fichiers, 28 Ko |
| Toutes les ressources référencées présentes dans le package | **OK** (contrôle automatique au build) |

Les tests unitaires couvrent : format du temps SCORM, échappement du texte, correction des 4 types d'activité (réponses justes, partielles, incomplètes), statuts (non commencé / en cours / réussi / échoué, seuil exact à 75 %), conservation du meilleur score, navigation séquentielle, sauvegarde et reprise, reprise d'un état corrompu, taille de `suspend_data` et dégradation au-delà de 4096 caractères, adaptateur SCORM (initialisation, envoi score/statut/interactions, `session_time`, `exit`, un seul `LMSInitialize` et un seul `LMSFinish`, reprise `resume`, mode `review`, absence d'API).

## 2. Site web (tests manuels pilotés dans le navigateur)

| Scénario | Résultat |
|---|---|
| Accueil → module → leçon 1 | **OK** |
| Affichage progressif des blocs, focus déplacé sur le nouveau bloc | **OK** |
| Exercice bloquant : « Continuer » masqué tant que l'exercice n'est pas validé | **OK** |
| Validation sans réponse → message d'aide | **OK** |
| Réponse incorrecte → feedback textuel (✗), réponses attendues signalées, bouton « Réessayer » | **OK** |
| Classement : correction élément par élément avec explication | **OK** |
| Vrai/faux et choix unique avec feedback propre au choix | **OK** |
| Quiz : validation incomplète refusée (questions listées) | **OK** |
| Quiz à 50 % → « Quiz à repasser » ; nouvelle tentative à 100 % → « Réussi », meilleur score sur 2 tentatives | **OK** |
| Quiz à 75 % → réussi | **OK** |
| Reprise après rechargement complet : bouton « Reprendre », retour à la leçon 2, exercice déjà corrigé visible | **OK** (après correction, voir § 5) |
| Page parcours : statut, progression, meilleur score, modules 2–7 « En préparation » | **OK** |
| Affichage 375 px (téléphone) : pas de défilement horizontal | **OK** |

## 3. SCORM 1.2 dans le simulateur (`dist/simulateur/`)

| Scénario | Résultat |
|---|---|
| Lancement : API trouvée, `LMSInitialize` ×1, statut `not attempted` → `incomplete` | **OK** |
| Le package n'affiche ni accueil ni lien vers les autres modules | **OK** |
| Leçon 1 puis fermeture de la fenêtre : `LMSFinish` ×1, `exit=suspend`, `session_time=00:00:03`, `entry=resume` à la relance | **OK** |
| Relance : progression restaurée (leçon 1 terminée, reprise en leçon 2) | **OK** |
| Fin du module + quiz à 75 % : `passed`, `score.raw=75`, `min=0`, `max=100`, 4 interactions (réponse, réponse attendue, `correct`/`wrong`) | **OK** |
| « Terminer et enregistrer » : écran de fin, `LMSFinish` ×1, `total_time` cumulé sur 2 sessions | **OK** |
| Aucune erreur SCORM dans le journal des appels | **OK** |
| LMS sans `cmi.interactions` + quiz à 25 % : `failed`, score transmis, interactions abandonnées sans bloquer, reprise possible | **OK** |
| Package ouvert hors LMS : avertissement « aperçu hors plateforme » | **OK** |

## 4. Non testé à ce jour

| Élément | Pourquoi / prochaine étape |
|---|---|
| **Import dans un vrai LMS** (Moodle de test, SCORM Cloud, puis eCampus) | Indispensable : le simulateur ne prouve pas la compatibilité. Vérifier statut, score, reprise, temps, interactions dans les rapports du LMS |
| Safari, Firefox, Edge ; tablette réelle | Tests faits sous Chromium uniquement |
| Lecteur d'écran (VoiceOver, NVDA) | Structure accessible prévue, non vérifiée avec une aide technique |
| Fermeture brutale du navigateur dans un LMS réel | Dépend du LMS ; la progression est enregistrée à chaque étape, seul le temps de la dernière session peut être perdu |
| Validation stricte ADL (fichiers XSD) | Les schémas XSD ne sont pas joints au package ; Moodle et SCORM Cloud ne les exigent pas, à confirmer pour eCampus |

## 5. Anomalies rencontrées et corrigées

1. **Reprise au milieu d'une leçon** : la leçon repartait de l'étape 1 alors que l'exercice était déjà fait. Corrigé : la leçon se rouvre au dernier exercice répondu.
2. **Ancienne version servie par le cache du navigateur** après une mise à jour. Corrigé : chaque build ajoute une empreinte de version aux URL des scripts et styles.
3. **Consigne doublée** (« Plusieurs réponses possibles » à la fois dans la consigne et dans l'aide automatique). Corrigé dans le contenu.
4. Le manifeste se listait lui-même parmi les fichiers de la ressource. Corrigé.

## 6. Limites connues

- La progression du site web est propre à un navigateur et à un poste : ce n'est pas un suivi institutionnel.
- Le temps de session n'est transmis qu'à la fermeture (choix volontaire, pour éviter un double comptage dans certains LMS).
- Dans un package SCORM, quitter sans passer par « Terminer » repose sur l'événement de fermeture de page, que certains navigateurs mobiles n'exécutent pas toujours.

## 7. Module 2 « Une donnée, plusieurs usages »

### Ce qui a été développé

- Contenu `contenus/modules/module-02.json` : 3 leçons, 3 activités formatives, défi de 3 questions, 5 objectifs tous couverts par au moins une activité.
- Évolutions **réutilisables** du moteur commun (aucune application parallèle) :
  - bloc `schema` (schéma de circulation cliquable, légende « exemple illustratif ») ;
  - bloc `chronologie` (scénario dévoilé étape par étape, bloque « Continuer » jusqu'à la dernière étape) ;
  - évaluation `presentation: "une-par-une"` (défi), libellés et messages de résultat configurables ;
  - seuil de réussite **facultatif** : sans seuil, statut `completed` + score ;
  - listes à puces dans les textes ; libellé d'encadré configurable (« Point de vigilance ») ;
  - bouton « Module suivant » en fin de module, affiché **seulement** si le module suivant est disponible (site web uniquement).
- Nom des archives : `module-02-une-donnee-plusieurs-usages-scorm12.zip` (et renommage de celle du module 1).

### Tests automatisés

| Test | Résultat |
|---|---|
| Tests unitaires : 27 / 27 (dont 7 nouveaux pour le module 2 et 1 pour les listes) | **OK** |
| Bonnes réponses du défi conformes au scénario (Q1 B, Q2 A, Q3 C) | **OK** |
| Défi 3/3 → `completed`, score 100 ; défi 0/3 → `completed` (jamais `failed`), score 0 | **OK** |
| Leçons vues sans défi → `incomplete` | **OK** |
| Validation des contenus réels | **OK** — 0 erreur, 0 avertissement |
| Validateur sur erreurs injectées (schéma à 1 cible, sans légende, étape vide, présentation inconnue, message hors bornes, seuil « 70 » en texte) | **OK** — 5 erreurs et 2 avertissements détectés |
| Manifeste bien formé, sans `masteryscore` (pas de seuil) | **OK** |
| ZIP du module 2 : 12 fichiers, 31 Ko, identique d'un build à l'autre | **OK** |

### Site web (piloté dans le navigateur)

| Scénario | Résultat |
|---|---|
| Page du module : sous-titre, objectif, 5 objectifs, durée 8 min, étapes verrouillées | **OK** |
| Leçon 2.1 : schéma, clic sur chaque service → explication affichée, état « ✓ Consulté », mention « exemple illustratif » | **OK** |
| Leçon 2.1 : vrai/faux bloquant puis feedback | **OK** |
| Leçon 2.2 : chronologie en 4 étapes, focus sur chaque nouvelle étape, « Continuer » bloqué jusqu'à la 4ᵉ | **OK** |
| Leçon 2.2 : réponse B → feedback propre au choix, « Réessayer », réponse A → feedback attendu | **OK** |
| Leçon 2.3 : attitude A → feedback non culpabilisant, réessai, attitude B correcte | **OK** |
| Défi : « Vérifier » sans réponse → message ; correction immédiate ; progression 1/3 → 3/3 ; focus sur chaque nouvelle question puis sur le résultat | **OK** (après correction, voir ci-dessous) |
| Résultat 2/3 : « 2 / 3 bonnes réponses (67 %) », message adapté, statut « Terminé », corrections repliables, notions clés | **OK** |
| « Recommencer le défi » puis 3/3 : message « Bravo », « Meilleur résultat sur 2 tentatives : 3 / 3 » | **OK** |
| Aucun bouton vers le module 3 (non disponible) ; « Retour au parcours » présent | **OK** |
| Rechargement de la page : résultat du défi conservé | **OK** |
| Page Parcours : module 2 « Terminé », 2 liens ZIP | **OK** |
| Affichage 375 px : schéma sur une colonne, pas de défilement horizontal | **OK** |

### SCORM 1.2 dans le simulateur

| Scénario | Résultat |
|---|---|
| Lancement : `LMSInitialize` ×1, `not attempted` → `incomplete` | **OK** |
| Leçon 2.1 puis fermeture : `LMSFinish` ×1, `exit=suspend`, `lesson_location=m02-l2`, `entry=resume` | **OK** |
| Relance : « Reprendre où j'en étais » → leçon 2.2 | **OK** |
| Fin du module, défi à 2/3, « Terminer et enregistrer » : `completed`, `score.raw=67`, `min=0`, `max=100`, 3 interactions (dont 1 `wrong`), `exit` vide, `total_time` cumulé sur 2 sessions | **OK** |
| Pas de bouton « Module suivant » dans le package | **OK** |
| `suspend_data` en fin de parcours : 186 / 4096 caractères | **OK** |

### Non-régression du module 1

| Scénario | Résultat |
|---|---|
| Parcours complet des 3 leçons, quiz sur une seule page, 75 % → « Seuil de réussite atteint (70 %) », statut « Réussi » | **OK** |
| Tests unitaires du module 1 (seuil, `passed`/`failed`, reprise, SCORM) | **OK** |
| Nouveau : bouton « Module 2 : Une donnée, plusieurs usages → » en fin de module 1 (site web) | **OK** |

### Anomalies rencontrées et corrigées

1. **Focus perdu** après « Question suivante » (et, dans le module 1, après « Réessayer ») : l'élément visé ne pouvait pas recevoir le focus. Corrigé de façon générale dans l'affichage.
2. Schéma : disposition 3 + 1 peu lisible sur ordinateur. Remplacée par une grille 2 × 2 (1 colonne sur mobile).
3. Texte lu par les lecteurs d'écran au-dessus du schéma reformulé (« Cette information peut servir à 4 services »).

### Limites et points à valider

- Un défi **interrompu** (fenêtre fermée entre deux questions) reprend à la question 1 : les réponses ne sont enregistrées qu'à la fin. Choix de simplicité, à confirmer.
- La position dans une leçon non terminée (étapes de chronologie déjà vues) n'est pas mémorisée après rechargement ; la leçon reprend au dernier exercice répondu.
- **Rien n'a été testé dans un vrai LMS.** À vérifier sur eCampus : import du ZIP ; affichage du statut `completed` (et non `passed`/`failed`) ; prise en compte du score sans seuil ; réglage d'achèvement (« statut terminé requis » plutôt que « note minimale ») ; reprise ; rapport des 3 interactions.
- Les nouveaux composants (schéma, chronologie, défi) n'ont pas été testés avec un lecteur d'écran réel, ni sous Safari, Firefox ou Edge.

## 8. Module 3 « La qualité et la structuration des données »

### Ce qui a été développé

- Contenu `contenus/modules/module-03.json` : 4 leçons, 4 activités formatives (vrai/faux, association des 5 dimensions, 2 questions), défi de 4 questions (réponses B, A, C, A), 6 objectifs couverts. Sans seuil.
- Nouveau composant réutilisable **comparateur** (tableau A cliquable / liste de difficultés / tableau B) ; légende facultative des tableaux ; listes à puces dans les textes.
- L'association utilise l'activité `classement` existante (boutons radio, sans glisser-déposer).
- Archive : `module-03-qualite-structuration-scorm12.zip` (12 fichiers, champ `slugArchive`).
- Validateur : contrôles du comparateur (tailles des tableaux, cellules hors tableau, identifiants en double, textes manquants, avertissement absent) et de `slugArchive`, vérifiés par injection volontaire de 6 erreurs : toutes signalées.

### Tests automatisés

**36 / 36** (dont 9 nouveaux pour le module 3 : réponses attendues, réponses du défi, correction élément par élément de l'association, verrouillage du défi, 3/4 → `completed` 75, 0/4 → meilleur score conservé, adaptateur SCORM avec reprise et 4 interactions, 3 tests d'affichage du comparateur).

### Site web (piloté dans le navigateur, Chrome intégré à Cursor)

| Scénario | Résultat |
|---|---|
| Clic sur une cellule : cellule encadrée, marque ⚠ et mention « (difficulté signalée) » lue par les lecteurs d'écran (pas seulement la couleur) | **OK** |
| Cellule concernée par deux difficultés : un deuxième clic passe à la seconde | **OK** |
| « Voir le tableau mieux structuré » n'apparaît qu'après les 5 difficultés ; focus placé sur le tableau B ; « Continuer » bloqué avant | **OK** |
| Avertissement « structure cible, pas une correction automatique » affiché avec le tableau B | **OK** |
| Leçons 3.2 à 3.4 : vrai/faux, association (correction par élément, « Réessayer »), questions 3.3 (B) et 3.4 (C) | **OK** |
| Défi une question à la fois, focus sur chaque question ; 3/4 → « 3 / 4 bonnes réponses (75 %) », message personnalisé, statut « Terminé », synthèse | **OK** |
| Pas de bouton « Module 4 » (module non disponible) | **OK** |
| Tablette 768 px : tableaux entièrement visibles, cellules de 44 px de haut | **OK** |
| Mobile 375 px : aucune largeur de page excédentaire ; les tableaux défilent dans leur cadre, avec l'indication « Fais glisser le tableau » | **OK** (après correction) |
| Page Parcours : module 3 « Terminé », meilleur score, lien vers le ZIP | **OK** |

### SCORM 1.2 dans le simulateur

| Scénario | Résultat |
|---|---|
| Session 1 interrompue en leçon 3.2 : `incomplete`, `exit` = `suspend`, `lesson_location` = `m03-l2`, 1 `Initialize` et 1 `Finish` | **OK** |
| Session 2 : `entry` = `resume`, reprise en leçon 3.2, fin à 3/4 → `completed`, score brut 75 (min 0, max 100), 4 interactions (q2 fausse), `exit` vide, temps cumulé | **OK** |
| `suspend_data` en fin de parcours : 239 / 4096 caractères ; 0 erreur SCORM | **OK** |
| Aucun lien vers le site web ni vers d'autres modules dans le package ; manifeste bien formé, sans `masteryscore` | **OK** |
| Deux builds successifs produisent des ZIP identiques | **OK** |

### Non-régression des modules 1 et 2

| Scénario | Résultat |
|---|---|
| Module 1 : quiz 4/4 → « Seuil de réussite atteint (70 %) », statut « Réussi », bouton « Module 2 » | **OK** |
| Module 2 : défi 3/3, statut « Terminé » ; **nouveau** bouton « Module 3 : La qualité et la structuration des données → » | **OK** |
| Schéma du module 2 : 4 cibles, pas de débordement de page | **OK** |
| Tests unitaires des modules 1 et 2 | **OK** |

Modifications communes justifiées : la grille des leçons (`.lecon-blocs`) empêche désormais un contenu large de déborder sur mobile (correction utile à tous les modules) ; les ZIP des modules 1 et 2 sont reconstruits parce que le code commun a changé. Leurs contenus n'ont pas été modifiés.

### Anomalies rencontrées et corrigées

1. **Mobile** : le tableau A élargissait toute la page (562 px pour un écran de 375 px). Corrigé dans la grille commune ; le tableau défile désormais dans son cadre.
2. Cellules cliquables peu identifiables avant toute sélection : ajout d'un contour pointillé.
3. Charge de lecture : environ 1 100 mots de leçons, soit 50 % de plus que le module 1. Les explications ont été resserrées (environ 1 000 mots) sans retirer de notion.

### Limites et points à valider

- La progression dans le comparateur n'est pas mémorisée après rechargement : la leçon 3.1 non terminée repart de zéro ; une fois vue, le tableau B est affiché d'emblée.
- Un défi interrompu reprend à la question 1 (comme au module 2).
- Durée réelle à mesurer avec quelques agents (estimation : 8 à 11 minutes).
- **Rien n'a été testé dans un vrai LMS.** À vérifier sur eCampus : import du ZIP, statut `completed` sans seuil, score, reprise, rapport des 4 interactions (dont l'association, de type `matching`), affichage du tableau dans le cadre du LMS sur mobile.
- Pas de test avec un lecteur d'écran réel, ni sous Safari, Firefox ou Edge.

## 9. Module 4 « Partager sans perdre le contrôle »

### Ce qui a été développé

- Contenu `contenus/modules/module-04.json` : 4 leçons, 4 activités formatives (classement en 3 catégories, 3 questions), un simulateur de 4 situations, défi de 4 questions (réponses B, A, B, C), synthèse de 7 messages, 6 objectifs couverts. Sans seuil.
- Nouveaux composants réutilisables : **simulateur de décisions** (`simulateur`) et **mémo** (`memo`). Le schéma accepte désormais une phrase d'annonce configurable et s'affiche sur 3 colonnes quand il a 3 cibles (le schéma du module 2, à 4 cibles, est inchangé).
- Archive : `module-04-partager-sans-perdre-controle-scorm12.zip` (12 fichiers).
- Validateur : contrôle du simulateur (décisions, choix, réponse, correction complète, objectifs, avertissement) et du mémo, vérifié par injection volontaire de 7 erreurs : toutes signalées.
- Tableau de validation métier à soumettre au DPO : `docs/validation-metier-module-04.md`.

### Tests automatisés

**46 / 46** (dont 10 nouveaux pour le module 4). Ils vérifient notamment, sur le contenu lui-même : chaque situation propose les trois issues (partager, vérifier, ne pas transmettre en l'état) ; chacune est la bonne réponse au moins une fois ; la situation « santé » n'attend jamais une transmission ; la rémunération est classée « donnée personnelle » et non « catégorie particulière ».

### Site web (piloté dans le navigateur, Chrome intégré à Cursor)

| Scénario | Résultat |
|---|---|
| Module 4 présent dans le parcours (« Non commencé », puis « Terminé » et meilleur score) avec son lien ZIP | **OK** |
| Leçon 4.1 : classement avec une erreur volontaire (rémunération classée « catégorie particulière ») : correction élément par élément, focus sur le message, « Réessayer » puis réussite | **OK** |
| Leçons 4.2 et 4.3 : questions B, feedback du choix et explication ; schéma à 3 critères sur 3 colonnes, détail affiché au clic, annonce « Trois critères à examiner » | **OK** |
| Leçon 4.4 : mémo des 4 réflexes ; « Continuer » bloqué tant que le simulateur n'est pas terminé | **OK** |
| Simulateur : validation sans choix refusée avec message ; fiche demandeur / finalité / données ; correction en 5 parties ; conduite attendue affichée en cas d'erreur ; annotations textuelles (pas seulement la couleur) ; focus sur la correction puis sur le bilan | **OK** |
| Bilan : « 3 réflexes adaptés sur 4 », récapitulatif par situation, « Recommencer le simulateur » ; « Continuer » disponible ensuite | **OK** |
| Défi : une question à la fois ; 3/4 → « 3 / 4 bonnes réponses (75 %) », message personnalisé, statut « Terminé », synthèse de 7 messages ; pas de bouton « Module 5 » (non disponible) | **OK** |
| Fin du module 3 : nouveau bouton « Module 4 : Partager sans perdre le contrôle → » | **OK** |
| Mobile 375 px : aucune largeur excédentaire ; fiche de la situation et mémo sur une colonne | **OK** |

### SCORM 1.2 dans le simulateur

| Scénario | Résultat |
|---|---|
| Session 1 (leçon 4.1 faite, sortie en leçon 4.2) : `incomplete`, `lesson_location` = `m04-l2`, sortie `suspend` (le LMS passe `entry` à `resume`), 1 `LMSInitialize`, 1 `LMSFinish`, `session_time` au bon format | **OK** |
| Session 2 : « Reprendre où j'en étais » mène à la leçon 4.2 ; fin du module et défi à 3/4 → `completed`, score 75 (min 0, max 100), 4 interactions (q1 `wrong`, les autres `correct`), dernière sortie `""`, temps cumulé | **OK** |
| `suspend_data` en fin de parcours : 235 / 4096 caractères ; 0 erreur SCORM | **OK** |
| Le simulateur, formatif, n'est pas transmis au LMS ; aucun lien vers le site web dans le package | **OK** |

### Non-régression des modules 1 à 3

| Scénario | Résultat |
|---|---|
| Tests unitaires des modules 1, 2 et 3 | **OK** |
| Schéma du module 2 : 4 services, annonce « Cette information peut servir à 4 services » inchangée | **OK** |

### Anomalies rencontrées et corrigées

1. Le point de la situation en cours était trop pâle pour se distinguer : remplacé par un point plein, plus grand.
2. Formulation du bilan peu claire (« réflexe adapté (conduite attendue : partager) ») : reformulée.

### Limites et points à valider

- **Durée** : environ 1 600 mots à lire (leçons et simulateur), contre 1 000 pour le module 3. Estimation : 11 à 13 minutes, au-delà de la cible de 8 à 10 minutes. À mesurer avec quelques agents ; pistes de réduction dans `docs/conception.md` (décision 16).
- La progression dans le simulateur n'est pas mémorisée après rechargement : il reprend à la situation 1 tant que la leçon 4.4 n'est pas terminée (même choix que le comparateur du module 3).
- **Aucune validation juridique** : contenus et corrections à faire relire par le DPO et les référents (`docs/validation-metier-module-04.md`).
- **Rien n'a été testé dans un vrai LMS** (import, statut `completed` sans seuil, score, reprise, 4 interactions).
- Pas de test avec un lecteur d'écran réel, ni sous Safari, Firefox ou Edge. Les icônes des décisions (↗, 🔍, ✋) sont décoratives et peuvent s'afficher différemment selon le système.

## 10. Module 5 « Qui organise les données ? »

### Ce qui a été développé

- Contenu `contenus/modules/module-05.json` : 4 leçons, 4 activités formatives (3 questions et un classement gouvernance / gestion opérationnelle de 6 actions), schéma des 5 familles de rôles, mémo « Si je… » (6 contributions), jeu « Qui fait quoi avec les données ? » (5 situations), défi de 4 questions (réponses B, A, C, A), synthèse de 5 messages, 6 objectifs couverts. Sans seuil.
- **Aucun nouveau moteur** : le jeu des rôles réutilise le simulateur du module 4, rendu paramétrable (libellés, fiche libre, rubrique « Qui fait quoi », issues communes facultatives). Sans paramètre, il se comporte exactement comme avant.
- Schéma à 5 cibles : deux lignes centrées (3 + 2), toutes au même niveau ; une colonne sur mobile.
- Archive : `module-05-qui-organise-les-donnees-scorm12.zip` (12 fichiers, déterministe, sans `masteryscore`).
- Validateur : simulateur sans `decisions`, `fiche`, `roles`, `libelles` contrôlés ; 7 erreurs injectées volontairement, toutes signalées.
- Tableau des points à valider : `docs/validation-metier-module-05.md` (modèle générique / organisation réelle).

### Tests automatisés

**55 / 55** (dont 9 nouveaux pour le module 5) : réponses attendues, classement 3 + 3, cinq familles et disposition à 5 cibles, rôle du DPO non surévalué, légende « pas l'organigramme officiel », 5 situations expliquant chacune plusieurs rôles, défi 1/4 → `completed` 25 sans seuil, reprise SCORM, rendu du jeu (libellés propres, aucune étiquette d'issue, pas de rubriques « À vérifier » ni « Risque », focus sur la correction, bilan « 4 bonnes réponses sur 5 »).

### Site web (piloté dans le navigateur, Chrome intégré à Cursor)

| Scénario | Résultat |
|---|---|
| Module 5 dans le parcours (« Non commencé », 8 min, puis « Terminé » et meilleur score) | **OK** |
| 5.1 : situation, exemple « DS », cadre de gouvernance, question B, à retenir | **OK** |
| 5.2 : définitions, tableau à 5 lignes avec nuance ; classement avec une erreur volontaire (« signaler » en gouvernance) : correction élément par élément et message de nuance | **OK** |
| 5.3 : schéma 3 + 2 centré, détail au clic (DPO : informe, conseille, contrôle, n'autorise pas chaque partage), légende ; question B | **OK** |
| 5.4 : mémo des 6 « Si je… » ; question B ; « Continuer » bloqué tant que le jeu n'est pas terminé | **OK** |
| Jeu : question « Qui doit principalement intervenir à ce stade ? », correction « Réponse attendue », « Qui fait quoi » (rôles), « À retenir » ; focus sur la correction puis sur le bilan ; bilan 4/5 et « Recommencer le jeu » | **OK** |
| Défi 3/4 : « 3 / 4 bonnes réponses (75 %) », message, statut « Terminé », synthèse de 5 messages ; Recommencer, Retour au parcours ; **pas** de bouton Module 6 | **OK** |
| Fin du module 4 : bouton « Module 5 : Qui organise les données ? → » | **OK** |
| Mobile 375 px : aucune largeur excédentaire sur les 5 pages ; rôles du jeu sur une colonne | **OK** |

### SCORM 1.2 dans le simulateur

| Scénario | Résultat |
|---|---|
| Session 1 (leçons 5.1 et 5.2 faites) : `incomplete`, `lesson_location` = `m05-l2`, sortie `suspend`, 1 `LMSInitialize`, 1 `LMSFinish` | **OK** |
| Session 2 : « Reprendre où j'en étais » → leçon 5.2 ; fin du parcours, défi 3/4 → `completed`, score 75 (0–100), 4 interactions (q4 `wrong`), sortie finale `""`, 243 / 4096 caractères | **OK** |
| Parcours complet sur le package final (après allègement des textes) : `completed`, 100, 4 interactions, 245 / 4096 caractères, 0 erreur | **OK** |
| Le jeu des rôles, formatif, n'est pas transmis au LMS | **OK** |

### Non-régression des modules 1 à 4

| Scénario | Résultat |
|---|---|
| Tests unitaires des modules 1 à 4 (46 tests existants) | **OK** |
| Simulateur du module 4 sur le site : « ⚖ Simulateur », « Quelle conduite adopter ? », 3 étiquettes d'issue, fiche demandeur / finalité / données, correction complète (Pourquoi, À vérifier, Risque, Le bon réflexe) | **OK** |
| Schéma du module 2 (4 cibles) : aucune règle de mise en page ajoutée pour 4 cibles, rendu inchangé | **OK** |

Seul changement visible hors module 5 : le message de blocage du simulateur devient « Traite toutes les situations de l'activité pour continuer » (au lieu de « … du simulateur … »), pour convenir aux deux usages.

### Limites et points à valider

- **Durée** : environ 2 200 mots lus sur un parcours (corrections comprises), volume proche du module 4. Estimation : 10 à 12 minutes, au-delà de la cible de 6 à 8 minutes. À mesurer ; pistes dans `docs/conception.md` (décision 20).
- **Rôles génériques** : à confronter à l'organisation réelle (`docs/validation-metier-module-05.md`).
- Progression dans le jeu non mémorisée après rechargement (comme le simulateur du module 4).
- **Rien n'a été testé dans un vrai LMS**. Pas de test avec un lecteur d'écran réel, ni sous Safari, Firefox ou Edge.
