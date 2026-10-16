# Module 6 « Les bons réflexes professionnels » : points à faire valider

**Statut : à soumettre.** Les réflexes et les situations du module sont **génériques**. Ils ont été rédigés sans connaître les procédures précises des services de l'Université Paris-Saclay. Ce tableau prépare la relecture ; il ne constitue pas une validation.

Source des textes : `contenus/modules/module-06.json`. Fiche mémo générée : `fiches/fiche-memo-module-06.html`.

## 1. Procédures et interlocuteurs

Le module ne cite **aucun contact, outil ni adresse**. Il renvoie à « la procédure prévue », au « service compétent » et aux « interlocuteurs compétents ». À trancher : garder ces formulations génériques, ou les remplacer par des références réelles une fois celles-ci confirmées.

| N° | Où | Formulation actuelle | Question posée au relecteur | Référence réelle (à compléter) |
|---|---|---|---|---|
| 1 | 6.2, 6.3, journée, défi q2 | « signaler … selon la procédure prévue » | Existe-t-il un circuit de signalement des anomalies (outil de ticket, référent, adresse) ? Un seul pour tous les services, ou un par application ? | |
| 2 | 6.1, journée 9 h, défi q1 | « une source institutionnelle existe déjà » | Faut-il citer des sources de référence (applications de gestion, entrepôt de données, inventaire) ? | |
| 3 | 6.2, défi q3 | « le référentiel ou la nomenclature applicable » | Quel référentiel citer en exemple pour les formations ? | |
| 4 | Journée 14 h, défi q4 | « vérifier la finalité, les autorisations et les règles applicables » | Cohérent avec le module 4 et la doctrine du DPO ? | |
| 5 | Fiche mémo, rappel | « En cas de doute, je consulte les procédures et les interlocuteurs compétents. » | Faut-il ajouter un lien vers une page interne ? | |

## 2. Leçons et activités

| N° | Où | Réponse attendue | Point à vérifier |
|---|---|---|---|
| 6 | 6.1, fichiers locaux | Un fichier local « n'est pas mauvais en soi » ; le problème est la **source parallèle** | Nuance acceptée ? |
| 7 | 6.1, arbre de décision (5 étapes) | — | Ordre des étapes adapté aux pratiques ? |
| 8 | 6.1, m06-a1 (tableau d'effectifs) | B : vérifier si la source existante répond au besoin et si tu es autorisé à l'utiliser | — |
| 9 | 6.2, six réflexes de saisie | « Actualiser, quand cela relève de ta mission » | La limite de rôle est-elle assez claire ? |
| 10 | 6.2, formulaire A / B | Le formulaire B laisse l'information manquante « Non renseigné : information demandée au service compétent » | Valeurs fictives (« licence info 3 », « 2026 0453 ») réalistes ? |
| 11 | 6.2, m06-a2 (date contradictoire) | B : vérifier la source ou signaler l'incohérence | — |
| 12 | 6.3, métadonnée et exemple | « étudiants inscrits administrativement au 15 octobre » | La date du 15 octobre est-elle une date de référence réellement utilisée ? Sinon, la présenter comme fictive ou la remplacer |
| 13 | 6.3, « Tout ne doit pas être documenté par chacun » | — | Formulation suffisante pour ne pas laisser croire à une documentation exhaustive obligatoire ? |
| 14 | 6.3, m06-a3 | A : la date de référence et la définition des effectifs comptabilisés | — |

## 3. Simulation « Une journée avec les données »

Avertissement affiché : « Situations fictives, pour s'entraîner. En situation réelle, suis les procédures de ton service et demande conseil en cas de doute. »

| N° | Heure | Situation (identifiant) | Service | Réponse attendue | Point à vérifier |
|---|---|---|---|---|---|
| 15 | 9 h | Un nouveau tableau à créer (`nouveau-tableau`) | Patrimoine et maintenance | B : vérifier si l'inventaire existant répond au besoin et si je peux l'utiliser | Réaliste pour ce service ? |
| 16 | 10 h | Une information contradictoire (`contradiction`) | Ressources humaines | B : vérifier auprès de la source ou du service compétent | — |
| 17 | 11 h | Une date manquante (`date-manquante`) | Maintenance des équipements | C : rechercher l'information ou signaler son absence | — |
| 18 | 14 h | Une demande de partage (`demande-partage`) | Administration générale | B : vérifier la finalité, les autorisations et les règles | Relecture par le DPO |
| 19 | 16 h | Un tableau à transmettre (`tableau-documente`) | Scolarité, pour le service finances et pilotage | B : ajouter la date et le périmètre du calcul | Circuit réaliste ? |

## 4. Défi final

| N° | Question | Réponse attendue |
|---|---|---|
| 20 | q1 : avant de créer un tableau de suivi | A : vérifier si les données existent déjà dans une source appropriée |
| 21 | q2 : une information semble incorrecte | B : vérifier ou signaler selon la procédure prévue |
| 22 | q3 : deux codes pour une même catégorie de formation | C : vérifier le référentiel ou la nomenclature applicable |
| 23 | q4 : informations individuelles sans finalité expliquée | B : vérifier le besoin, les autorisations et les règles de partage |
| 24 | q5 : pourquoi une date de référence | C : comprendre à quelle période correspondent les chiffres |

## 5. Durée

Annoncée à 10 min (cible 8 à 10). Le volume lu (environ 1 950 mots) laisse prévoir 10 à 12 min. À mesurer avec quelques agents ; pistes d'allègement dans `docs/conception.md` (décision 24).

## 6. Après relecture

Pour chaque ligne, noter la décision (validé / à reformuler / à retirer) et la formulation retenue. Modifier ensuite `contenus/modules/module-06.json` (la fiche mémo est dans `fiche`), lancer `./build.sh`, puis mettre à jour `statutContenu`.
