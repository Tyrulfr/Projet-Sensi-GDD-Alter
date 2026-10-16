# Guide du concepteur

Tous les contenus pédagogiques sont dans le dossier `contenus/`, au format JSON (texte structuré).
On ne touche jamais au code pour modifier un texte, une question ou une explication.

Après chaque modification :

1. lancer `./build.sh` : les contenus sont **vérifiés** avant toute génération ; en cas d'erreur, un message indique le fichier, la leçon ou l'activité concernée ;
2. lancer `./serve.sh` et vérifier le résultat sur <http://localhost:8000/> ;
3. le package SCORM à jour est dans `exports/` ;
4. committer **aussi** les fichiers générés (`index.html`, `contenus/contenu.js`, `exports/`) : ce sont eux que GitHub Pages publie.

Ne jamais modifier à la main `index.html` (racine) ni `contenus/contenu.js` : ils sont réécrits à chaque `./build.sh`.

Conseil : utiliser un éditeur qui signale les erreurs JSON (Cursor, VS Code). Les erreurs les plus fréquentes sont une virgule manquante ou en trop, et un guillemet `"` non échappé dans un texte (utiliser les guillemets français « » dans les textes).

## Structure d'un module

```json
{
  "id": "m01", "numero": 1, "titre": "…", "duree": 10,
  "objectif": "…",
  "objectifsSpecifiques": [ { "id": "os1-1", "texte": "…" } ],
  "validation": { "navigation": "sequentielle", "leconsObligatoires": true, "evaluation": "m01-quiz", "seuilReussite": 70 },
  "lecons": [ … ],
  "activites": { "m01-a1": { … } },
  "synthese": [ "…" ]
}
```

- `sousTitre` (facultatif) : affiché sous le titre sur la page du module.
- `navigation` : `sequentielle` (chaque leçon s'ouvre après la précédente) ou `libre`.
- `seuilReussite` (facultatif) : pourcentage minimal au quiz (valeur à valider institutionnellement).
  - **avec seuil** (module 1) : statut « réussi » (`passed`) ou « à repasser » (`failed`) ;
  - **sans seuil** (module 2) : une fois les leçons vues et le quiz fait, le module est « terminé » (`completed`), quel que soit le score ; le score est tout de même enregistré.
- Pour un module sans quiz, supprimer `evaluation` : le module sera « terminé » une fois les leçons vues.

## Une leçon

Une leçon est une suite de **blocs** affichés un par un (bouton « Continuer »). Ordre conseillé : situation → découverte → explication → démonstration → activité → à retenir.

| Type de bloc | Champs |
|---|---|
| `situation` | `texte` |
| `texte` | `titre` (facultatif), `texte` |
| `definition` | `terme`, `texte` |
| `exemple` | `titre` (facultatif), `texte`, `etiquette` (facultatif, « Exemple » par défaut ; ex. « Point de vigilance ») |
| `tableau` | `titre`, `colonnes` (liste), `lignes` (liste de listes, même nombre de cellules que de colonnes), `legende` (facultatif, ex. « Données fictives ») |
| `comparateur` | comparaison « avant / après » (module 3, voir ci-dessous) |
| `schema` | schéma cliquable : `titre`, `consigne`, `source` (`libelle`, `detail`), `flux` (texte sur la flèche), `cibles` (au moins 2 : `libelle`, `usage`, `detail` ; 3 cibles s'affichent sur une ligne, 5 cibles sur deux lignes centrées 3 + 2, sans hiérarchie), `legende` (ex. « Exemple illustratif »), `annonce` (facultatif : phrase lue par les lecteurs d'écran avant les cibles, « Cette information peut servir à N services : » par défaut ; module 4 : « Trois critères à examiner : ») |
| `memo` | repères numérotés (module 4 : les quatre réflexes ; module 5 : « Si je… ») : `titre`, `etapes` (au moins 2 : `titre`, `texte`), `legende` (facultatif) |
| `simulateur` | simulateur de situations : décisions (module 4) ou jeu des rôles (module 5), voir ci-dessous |
| `chronologie` | scénario dévoilé étape par étape (bouton « Étape suivante ») : `titre`, `etapes` (au moins 2 : `titre`, `texte`), `conclusion` (facultatif, affichée à la fin). « Continuer » n'apparaît qu'une fois toutes les étapes vues |
| `activite` | `ref` : identifiant d'une activité définie dans `activites` |
| `aretenir` | `texte` |

Dans les textes : `**mot**` met en gras ; une ligne vide (`\n\n`) crée un nouveau paragraphe ; un paragraphe dont **toutes** les lignes commencent par `- ` devient une liste à puces (le séparer du texte précédent par une ligne vide).

## Le comparateur de tableaux

L'apprenant clique sur une cellule du tableau « avant » (ou sur une difficulté de la liste, alternative accessible) ; les cellules concernées sont encadrées et marquées ⚠, l'explication s'affiche. Une fois **toutes** les difficultés examinées, il peut afficher le tableau « après » ; « Continuer » n'apparaît qu'ensuite.

```json
{
  "type": "comparateur",
  "titre": "…", "consigne": "…",
  "avant": { "titre": "Tableau A : …", "colonnes": ["Agent", "Service"], "lignes": [["Martin Julie", "RH"], ["Julie Martin", ""]], "legende": "Données fictives." },
  "problemes": [
    { "id": "doublon", "libelle": "Un risque de doublon", "explication": "…", "cellules": [[0, 0], [1, 0]] }
  ],
  "apres": { "titre": "Tableau B : …", "colonnes": [ … ], "lignes": [ … ], "legende": "…", "atouts": ["…"], "avertissement": "…" }
}
```

- `cellules` : liste de `[ligne, colonne]` du tableau « avant », **comptées à partir de 0** (`[0, 0]` = première ligne de données, première colonne). Une cellule peut appartenir à plusieurs difficultés : un deuxième clic passe à la suivante.
- Une cellule vide (`""`) s'affiche « (non renseignée) ».
- `avertissement` : à garder pour rappeler que le tableau « après » n'est pas une correction automatique (le validateur prévient s'il manque).

