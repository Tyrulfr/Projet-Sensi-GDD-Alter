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

- `navigation` : `sequentielle` (chaque leçon s'ouvre après la précédente) ou `libre`.
- `seuilReussite` : pourcentage minimal au quiz (valeur à valider institutionnellement).
- Pour un module sans quiz, supprimer `evaluation` : le module sera « terminé » une fois les leçons vues.

## Une leçon

Une leçon est une suite de **blocs** affichés un par un (bouton « Continuer »). Ordre conseillé : situation → découverte → explication → démonstration → activité → à retenir.

| Type de bloc | Champs |
|---|---|
| `situation` | `texte` |
| `texte` | `titre` (facultatif), `texte` |
| `definition` | `terme`, `texte` |
| `exemple` | `titre` (facultatif), `texte` |
| `tableau` | `titre`, `colonnes` (liste), `lignes` (liste de listes, même nombre de cellules que de colonnes) |
| `activite` | `ref` : identifiant d'une activité définie dans `activites` |
| `aretenir` | `texte` |

Dans les textes : `**mot**` met en gras ; une ligne vide (`\n\n`) crée un nouveau paragraphe.

Le quiz est une leçon de type `evaluation` avec une liste `activites` de questions.

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

1. Copier `contenus/modules/module-01.json` en `module-02.json` et adapter tous les identifiants (`m02-…`).
2. Dans `contenus/catalogue.json`, passer le module à `"etat": "disponible"` et ajouter `"fichier": "module-02.json"` (le titre, la durée et l'objectif sont alors lus dans le fichier du module).
3. `./build.sh` génère automatiquement `exports/module-02-scorm.zip`.
