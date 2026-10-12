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