## Le simulateur de décisions

Une série de demandes présentées une à une, sous forme de carte (demandeur, finalité annoncée, données demandées). L'apprenant choisit une conduite, valide, puis lit la correction : réflexe adapté ou non, pourquoi, ce qu'il faut vérifier, le risque d'une mauvaise décision, le bon réflexe. Après la dernière situation, un bilan s'affiche avec « Recommencer le simulateur ». La première fois, « Continuer » n'apparaît qu'après le bilan. C'est un exercice **formatif** : il n'entre pas dans le score et n'est pas transmis au LMS.

```json
{
  "type": "simulateur",
  "titre": "Puis-je partager cette donnée ?",
  "consigne": "…",
  "avertissement": "Exercice de sensibilisation, pas un outil de validation : …",
  "decisions": [
    { "id": "partager", "libelle": "Partager", "icone": "↗" },
    { "id": "verifier", "libelle": "Vérifier avant de décider", "icone": "🔍" },
    { "id": "ne-pas-transmettre", "libelle": "Ne pas transmettre en l'état", "icone": "✋" }
  ],
  "scenarios": [
    {
      "id": "salles", "objectif": "os4-3",
      "titre": "Préparer une salle",
      "contexte": "Le service logistique doit réserver une salle pour une formation.",
      "demandeur": "Service logistique",
      "finalite": "Prévoir une salle de capacité suffisante",
      "donnees": "Le nombre de participants inscrits",
      "complement": "(facultatif : information complémentaire, affichée « À noter »)",
      "choix": [
        { "id": "a", "decision": "partager", "texte": "Transmettre l'effectif global des inscrits.", "feedback": "…" },
        { "id": "b", "decision": "verifier", "texte": "…", "feedback": "…" },
        { "id": "c", "decision": "ne-pas-transmettre", "texte": "…", "feedback": "…" }
      ],
      "reponse": "a",
      "correction": { "pourquoi": "…", "aVerifier": ["…", "…"], "risque": "…", "reflexe": "…" }
    }
  ],
  "conclusion": "Ni tout partager, ni tout bloquer : …"
}
```

