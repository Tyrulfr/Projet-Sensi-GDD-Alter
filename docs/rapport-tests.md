# Rapport de tests — prototype v0.1.0 (module 1)

Date : 12 octobre 2026. Environnement : macOS, navigateur Chromium intégré à Cursor, serveur local `python3 -m http.server`.

Légende : **OK** = testé et conforme ; **Non testé** = pas encore réalisé.

## 1. Tests automatisés

| Test | Résultat |
|---|---|
| Tests unitaires du moteur (`tests/index.html`) | **OK — 19 / 19** |
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
