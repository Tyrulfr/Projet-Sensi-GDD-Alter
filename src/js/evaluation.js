/*
 * Évaluation du dispositif (site web, profils testeurs).
 * Quatre dimensions entières, questions non réécrites :
 *  - ESEL utilité perçue (1, 6, 11), difficulté perçue (2, 5, 13), intentionnalité (14 à 17)
 *  - QualFAD clarté-navigation (1, 2, 24, 25)
 * « MOOC » est remplacé par le dispositif, comme chaque échelle l'autorise.
 * Les items 24 et 25 de QualFAD reprennent les items 1 et 2 : la sous-échelle les compte tous les quatre.
 * Pas de score global : FOR, METH et le reste de QualFAD ne sont pas administrés.
 */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};

  var ESEL = {
    id: 'esel',
    min: 1,
    max: 7,
    libelleMin: 'pas du tout d\'accord',
    libelleMax: 'tout à fait d\'accord',
    points: [
      'pas du tout d\'accord',
      'très peu d\'accord',
      'un peu d\'accord',
      'moyennement d\'accord',
      'assez d\'accord',
      'fortement d\'accord',
      'tout à fait d\'accord'
    ]
  };

  var QUALFAD = {
    id: 'qualfad',
    min: 1,
    max: 6,
    libelleMin: 'très en désaccord',
    libelleMax: 'tout à fait en accord',
    points: null
  };

  var dimensions = [
    {
      id: 'up',
      titre: 'Utilité pour ton travail',
      source: 'ESEL, utilité perçue',
      echelle: ESEL,
      lecture: 'Plus la moyenne est haute, plus la formation est jugée utile pour le travail.',
      items: [
        { id: 'esel-up-1', origine: 'ESEL-UP1', enonce: 'Cette formation va influencer positivement ma capacité à être efficace dans mon travail (ou dans mon futur travail).' },
        { id: 'esel-up-6', origine: 'ESEL-UP2', enonce: 'Cette formation a une grande valeur pratique pour mon travail (ou pour mon futur travail).' },
        { id: 'esel-up-11', origine: 'ESEL-UP5', enonce: 'Cette formation va me permettre d\'améliorer mes compétences professionnelles dans mon travail (ou dans mon futur travail).' }
      ]
    },
    {
      id: 'dp',
      titre: 'Difficulté ressentie',
      source: 'ESEL, difficulté perçue',
      echelle: ESEL,
      lecture: 'Plus la moyenne est haute, plus la formation a été jugée difficile. La note n\'est pas inversée.',
      items: [
        { id: 'esel-dp-2', origine: 'ESEL-DP1', enonce: 'J\'ai trouvé cette formation difficile à suivre.' },
        { id: 'esel-dp-5', origine: 'ESEL-DP2', enonce: 'J\'ai trouvé que les questions abordées durant la formation étaient difficiles.' },
        { id: 'esel-dp-13', origine: 'ESEL-DP8', enonce: 'Suivre cette formation m\'a demandé beaucoup d\'effort.' }
      ]
    },
    {
      id: 'nav',
      titre: 'Clarté de la navigation',
      source: 'QualFAD, clarté – navigation',
      echelle: QUALFAD,
      lecture: 'Plus la moyenne est haute, plus l\'environnement et la navigation ont paru clairs.',
      items: [
        { id: 'qf-nav-1', origine: 'QualFAD-01', enonce: 'L\'environnement d\'apprentissage était facile d\'utilisation.' },
        { id: 'qf-nav-2', origine: 'QualFAD-02', enonce: 'La navigation dans le cours était claire et facile.' },
        { id: 'qf-nav-24', origine: 'QualFAD-24', enonce: 'L\'environnement d\'apprentissage était facile d\'utilisation.' },
        { id: 'qf-nav-25', origine: 'QualFAD-25', enonce: 'La navigation dans le cours était claire et facile.' }
      ]
    },
    {
      id: 'int',
      titre: 'Suite que tu donnerais',
      source: 'ESEL, intentionnalité',
      echelle: ESEL,
      lecture: 'Plus la moyenne est haute, plus tu envisages de recourir à nouveau à ce type de formation ou de le recommander.',
      items: [
        { id: 'esel-int-14', origine: 'ESEL-INT4', enonce: 'Si j\'ai besoin de me former pour développer mes compétences professionnelles, j\'ai l\'intention d\'avoir à nouveau recours à un dispositif semblable à cette formation si cela m\'est possible.' },
        { id: 'esel-int-15', origine: 'ESEL-INT6', enonce: 'J\'ai l\'intention de suivre d\'autres formations via une formation en ligne chaque fois que cela me sera possible.' },
        { id: 'esel-int-16', origine: 'ESEL-INT7', enonce: 'Je préfère avoir recours à une formation en ligne si je dois suivre une formation en lien avec mon activité professionnelle.' },
        { id: 'esel-int-17', origine: 'ESEL-INT8', enonce: 'Je pense recommander les formations réalisées dans une formation en ligne à d\'autres personnes.' }
      ]
    }
  ];

  function questions() {
    var liste = [];
    dimensions.forEach(function (d) {
      d.items.forEach(function (item) {
        liste.push({ id: item.id, origine: item.origine, enonce: item.enonce, dimension: d.id, echelle: d.echelle });
      });
    });
    return liste;
  }

  function valeurValide(echelle, brut) {
    var n = typeof brut === 'number' ? brut : Number(brut);
    if (!isFinite(n) || Math.floor(n) !== n) { return null; }
    if (n < echelle.min || n > echelle.max) { return null; }
    return n;
  }

  function noter(reponses) {
    var source = reponses || {};
    var complet = true;
    var detail = dimensions.map(function (d) {
      var valeurs = [];
      d.items.forEach(function (item) {
        var v = valeurValide(d.echelle, source[item.id]);
        if (v === null) { complet = false; } else { valeurs.push(v); }
      });
      var moyenne = valeurs.length === d.items.length
        ? valeurs.reduce(function (s, n) { return s + n; }, 0) / valeurs.length
        : null;
      return {
        id: d.id,
        titre: d.titre,
        source: d.source,
        lecture: d.lecture,
        min: d.echelle.min,
        max: d.echelle.max,
        n: d.items.length,
        moyenne: moyenne
      };
    });
    return { complet: complet, dimensions: detail };
  }

  function cle(idFormation, idTesteur) {
    return 'ups-gdd:v1:' + idFormation + ':' + idTesteur + ':evaluation';
  }

  function stockage() {
    try {
      var s = root.localStorage;
      var test = 'ups-gdd:v1:test-evaluation';
      s.setItem(test, '1');
      s.removeItem(test);
      return s;
    } catch (e) {
      return null;
    }
  }

  function lire(idFormation, idTesteur) {
    var s = stockage();
    if (!s || !idTesteur) { return null; }
    try { return JSON.parse(s.getItem(cle(idFormation, idTesteur)) || 'null'); } catch (e) { return null; }
  }

  function enregistrer(idFormation, idTesteur, reponses) {
    var s = stockage();
    if (!s || !idTesteur) { return false; }
    try {
      s.setItem(cle(idFormation, idTesteur), JSON.stringify({ reponses: reponses || {}, date: new Date().toISOString() }));
      return true;
    } catch (e) {
      return false;
    }
  }

  GDD.evaluation = {
    dimensions: dimensions,
    questions: questions,
    noter: noter,
    lire: lire,
    enregistrer: enregistrer
  };
})(typeof window !== 'undefined' ? window : this);
