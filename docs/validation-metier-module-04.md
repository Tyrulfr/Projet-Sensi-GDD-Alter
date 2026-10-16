# Module 4 « Partager sans perdre le contrôle » : points à faire valider

**Statut : à soumettre.** Aucun des éléments ci-dessous n'a encore été validé par le DPO ni par les référents métier. Ce tableau prépare la relecture ; il ne constitue pas une validation juridique.

Source des textes : `contenus/modules/module-04.json` (les numéros renvoient aux leçons et aux identifiants du fichier).

## 1. Notions et affirmations

| N° | Où | Affirmation ou formulation à vérifier | Question posée au relecteur | Relecteur suggéré |
|---|---|---|---|---|
| 1 | Leçon 4.1, définition | Donnée personnelle : information se rapportant à une personne physique identifiée ou identifiable, directement ou non ; exemples cités (adresse électronique nominative professionnelle, numéro étudiant, identifiant agent, certaines données de connexion, rémunération). | Définition et exemples exacts et suffisants pour un public non juriste ? | DPO |
| 2 | Leçon 4.1, exemple « Attention » | Une donnée anodine peut devenir personnelle par recoupement (« agent de 58 ans dans un service de trois personnes »). | Exemple pertinent et non stigmatisant ? | DPO |
| 3 | Leçon 4.1, tableau | Distinction donnée personnelle / donnée confidentielle / catégorie particulière (art. 9). Liste des catégories citée : santé, origine, opinions politiques, convictions religieuses, appartenance syndicale, données génétiques ou biométriques, vie ou orientation sexuelle. | Liste fidèle à l'article 9 ? Faut-il mentionner les données d'infraction (art. 10) ou le NIR, qui ont un régime propre ? | DPO |
| 4 | Leçon 4.1, légende et activité m04-a1 | La rémunération individuelle est très confidentielle mais n'est pas, à elle seule, une catégorie particulière. | Formulation correcte ? | DPO |
| 5 | Leçon 4.2 | Définitions de la finalité et de la minimisation (« adéquat, pertinent et nécessaire »). Exemple : un service d'inscriptions ne peut pas réutiliser « automatiquement » les données pour un autre objectif. | Formulation acceptable sans entrer dans la compatibilité des finalités ultérieures ? | DPO |
| 6 | Leçon 4.2, tableau | Exemple « convocation à un examen : nom, prénom, adresse électronique, formation suivie ». | Correspond-il aux pratiques réelles de la scolarité ? | Référent scolarité |
| 7 | Leçon 4.3 | Définition de l'habilitation ; « avoir techniquement accès à une application ne justifie pas, à lui seul, n'importe quel usage des données ». | Cohérent avec la politique d'habilitation de l'établissement ? | DPO, RSSI ou DSI |
| 8 | Leçon 4.3, légende du schéma | Les trois critères ne suffisent pas toujours : il faut aussi une base légale et le respect des autres règles. | Niveau de détail suffisant ? | DPO |
| 9 | Leçon 4.4, texte | Liste des éléments du cadre RGPD (base juridique, finalité, minimisation, sécurité et confidentialité, transparence, droits des personnes, durée de conservation) ; « un besoin professionnel ne suffit pas, à lui seul, à rendre un partage légal ». | Liste juste et non trompeuse pour un public non juriste ? | DPO |
| 10 | Leçon 4.4, mémo | Les quatre réflexes ; interlocuteurs cités : responsable, référent métier, DPO, service compétent « selon la procédure interne ». | Existe-t-il une procédure interne à citer ou un lien à ajouter (intranet, adresse du DPO) ? | DPO, direction concernée |
| 11 | Activité m04-a4, défi q4 | « Le RGPD permet des traitements et transmissions […] lorsqu'ils reposent sur un cadre juridique approprié ». | Formulation correcte ? | DPO |

## 2. Situations du simulateur « Puis-je partager cette donnée ? »

| N° | Situation (identifiant) | Conduite attendue | Points à vérifier par le relecteur | Relecteur suggéré |
|---|---|---|---|---|
| 12 | Préparer une salle (`salles`) | Partager l'effectif global | La correction cite le risque de ré-identification pour un très petit groupe : faut-il donner un ordre de grandeur, ou s'en tenir à la mention ? Le choix « demander l'avis du DPO » est présenté comme non nécessaire ici : formulation acceptable pour le DPO ? | DPO |
| 13 | Un fichier de rémunérations (`remunerations`) | Vérifier avant de décider (clarifier l'objectif, vérifier l'habilitation avec le responsable) | Le circuit « vérifier avec ton responsable » est-il le bon ? Le refus sans échange est présenté comme inadapté : d'accord ? | DPO, DRH |
| 14 | Un inventaire de la bibliothèque (`bibliotheque`) | Vérifier les conditions de réutilisation, puis transmettre les seules références utiles | Les notices issues de fournisseurs sont-elles réellement soumises à licence dans le SIGB de l'établissement ? L'export standard contient-il bien des données de prêt ? (sinon, adapter le « À noter ») | Direction des bibliothèques |
| 15 | Des informations médicales (`sante`) | Ne pas transmettre, orienter vers les services compétents | Services à citer (service de santé étudiante, accompagnement du handicap : noms exacts à Paris-Saclay ?) ; formulation « l'organisateur a besoin de savoir quoi prévoir, pas de connaître l'état de santé ». Aucun choix ne suggère qu'un responsable reçoive des détails médicaux : à confirmer. | DPO, service de santé, mission handicap |
| 16 | Ensemble du simulateur | Avertissement : exercice de sensibilisation, pas un outil de validation de transmissions réelles | Formulation suffisante ? | DPO |

## 3. Défi final

| N° | Question | Réponse attendue | Point à vérifier |
|---|---|---|---|
| 17 | q1 : adresse électronique professionnelle nominative | B : oui, si elle identifie une personne | Formulation « lorsqu'elle permet d'identifier » acceptable ? |
| 18 | q2 : effectif pour une conférence | A : effectif global | — |
| 19 | q3 : extraction RH sans motif | B : vérifier la finalité et les autorisations | — |
| 20 | q4 : affirmation sur le RGPD | C : le RGPD encadre les conditions | — |

## 4. Après relecture

Pour chaque ligne : noter la décision (validé / à reformuler / à retirer), la formulation retenue et la date. Modifier ensuite le fichier `contenus/modules/module-04.json` (voir `concepteur/README.md`), lancer `./build.sh`, puis passer le champ `statutContenu` du module à « validé » une fois l'ensemble relu.
