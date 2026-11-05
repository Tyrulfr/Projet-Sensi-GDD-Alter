# Consigne de code — compatibilité d'usage

À faire. Quatre modifications. Ne rien faire d'autre.

Hors périmètre : les questions, les corrections, le seuil de 70 %, le score transmis au LMS, le calcul du statut, les badges. Le module 7 ne change pas : correction différée, retour possible, « Valider mes réponses » seulement à la dernière question. Les modules 2 à 6 ne changent pas de rythme.

## 1. Durées annoncées

Source : le champ `duree` de chaque module. L'accueil additionne ces champs. Ne pas écrire 74 en dur.

| Fichier | `duree` actuelle | `duree` à écrire |
|---|---|---|
| `contenus/modules/module-01.json` | 10 | 12 |
| `contenus/modules/module-02.json` | 8 | 10 |
| `contenus/modules/module-03.json` | 10 | 11 |
| `contenus/modules/module-04.json` | 10 | 12 |
| `contenus/modules/module-05.json` | 8 | 11 |
| `contenus/modules/module-06.json` | 10 | 11 |
| `contenus/modules/module-07.json` | 7 | 7, ne pas changer |

Ne pas modifier la phrase du module 7 « Environ 5 à 8 minutes ». Ne pas modifier `docs/conception.md`.

## 2. Ce que le score décide

Le pourcentage reste calculé et enregistré. Seuls les mots affichés changent, dans `src/js/app.js`.

S'il y a un seuil (`st.seuil !== null`, modules 1 et 7) : laisser les libellés actuels, y compris « Meilleur score », « seuil de réussite », « Réussi » et « Seuil non atteint ».

S'il n'y a pas de seuil (`st.seuil === null` et `st.score !== null`, modules 2 à 6) :

- Liste du parcours (`listeModules`) et fiche module (`pageModule`) : remplacer « Meilleur score : X % » par « Résultat du défi : X %. Il ne décide pas si le module est terminé. »
- Écran de résultat (`pageResultat`) : garder le décompte « n / n » et le message de palier. Ajouter, toujours, cette phrase : « Ce résultat ne décide pas de la fin du module. Il est terminé dès que les leçons sont vues et le défi fait. »

Ne pas ajouter cette phrase aux modules qui ont un seuil.

## 3. Repère d'étape dans l'en-tête de leçon

Aujourd'hui, dans `pageLecon`, « Étape n sur n » est seulement à côté de « Continuer », en bas (`src/js/app.js`, bloc `actions-continuer`). L'en-tête (`enteteLecon`) ne montre que la barre du module, qui ne bouge qu'à la fin de la leçon.

Faire ceci :

- Passer à `enteteLecon` l'étape en cours, seulement pour une leçon, et seulement tant que `nb < total` : `{ courante: nb, total: total }`.
- L'afficher en texte dans `.lecon-entete`, entre le `h1` et la barre du module : « Étape n sur n ». Réutiliser la classe `.etape`.
- Laisser le même texte à côté de « Continuer ». Le bouton reste après le bloc en cours. Ne pas le fixer à l'écran.
- Ne pas ajouter de seconde barre. Ne pas faire avancer `statut().progression` à l'intérieur d'une leçon.
- Quand la leçon est entièrement révélée (`nb === total`), ne pas afficher « Étape n sur n » dans l'en-tête. La navigation « Précédent / Leçon suivante » suffit.
- Ne pas ajouter ce repère sur le défi, la mission, le quiz ni l'écran de résultat. Le quiz du module 1 a déjà « Question n sur n » dans `pageDefi`.

## 4. Quiz du module 1, une question à la fois

Décision retenue. Deux rythmes, pas trois.

- Modules 1 à 6 : une question à la fois, correction immédiate, bouton « Vérifier ma réponse », puis « Question suivante ».
- Module 7 : inchangé. « Valider » reste le verbe de la mission, parce qu'il engage la tentative sans montrer la réponse.

Le module 1 garde son titre « Quiz du module », son identifiant `m01-quiz`, son bouton d'accès « Passer au quiz » et « Repasser le quiz ». Il garde le seuil. Il ne devient pas un défi.

Dans `contenus/modules/module-01.json`, leçon `m01-quiz`, ajouter `"presentation": "une-par-une"`. Ne pas ajouter `"correction": "differee"`. Remplacer `introduction` par :

« Quatre questions, une à la fois. Tu découvres la correction après chaque réponse. Il n'y a pas de limite de temps et tu pourras recommencer. Le seuil de réussite est de 70 %. »

Ne pas modifier les questions `m01-q1` à `m01-q4`. Ne pas modifier `src/js/app.js` pour ce point : sans `correction` différée, `presentation` `une-par-une` passe déjà par `pageDefi`, qui affiche « Vérifier ma réponse ». L'écran de résultat continue d'annoncer le seuil, parce que le module 1 en a un.

## Après le code

1. Relancer `./build.sh`. Ne pas éditer `contenus/contenu.js`, `index.html` ni les archives à la main.
2. Vérifier dans le navigateur :
   - l'accueil affiche environ 74 minutes ;
   - une leçon en cours montre « Étape n sur n » sans descendre la page, et « Continuer » reste en bas du bloc ;
   - un défi des modules 2 à 6, même avec un score bas, dit que ce résultat ne décide pas de la fin du module, et le badge reste « Terminé » ;
   - les modules 1 et 7 parlent encore du seuil de 70 % ;
   - le quiz du module 1 montre une question, « Vérifier ma réponse », la correction, puis « Question suivante » ;
   - la mission du module 7 montre encore « Valider mes réponses » seulement à la dernière question, et les corrections après la validation.
