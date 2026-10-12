# La donnée, une affaire collective

Formation de sensibilisation à la gouvernance de la donnée — Université Paris-Saclay.

Une **source unique** de contenus pédagogiques produit deux diffusions :

- **un site web** (essais, démonstrations, validation pédagogique), avec une progression enregistrée dans le navigateur ;
- **un package SCORM 1.2 par module**, autonome, à importer dans un LMS (Moodle / eCampus).

> État : prototype vertical. Le **module 1** est complet ; les modules 2 à 7 sont déclarés « en préparation ».
> Les contenus du module 1 sont une **proposition à valider**. La compatibilité eCampus **n'est pas encore vérifiée** (voir `docs/rapport-tests.md`).

## Prérequis

Uniquement Python 3 (déjà présent sur macOS) et un navigateur. Aucune dépendance à installer.

## Commandes

| Commande | Effet |
|---|---|
| `./build.sh` | Valide les contenus, puis génère `dist/site/`, `dist/scorm/<module>/`, `dist/simulateur/` et `exports/module-XX-scorm.zip` |
| `./serve.sh` | Sert le projet sur `http://localhost:8000` (site, simulateur SCORM, tests) |
| `python3 scripts/valider_contenus.py` | Valide uniquement les contenus |

Après `./serve.sh` :

- site web : <http://localhost:8000/dist/site/>
- simulateur SCORM 1.2 : <http://localhost:8000/dist/simulateur/>
- tests unitaires : <http://localhost:8000/tests/>

## Publication sur GitHub

Les dossiers générés (`dist/`, `exports/`) ne sont pas versionnés : à chaque `push` sur `main`, le workflow `.github/workflows/publier.yml` valide les contenus, reconstruit tout et publie sur GitHub Pages. Une pull request déclenche seulement la validation et la construction.

Réglage à faire une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

Adresses publiées :

- site web : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/>
- simulateur SCORM : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/simulateur/>
- tests unitaires : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/tests/>
- package SCORM du module 1 : <https://tyrulfr.github.io/Projet-Sensi-GDD-Alter/exports/module-01-scorm.zip>

Les ZIP sont aussi disponibles dans l'onglet **Actions**, artefact `packages-scorm` de chaque exécution.

## Organisation

```text
contenus/                 SOURCE PÉDAGOGIQUE UNIQUE (à modifier pour faire évoluer la formation)
  catalogue.json          formation, objectifs, liste des 7 modules
  modules/module-01.json  leçons, blocs, activités, quiz, synthèse du module 1
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
dist/, exports/           fichiers générés (non versionnés)
```

## Documentation

- `docs/conception.md` : architecture, modèle de progression, règles SCORM, décisions à valider.
- `docs/rapport-tests.md` : tests réalisés, résultats, limites.
- `concepteur/README.md` : comment modifier un texte, ajouter une leçon ou une question.
