# La donnée, une affaire collective

Formation de sensibilisation à la gouvernance de la donnée — Université Paris-Saclay.

Une **source unique** de contenus pédagogiques produit deux diffusions :

- **un site web** (essais, démonstrations, validation pédagogique), avec une progression enregistrée dans le navigateur ;
- **un package SCORM 1.2 par module**, autonome, à importer dans un LMS (Moodle / eCampus).

> État : prototype. Les **modules 1 à 3** sont complets ; les modules 4 à 7 sont déclarés « en préparation ».
> Les contenus sont une **proposition à valider**. La compatibilité eCampus **n'est pas encore vérifiée** (voir `docs/rapport-tests.md`).

## Prérequis

Uniquement Python 3 (déjà présent sur macOS) et un navigateur. Aucune dépendance à installer.

## Commandes

| Commande | Effet |
|---|---|
| `./build.sh` | Valide les contenus, puis génère `index.html` + `contenus/contenu.js` (site web), `exports/module-XX-<titre ou slugArchive>-scorm12.zip` (packages SCORM) et, pour les tests locaux, `dist/scorm/` et `dist/simulateur/` |
| `./serve.sh` | Sert le projet sur `http://localhost:8000` (site, simulateur SCORM, tests) |
| `python3 scripts/valider_contenus.py` | Valide uniquement les contenus |

Après `./serve.sh` :

- site web : <http://localhost:8000/>
- simulateur SCORM 1.2 : <http://localhost:8000/dist/simulateur/>
- tests unitaires : <http://localhost:8000/tests/>

## Publication sur GitHub

Le site est publié par GitHub Pages **directement depuis la branche `main`** (réglage : Settings → Pages → Deploy from a branch → `main` / racine). La page `index.html` à la racine du dépôt est l'accueil de la formation : elle présente les modules et permet de les suivre.

Les fichiers générés publiés (`index.html`, `contenus/contenu.js`, `exports/*.zip`) sont donc versionnés. **Après toute modification des contenus ou du code : lancer `./build.sh`, puis committer.** Le workflow `.github/workflows/publier.yml` vérifie à chaque `push` que les contenus sont valides et que ces fichiers sont bien à jour ; sinon, l'exécution échoue avec un message explicite.

Adresses publiées :

- formation : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/>
- tests unitaires : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/tests/>
- packages SCORM (aussi accessibles depuis la page Parcours) :
  - module 1 : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/exports/module-01-la-donnee-dans-mon-quotidien-scorm12.zip>
  - module 2 : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/exports/module-02-une-donnee-plusieurs-usages-scorm12.zip>
  - module 3 : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/exports/module-03-qualite-structuration-scorm12.zip>

Le simulateur SCORM n'est disponible qu'en local (`./serve.sh`).

## Organisation

```text
index.html                accueil de la formation (GÉNÉRÉ par ./build.sh)
contenus/                 SOURCE PÉDAGOGIQUE UNIQUE (à modifier pour faire évoluer la formation)
  catalogue.json          formation, objectifs, liste des 7 modules
  modules/module-01.json  leçons, blocs, activités, quiz, synthèse du module 1
  modules/module-02.json  idem pour le module 2 (schéma de circulation, chronologie, défi final)
  modules/module-03.json  idem pour le module 3 (comparateur de tableaux, association, défi final)
  contenu.js              version compilée des contenus (GÉNÉRÉ)
exports/                  packages SCORM 1.2, un ZIP par module (GÉNÉRÉ)
src/
  index.html              gabarit commun site / SCORM
  js/util.js              utilitaires (formats SCORM, texte enrichi)
  js/activites.js         correction des activités (indépendante de l'affichage)
  js/moteur.js            moteur de parcours : progression, notation, statut, sauvegarde
  js/suivi-local.js       adaptateur de suivi « navigateur » (site web)
  js/suivi-scorm12.js     adaptateur de suivi SCORM 1.2 (LMS)
  js/composants.js        composants d'affichage (blocs, activités, feedback)
  js/app.js               pages et navigation
  css/theme.css           thème configurable (couleurs, police)
  css/main.css            mise en page
scripts/                  validation et construction (Python, sans dépendance)
outils/simulateur-scorm/  faux LMS SCORM 1.2 pour les tests
tests/                    tests unitaires du moteur (navigateur)
concepteur/               guide de rédaction des contenus
docs/                     conception et rapport de tests
dist/                     fichiers de test générés (non versionnés)
```

## Documentation

- `docs/conception.md` : architecture, modèle de progression, règles SCORM, décisions à valider.
- `docs/rapport-tests.md` : tests réalisés, résultats, limites.
- `concepteur/README.md` : comment modifier un texte, ajouter une leçon ou une question.
