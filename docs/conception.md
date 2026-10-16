# Dossier de conception — prototype v0.1.0

## 1. Point de départ

Le dossier du projet était vide : aucun code ni document de référence (analyses fines, PowerPoint, grille de maturité) n'était disponible. Le dispositif a donc été construit à partir du cahier des charges (prompt maître). Conséquences :

- les **contenus du module 1 sont une proposition** rédigée à partir des notions listées dans le cahier des charges ; ils doivent être confrontés aux documents de référence dès qu'ils seront disponibles ;
- les titres, durées et objectifs des modules 2 à 7 reprennent le cahier des charges.

## 2. Architecture

```text
contenus/*.json  ──►  scripts/construire.py  ──►  index.html        (mode web, suivi local, publié par GitHub Pages)
 (source unique)      (validation + build)    └─►  exports/*.zip     (mode SCORM 1.2, un ZIP par module)

Dans le navigateur, le même code sert les deux modes :
  app.js / composants.js   affichage et navigation
  moteur.js                progression, notation, statut, sérialisation de l'état
  activites.js             correction des réponses
  suivi-local.js | suivi-scorm12.js   adaptateurs de suivi (interface commune)
```

**Une seule différence** entre les deux modes : la configuration injectée dans `index.html` (`{mode: "web"}` ou `{mode: "scorm", module: "m01"}`) et le contenu embarqué (tous les modules pour le site, un seul pour un ZIP).

### Choix techniques et justification

| Choix | Pourquoi | Conséquence |
|---|---|---|
| JavaScript sans framework, sans dépendance | Un package SCORM doit être autonome et léger (28 Ko) ; aucune chaîne de compilation à maintenir | Code un peu plus verbeux qu'avec un framework |
| Contenus en JSON | Lisible par un non-développeur, validable automatiquement, exploitable plus tard par un éditeur visuel | Syntaxe stricte (virgules, guillemets) : compensée par le validateur |
| Contenu converti en `contenu.js` au build | Fonctionne aussi en ouverture directe de fichier et dans tous les LMS (pas d'appel réseau) | Il faut relancer `./build.sh` après chaque modification |
| Construction en Python standard | Déjà présent sur macOS ; Node.js absent du poste | — |
| Interface commune des adaptateurs (`init / enregistrer / valider / terminer`) | Ajout ultérieur possible d'un adaptateur SCORM 2004 ou xAPI sans toucher au moteur | — |
| Empreinte de version dans les URL des fichiers | Évite qu'un navigateur ou un LMS serve une ancienne version en cache | — |

## 3. Modèle de progression

- **Leçon vue** : tous ses blocs ont été affichés (l'apprenant est arrivé au bloc « À retenir »).
- **Activité formative** : correction immédiate, réponse mémorisée, possibilité de réessayer ; n'entre pas dans la note.
- **Quiz** (module 1) : les 4 questions sont validées ensemble ; score = points obtenus / points possibles, en %. Tentatives illimitées ; le **meilleur score** est conservé.
- **Défi** (module 2) : une question à la fois avec correction immédiate ; le score n'est enregistré qu'à la fin des 3 questions (un défi interrompu reprend au début). Mêmes règles de score et de tentatives.
- **Navigation séquentielle** : une leçon s'ouvre quand les précédentes sont vues ; le quiz après toutes les leçons.

| Situation | Statut moteur | `cmi.core.lesson_status` |
|---|---|---|
| Rien fait | non commencé | `not attempted` → passé à `incomplete` au premier lancement |
| Leçons en cours, ou quiz non passé | en cours | `incomplete` |
| Leçons vues + quiz ≥ seuil | terminé + réussi | `passed` |
| Leçons vues + quiz < seuil | terminé + échoué | `failed` (peut repasser à `passed`) |
| Module **sans seuil** (module 2) : leçons vues + défi fait, quel que soit le score | terminé | `completed` (score transmis) |
| Module sans quiz, leçons vues | terminé | `completed` |

Le seuil (`validation.seuilReussite`) est facultatif et réglable module par module : l'ajouter au module 2 suffit à passer en logique `passed`/`failed`, sans modifier le code.

Un module consulté, terminé et réussi sont donc bien distingués.

## 4. SCORM 1.2

| Donnée | Élément | Moment |
|---|---|---|
| État de reprise (JSON compact, ~60 à 250 caractères pour le module 1) | `cmi.suspend_data` (≤ 4096) | à chaque événement significatif |
| Leçon courante | `cmi.core.lesson_location` | idem |
| Statut | `cmi.core.lesson_status` | idem |
| Score | `cmi.core.score.raw` / `min` = 0 / `max` = 100 | après chaque tentative de quiz |
| Réponses au quiz | `cmi.interactions.n.*` (id, type, time, weighting, student_response, correct_responses.0.pattern, result, objectives.0.id) | après chaque tentative ; désactivé automatiquement si le LMS ne les gère pas |
| Temps de session | `cmi.core.session_time` (`HH:MM:SS`) | une seule fois, à la fermeture |
| Sortie | `cmi.core.exit` = `suspend` tant que le module n'est pas réussi ; vide une fois réussi ou terminé | à la fermeture |

Cycle de vie : recherche de l'API (fenêtres parentes puis fenêtre d'origine) → `LMSInitialize` une seule fois → lecture des données existantes → `LMSSetValue` + `LMSCommit` à chaque événement → `LMSFinish` une seule fois (bouton « Terminer et enregistrer », ou fermeture de la fenêtre). Une sauvegarde est aussi déclenchée quand l'onglet passe en arrière-plan.

Cas particuliers gérés : mode `review`/`browse` du LMS (aucune écriture), absence d'API (aperçu avec avertissement, rien n'est enregistré), état de reprise corrompu ou issu d'une version antérieure du contenu (éléments inconnus ignorés), dépassement de la limite de 4096 caractères (dégradation progressive : on abandonne le détail des réponses avant la progression).

