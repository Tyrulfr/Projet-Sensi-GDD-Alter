# Module 5 « Qui organise les données ? » : points à faire valider

**Statut : à soumettre.** Les rôles et situations du module sont un **modèle générique**, rédigé sans connaître le détail de l'organisation de la gouvernance de la donnée à l'Université Paris-Saclay. Ce tableau prépare la relecture ; il ne constitue pas une validation.

Source des textes : `contenus/modules/module-05.json`.

## 1. Modèle générique et organisation réelle

Le module distingue volontairement deux niveaux :

- **ce que le module affirme de façon générale** (valable quelle que soit l'organisation) : la gouvernance ne se limite pas à l'informatique ; elle définit règles, responsabilités et modalités de décision ; la gestion opérationnelle les applique ; les métiers participent ; chaque agent contribue ;
- **ce qui dépend de l'établissement** : noms des instances, existence et intitulé des référents, circuits de signalement, autorité d'arbitrage. Le module reste volontairement vague sur ces points (« selon l'organisation établie », « l'instance de gouvernance compétente », « selon la procédure prévue »).

| N° | Rôle générique dans le module | Question posée au relecteur | Équivalent réel à Paris-Saclay (à compléter) |
|---|---|---|---|
| 1 | Décideurs et instances de gouvernance | Existe-t-il une instance identifiée (comité, direction) ? Faut-il la nommer ? | |
| 2 | Responsables métiers | Exemples cités (RH, scolarité, patrimoine, bibliothèque) pertinents ? | |
| 3 | Référents ou gestionnaires de données | Ce rôle existe-t-il ? Sous quel nom (référent données, administrateur de données, *data steward*) ? Le texte précise que nom et périmètre varient. | |
| 4 | Agents producteurs et utilisateurs | Gestes cités (saisir, contrôler, consulter, mettre à jour, réutiliser, signaler) complets ? | |
| 5 | Acteurs techniques et spécialisés | DSI, responsable de la sécurité des systèmes d'information (RSSI), équipes des applications métiers, DPO : liste juste ? | |
| 6 | DPO | « Informe, conseille et contrôle le respect des règles de protection des données personnelles ; n'autorise pas lui-même chaque partage. » Formulation acceptée par le DPO ? | |
| 7 | Schéma (leçon 5.3) | Légende « modèle pédagogique, pas l'organigramme officiel » suffisante ? Faut-il un lien vers une page interne sur la gouvernance ? | |
| 8 | Signalement (leçons 5.3, 5.4, jeu) | Existe-t-il un circuit de signalement des anomalies à citer (outil, adresse, référent) ? | |

## 2. Activités des leçons

| N° | Où | Réponse attendue | Point à vérifier |
|---|---|---|---|
| 9 | 5.1, m05-a1 (codes de locaux) | B : définir collectivement une règle ou une correspondance | — |
| 10 | 5.2, m05-a2 (classement) | Gouvernance : règle de nommage, qui valide, conditions d'accès. Gestion : corriger une date, saisir une inscription, signaler une incohérence | « Signaler » classé en gestion, avec une nuance (« alimente la gouvernance ») : d'accord ? |
| 11 | 5.2, tableau | Gouvernance / gestion en 5 lignes, avec légende sur la frontière non nette | — |
| 12 | 5.3, m05-a3 (code de formation incorrect) | B : signaler ou faire vérifier | — |
| 13 | 5.4, m05-a4 (tableaux locaux contradictoires) | B : signaler et chercher la source de référence | — |

## 3. Jeu « Qui fait quoi avec les données ? »

| N° | Situation (identifiant) | Réponse attendue | Rôles expliqués | Point à vérifier |
|---|---|---|---|---|
| 14 | Définir une règle (`regle`) | Responsables métiers concernés et instance de gouvernance compétente | métiers proposent, instance valide, technique intègre dans les outils | Qui valide réellement une règle de codification des bâtiments ? |
| 15 | Appliquer une règle (`application`) | L'agent applique le format prévu | agent ; responsable ou référent fait connaître la règle | — |
| 16 | Une anomalie détectée (`anomalie`) | La gestionnaire signale ou fait vérifier | gestionnaire signale ; responsable du fichier ou référent vérifie et corrige | Le circuit en bibliothèque est-il celui-là ? |
| 17 | Un problème technique (`technique`) | Service métier et équipes techniques ensemble | agent signale ; métier confirme la règle ; technique corrige | Passage par une assistance (ticket) à mentionner ? |
| 18 | Des besoins qui divergent (`arbitrage`) | Ceux qui ont l'autorité d'arbitrage définie par la gouvernance | services exposent ; instance décide et explique ; tous appliquent | Qui arbitre réellement les libellés de formation ? |
| 19 | Ensemble du jeu | Avertissement : rôles génériques, suivre les procédures du service | | Formulation suffisante ? |

## 4. Défi final

| N° | Question | Réponse attendue |
|---|---|---|
| 20 | q1 : à quoi sert la gouvernance | B : organiser règles, responsabilités, décisions |
| 21 | q2 : règle commune d'identification des bâtiments | A : gouvernance |
| 22 | q3 : incohérence constatée | C : signaler ou faire vérifier |
| 23 | q4 : pourquoi les métiers participent | A : ils connaissent activités, besoins, usages |

## 5. Après relecture

Pour chaque ligne : noter la décision (validé / à reformuler / à retirer) et la formulation retenue. Si l'organisation réelle est confirmée, il est possible de remplacer certaines formulations génériques par les noms réels, en gardant à l'esprit que le module doit rester compréhensible par un agent qui ne connaît pas ces instances. Modifier ensuite `contenus/modules/module-05.json`, lancer `./build.sh`, puis passer `statutContenu` à « validé ».