- `decisions` : les issues possibles, communes à toutes les situations. Le libellé et l'icône s'affichent sur chaque choix (l'icône est décorative : le libellé suffit à comprendre).
- Chaque choix indique sa `decision` et un `texte` propre à la situation ; son `feedback` s'affiche s'il est choisi.
- `reponse` : identifiant du choix attendu. Si le choix est faux, la correction affiche aussi la conduite attendue.
- `objectif` : objectif du module travaillé par la situation (pris en compte par le validateur pour la couverture des objectifs).
- **Ajouter une situation** : copier un scénario, lui donner un `id` nouveau (lettres, chiffres, tirets), adapter les textes. **Modifier une correction** : éditer `correction`, ou le `feedback` du choix concerné.
- Les situations et leurs corrections sont **à faire valider** par les personnes compétentes (DPO notamment) avant diffusion : voir `docs/validation-metier-module-04.md`.

### Variante « jeu des rôles » (module 5)

Le même composant sert au jeu « Qui fait quoi avec les données ? ». Différences :

- **pas de `decisions`** : chaque choix n'a qu'un `texte` (aucune étiquette d'issue n'est affichée) ;
- `fiche` remplace demandeur / finalité / données : liste de `{ "libelle": "Étape", "valeur": "Définir une règle commune" }` ;
- la correction comporte `pourquoi`, `roles` (liste de `{ "role", "contribution" }`, affichée sous « Qui fait quoi ») et `reflexe` ; `aVerifier` et `risque` deviennent facultatifs ;
- `libelles` adapte les textes de l'interface (clés : `etiquette`, `icone`, `iconeCarte`, `question`, `juste`, `faux`, `choixJuste`, `choixAttendu`, `choixFaux`, `attendu`, `manque`, `valider`, `reflexe`, `bilan` au format « singulier|pluriel », `recommencer`). Une clé absente garde le libellé du module 4.

```json
{
  "type": "simulateur",
  "titre": "Qui fait quoi avec les données ?",
  "libelles": { "etiquette": "Jeu des rôles", "question": "Qui doit principalement intervenir à ce stade ?", "juste": "Bonne réponse", "faux": "À revoir", "reflexe": "À retenir", "bilan": "bonne réponse|bonnes réponses", "recommencer": "Recommencer le jeu" },
  "scenarios": [
    {
      "id": "regle", "objectif": "os5-3", "titre": "Définir une règle", "contexte": "…",
      "fiche": [{ "libelle": "Étape", "valeur": "Définir une règle commune" }],
      "choix": [{ "id": "a", "texte": "…", "feedback": "…" }, { "id": "b", "texte": "…", "feedback": "…" }],
      "reponse": "b",
      "correction": { "pourquoi": "…", "roles": [{ "role": "Responsables métiers", "contribution": "expriment les besoins." }], "reflexe": "…" }
    }
  ]
}
```

- Quand plusieurs acteurs interviennent, la question porte sur **qui intervient principalement à ce stade** ; `roles` explique la part de chacun. Éviter les réponses artificiellement exclusives.
- Les rôles sont **génériques** : à faire confirmer avec les équipes chargées de la gouvernance (`docs/validation-metier-module-05.md`).

## Associer des situations à des catégories

C'est l'activité `classement` (voir « Une activité ») : chaque situation reçoit un groupe de boutons radio, un par catégorie. Elle fonctionne au clavier et au doigt, sans glisser-déposer. Le module 3 l'utilise avec 5 catégories (les dimensions de la qualité), le module 4 avec 3 (donnée non personnelle, personnelle, catégorie particulière), le module 5 avec 2 (gouvernance, gestion opérationnelle). Penser à **mélanger l'ordre** des éléments par rapport à celui des catégories.

## Le quiz ou le défi

Le quiz est une leçon de type `evaluation` avec une liste `activites` de questions. Options facultatives :

| Champ | Effet |
|---|---|
| `presentation` | `toutes` (défaut, module 1 : toutes les questions sur une page) ou `une-par-une` (module 2 : une question à la fois, « Vérifier ma réponse », correction immédiate, « Question suivante », puis résultat) |
| `surtitre` | texte au-dessus du titre (défaut « Évaluation » ; module 2 : « Défi final ») |
| `libelleAcces` | bouton de la dernière leçon (défaut « Passer au quiz » ; module 2 : « Relever le défi ») |
| `libelleRecommencer` | bouton de nouvelle tentative (défaut « Repasser le quiz » ; module 2 : « Recommencer le défi ») |
| `messagesResultat` | messages selon le score, en % : `[{ "min": 100, "texte": "…" }, { "min": 60, "texte": "…" }, { "min": 0, "texte": "…" }]`. Le message retenu est celui du plus grand `min` atteint. Avec 3 questions : 3/3 = 100 %, 2/3 = 67 %, 1/3 = 33 % |

La page de résultat affiche aussi la `synthese` du module (« L'essentiel du module ») et, sur le site web uniquement, un bouton vers le module suivant **s'il est disponible** dans le catalogue.

## Modifier une leçon ou une question

- **Changer un texte** : ouvrir le fichier du module (`contenus/modules/module-03.json`, par exemple), trouver le texte (recherche Cmd+F), le modifier entre les guillemets.
- **Ajouter un bloc** : insérer un objet `{ "type": "…", … }` dans la liste `blocs` de la leçon, à la position voulue (attention aux virgules entre blocs).
- **Modifier une question** : dans `activites`, changer `consigne`, `choix`, `reponse` et les deux `explication`. Si la bonne réponse change, mettre à jour `reponse` **et** les explications.
- **Ajouter une question au défi** : créer l'activité (`"notation": { "formative": false, "points": 1 }`), puis ajouter son identifiant dans la liste `activites` de la leçon `evaluation`. Penser à revoir les `messagesResultat` et l'`introduction` (« Trois situations… »).
- Puis `./build.sh` : le site **et** le package SCORM sont régénérés ensemble.

## Une activité

Champs communs : `type`, `consigne`, `objectif` (un identifiant de `objectifsSpecifiques`), `notation` (`formative: true` dans une leçon, `false` dans un quiz ; `points`), `explication.correct` et `explication.incorrect`.

| Type | Champs spécifiques |
|---|---|
| `choix-unique` | `choix` (`id`, `texte`, `feedback` facultatif), `reponse` : l'`id` attendu |
| `choix-multiple` | `choix`, `reponses` : liste des `id` attendus |
| `vrai-faux` | `reponse` : `true` ou `false` |
| `classement` | `categories` (`id`, `texte`), `elements` (`id`, `texte`, `categorie`, `explication` facultative) |

Règles imposées par SCORM 1.2 (vérifiées automatiquement) :

- les `id` de choix, de catégories et d'éléments sont **un seul caractère** (`a`, `b`, `c`… ou `1`, `2`…) ;
- les identifiants d'activités et de leçons ne contiennent ni espace ni accent (`m01-q1`).

**Ne pas renommer un identifiant** d'activité ou de leçon déjà diffusé dans un LMS : la reprise des apprenants en cours s'appuie dessus.

## Ajouter un module

1. Copier un module existant (`module-02.json` pour un module avec défi sans seuil) en `module-03.json` et adapter tous les identifiants (`m03-…`).
2. Dans `contenus/catalogue.json`, passer le module à `"etat": "disponible"` et ajouter `"fichier": "module-03.json"` (le titre, la durée et l'objectif sont alors lus dans le fichier du module).
3. `./build.sh` génère automatiquement `exports/module-03-<titre-du-module>-scorm12.zip` (nom calculé à partir du numéro et du titre, sans accents) et ajoute le lien de téléchargement sur la page Parcours. Le bouton « Module 3 » apparaît automatiquement à la fin du module 2.
4. Attention : modifier le **titre** d'un module change le nom de son ZIP (l'ancien est supprimé au build). Pour un nom court et stable, ajouter `"slugArchive": "qualite-structuration"` dans le fichier du module (module 3 → `module-03-qualite-structuration-scorm12.zip`).