Le manifeste déclare un `adlcp:masteryscore` égal au seuil (70 pour le module 1) : certains LMS l'utilisent pour calculer eux-mêmes le statut. Le module 2, sans seuil, n'en déclare pas : le LMS ne doit pas transformer `completed` en `passed`/`failed` (à vérifier sur eCampus).

**Suivi transversal** : chaque module est un package indépendant. SCORM 1.2 ne permet pas à un module de connaître les résultats des autres : la consolidation des 7 modules (et une éventuelle attestation / un badge) devra être faite par le LMS (achèvement de cours Moodle, par exemple).

## 5. Accessibilité (WCAG 2.2 AA visé)

Navigation complète au clavier, lien d'évitement, focus déplacé sur chaque nouveau bloc ou feedback, annonces vocales (`aria-live`), questions en `fieldset`/`legend`, feedback signalé par un texte et une icône (pas uniquement la couleur), cibles tactiles ≥ 44 px, aucune limite de temps, respect de « réduire les animations », tableaux avec en-têtes. Contrastes choisis ≥ 4,5:1. **Un audit avec lecteur d'écran réel (VoiceOver, NVDA) reste à faire.**

## 6. Décisions à valider

1. **Tutoiement** : le cahier des charges l'utilise dans ses exemples ; il a été appliqué partout. À confirmer (le vouvoiement est plus courant dans les formations institutionnelles).
2. **Seuil de réussite** de 70 % et **tentatives illimitées** avec conservation du meilleur score.
3. **Navigation séquentielle** dans un module (alternative : libre).
4. **Contenus du module 1** (3 leçons, 4 exercices, quiz de 4 questions) : exactitude, exemples métiers, ton.
5. **Couleurs** inspirées de l'Université (prune `#63003c`) : à faire valider par la direction de la communication ; aucun logo n'a été utilisé.
6. **Version SCORM** : 1.2 retenue ; à confirmer avec les administrateurs d'eCampus (version de Moodle, réglages d'import, gestion des tentatives).
7. **Sortie après réussite** (`exit` vide) : selon le réglage du LMS, une nouvelle ouverture peut créer une nouvelle tentative. Alternative : toujours `suspend`.
8. **Reconnaissance de complétion** (attestation, badge) : à définir côté LMS.
9. **Module 2 sans seuil** : statut `completed` une fois le défi fait, quel que soit le score. Faut-il un seuil (et lequel : 2/3 ?) pour obtenir `passed` ?
10. **Contenus du module 2** : exemples (RH, scolarité, bibliothèque, maintenance) présentés comme illustratifs ; formulations à faire relire, notamment « patrimoine informationnel ».
11. **Nom des archives** : `module-XX-<titre>-scorm12.zip`. Le ZIP du module 1 a été renommé (ancienne adresse `module-01-scorm.zip` supprimée).
12. **Module 3 sans seuil** (même règle que le module 2) et durée annoncée de **10 min** (haut de la fourchette 8–10 min : c'est le module le plus dense, environ 1 000 mots de leçons et 8 interactions).
13. **Contenus du module 3** : tableaux et noms fictifs ; le tableau B est présenté comme une structure cible supposant des vérifications, jamais comme une correction automatique. Les 5 dimensions retenues (exactitude, complétude, cohérence, actualité, conformité au format) sont à faire valider.
14. **Exploration du comparateur obligatoire** (les 5 difficultés) avant d'afficher le tableau B et de continuer. Alternative possible : rendre le tableau B accessible directement.

## 7. Évolutions possibles de l'espace concepteur

Aujourd'hui : fichiers JSON + validateur + guide (`concepteur/README.md`). Si le volume de modifications le justifie, une page d'édition locale (formulaires générant le JSON, aperçu immédiat) pourrait être ajoutée sans modifier le moteur, puisque le format de contenu est déjà stabilisé et validé.
