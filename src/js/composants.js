/* Composants d'affichage : blocs de leçon et activités. */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};
  var U = GDD.util;
  var A = GDD.activites;
  var UI = GDD.ui = {};
  var compteur = 0;

  function h(tag, attrs, enfants) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) { return; }
        if (k === 'class') { el.className = v; }
        else if (k === 'html') { el.innerHTML = v; }
        else if (k === 'text') { el.textContent = v; }
        else if (k.indexOf('on') === 0) { el.addEventListener(k.slice(2), v); }
        else { el.setAttribute(k, v === true ? '' : v); }
      });
    }
    ajouter(el, enfants);
    return el;
  }

  function ajouter(el, enfants) {
    if (enfants === null || enfants === undefined || enfants === false) { return; }
    if (Array.isArray(enfants)) { enfants.forEach(function (e) { ajouter(el, e); }); return; }
    el.appendChild(typeof enfants === 'string' ? document.createTextNode(enfants) : enfants);
  }

  function uid(prefixe) {
    compteur++;
    return prefixe + '-' + compteur;
  }

  UI.h = h;

  /* ---------- Blocs de contenu ---------- */

  UI.bloc = function (bloc) {
    switch (bloc.type) {
      case 'situation':
        return h('div', { class: 'bloc bloc-situation' }, [
          h('p', { class: 'bloc-etiquette' }, [h('span', { 'aria-hidden': 'true', text: '💬 ' }), 'Situation']),
          h('div', { class: 'bloc-corps', html: U.richText(bloc.texte) })
        ]);
      case 'texte':
        return h('div', { class: 'bloc bloc-texte' }, [
          bloc.titre ? h('h3', { text: bloc.titre }) : null,
          h('div', { class: 'bloc-corps', html: U.richText(bloc.texte) })
        ]);
      case 'definition':
        return h('div', { class: 'bloc bloc-definition' }, [
          h('p', { class: 'bloc-etiquette', text: 'Définition' }),
          h('dl', null, [
            h('dt', { text: bloc.terme }),
            h('dd', { html: U.inlineText(bloc.texte) })
          ])
        ]);
      case 'exemple':
        return h('aside', { class: 'bloc bloc-exemple', 'aria-label': bloc.etiquette || 'Exemple' }, [
          h('p', { class: 'bloc-etiquette', text: bloc.etiquette || 'Exemple' }),
          bloc.titre ? h('h3', { text: bloc.titre }) : null,
          h('div', { class: 'bloc-corps', html: U.richText(bloc.texte) })
        ]);
      case 'tableau':
        return UI.tableau(bloc);
      case 'schema':
        return UI.schema(bloc);
      case 'chronologie':
        return UI.chronologie(bloc);
      case 'comparateur':
        return UI.comparateur(bloc);
      case 'simulateur':
        return UI.simulateur(bloc);
      case 'memo':
        return UI.memo(bloc);
      case 'aretenir':
        return h('div', { class: 'bloc bloc-aretenir' }, [
          h('p', { class: 'bloc-etiquette' }, [h('span', { 'aria-hidden': 'true', text: '★ ' }), 'À retenir']),
          h('div', { class: 'bloc-corps', html: U.richText(bloc.texte) })
        ]);
      default:
        return h('div', { class: 'bloc', text: '[Bloc inconnu : ' + bloc.type + ']' });
    }
  };

  /* Schéma de circulation : une source, un flux, plusieurs usages à explorer. */
  UI.schema = function (bloc) {
    var idDetail = uid('schema');
    var detail = h('div', { class: 'schema-detail', id: idDetail, role: 'status' },
      h('p', { class: 'schema-invite', text: bloc.consigne || 'Sélectionne un service pour découvrir son usage de l\'information.' }));
    var boutons = [];
    var cibles = h('ul', { class: 'schema-cibles schema-cibles-' + bloc.cibles.length });
    bloc.cibles.forEach(function (c) {
      var bouton = h('button', {
        type: 'button', class: 'schema-cible', 'aria-pressed': 'false', 'aria-controls': idDetail,
        onclick: function () {
          boutons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          bouton.setAttribute('aria-pressed', 'true');
          bouton.classList.add('est-consulte');
          bouton.querySelector('.schema-cible-etat').textContent = '✓ Consulté';
          detail.innerHTML = '';
          detail.appendChild(h('p', { class: 'schema-detail-titre' }, [h('strong', { text: c.libelle }), ' : ' + c.usage]));
          detail.appendChild(h('div', { html: U.richText(c.detail) }));
        }
      }, [
        h('span', { class: 'schema-cible-libelle', text: c.libelle }),
        h('span', { class: 'schema-cible-usage', text: c.usage }),
        h('span', { class: 'schema-cible-etat', text: 'Découvrir' })
      ]);
      boutons.push(bouton);
      cibles.appendChild(h('li', null, bouton));
    });
    return h('div', { class: 'bloc bloc-schema' }, [
      h('p', { class: 'bloc-etiquette', text: 'Schéma' }),
      bloc.titre ? h('h3', { text: bloc.titre }) : null,
      h('div', { class: 'schema' }, [
        h('div', { class: 'schema-source' }, [h('span', { class: 'schema-source-libelle', text: bloc.source.libelle }),
          bloc.source.detail ? h('span', { class: 'schema-source-detail', text: bloc.source.detail }) : null]),
        h('div', { class: 'schema-flux', 'aria-hidden': 'true' }, [h('span', { text: bloc.flux }), h('span', { class: 'schema-fleche', text: '↓' })]),
        h('p', { class: 'sr-only', text: bloc.annonce || 'Cette information peut servir à ' + bloc.cibles.length + ' services :' }),
        cibles,
        detail
      ]),
      bloc.legende ? h('p', { class: 'bloc-legende', text: bloc.legende }) : null
    ]);
  };

  /*
   * Chronologie progressive.
   * options : visibles (nombre d'étapes affichées), suivante (function) pour révéler l'étape suivante.
   */
  UI.chronologie = function (bloc, options) {
    var o = options || {};
    var total = bloc.etapes.length;
    var visibles = Math.min(o.visibles || total, total);
    var liste = h('ol', { class: 'chronologie' });
    bloc.etapes.slice(0, visibles).forEach(function (e, i) {
      liste.appendChild(h('li', { class: 'chronologie-etape', id: (o.prefixeId || 'chrono') + '-' + i, tabindex: '-1' }, [
        h('span', { class: 'chronologie-numero', 'aria-hidden': 'true', text: String(i + 1) }),
        h('div', { class: 'chronologie-corps' }, [
          h('p', { class: 'chronologie-titre' }, [h('span', { class: 'sr-only', text: 'Étape ' + (i + 1) + ' : ' }), e.titre]),
          h('div', { html: U.richText(e.texte) })
        ])
      ]));
    });
    return h('div', { class: 'bloc bloc-chronologie' }, [
      h('p', { class: 'bloc-etiquette', text: 'Scénario' }),
      bloc.titre ? h('h3', { text: bloc.titre }) : null,
      liste,
      visibles < total
        ? h('div', { class: 'actions' }, h('button', { type: 'button', class: 'bouton bouton-secondaire', onclick: o.suivante },
          'Étape suivante (' + (visibles + 1) + ' sur ' + total + ')'))
        : (bloc.conclusion ? h('div', { class: 'chronologie-conclusion', html: U.richText(bloc.conclusion) }) : null)
    ]);
  };

  UI.tableau = function (bloc) {
    var idTitre = uid('tab');
    var table = h('table', null, [
      bloc.titre ? h('caption', { id: idTitre, text: bloc.titre }) : null,
      h('thead', null, h('tr', null, bloc.colonnes.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
      h('tbody', null, bloc.lignes.map(function (ligne) {
        return h('tr', null, ligne.map(function (cellule, i) {
          return i === 0 ? h('th', { scope: 'row', text: cellule }) : h('td', { text: cellule });
        }));
      }))
    ]);
    return h('div', { class: 'bloc bloc-tableau' }, [
      h('div', { class: 'tableau-defilant', tabindex: '0', role: 'region', 'aria-labelledby': bloc.titre ? idTitre : null }, table),
      bloc.legende ? h('p', { class: 'bloc-legende tableau-legende', text: bloc.legende }) : null
    ]);
  };

  /*
   * Comparateur de tableaux : repérer les difficultés d'un tableau peu structuré,
   * puis découvrir un tableau mieux structuré.
   * Les libellés se règlent dans bloc.libelles ({n} = nombre de difficultés dans « aide »).
   * options : etat ({ explores: {}, apres: bool }, conservé par l'appelant),
   *           afficherApres (function), prefixeId.
   */
  var LIBELLES_COMPARATEUR = {
    avant: 'Avant : le tableau reçu', difficultes: 'Les difficultés à repérer',
    aide: 'Examine les {n} difficultés pour découvrir un tableau mieux structuré.',
    voirApres: 'Voir le tableau mieux structuré', apres: 'Après : une structure plus claire',
    atouts: 'Ce que cette structure apporte :'
  };

  UI.comparateur = function (bloc, options) {
    var o = options || {};
    var L = {};
    Object.keys(LIBELLES_COMPARATEUR).forEach(function (k) {
      L[k] = bloc.libelles && typeof bloc.libelles[k] === 'string' ? bloc.libelles[k] : LIBELLES_COMPARATEUR[k];
    });
    var etat = o.etat || { explores: {}, apres: true };
    var prefixe = o.prefixeId || uid('comp');
    var problemes = bloc.problemes;
    var cols = bloc.avant.colonnes;
    var boutonsCellules = {};
    var boutonsProblemes = {};

    function cle(l, c) { return l + '-' + c; }
    function libelleCellule(l, c) {
      var v = bloc.avant.lignes[l][c];
      return 'Ligne ' + (l + 1) + ', ' + cols[c] + ' : ' + (v === '' ? 'non renseignée' : v);
    }
    function nbExplores() { return problemes.filter(function (p) { return etat.explores[p.id]; }).length; }
    function marquer(k, actif) {
      var b = boutonsCellules[k];
      b.classList.toggle('est-signalee', actif);
      b.querySelector('.cellule-marque').textContent = actif ? '⚠' : '';
      b.setAttribute('aria-label', b.getAttribute('data-libelle') + (actif ? ' (difficulté signalée)' : ''));
    }
    function effacerMarques() { Object.keys(boutonsCellules).forEach(function (k) { marquer(k, false); }); }

    var compteur = h('p', { class: 'comparateur-compteur', 'aria-live': 'polite' });
    var detail = h('div', { class: 'comparateur-detail', id: prefixe + '-detail', tabindex: '-1' },
      h('p', { class: 'schema-invite', text: 'Sélectionne une cellule du tableau ou une difficulté de la liste.' }));
    var zoneSuite = h('div', { class: 'comparateur-suite' });

    function majSuite() {
      var n = nbExplores();
      compteur.textContent = n + ' difficulté' + (n > 1 ? 's' : '') + ' examinée' + (n > 1 ? 's' : '') + ' sur ' + problemes.length;
      zoneSuite.innerHTML = '';
      if (etat.apres) { return; }
      zoneSuite.appendChild(n < problemes.length
        ? h('p', { class: 'aide', text: L.aide.replace('{n}', problemes.length) })
        : h('div', { class: 'actions' }, h('button', { type: 'button', class: 'bouton bouton-principal', onclick: o.afficherApres },
          L.voirApres)));
    }

    function selectionner(p) {
      etat.explores[p.id] = true;
      effacerMarques();
      Object.keys(boutonsProblemes).forEach(function (id) {
        var b = boutonsProblemes[id];
        b.setAttribute('aria-pressed', String(id === p.id));
        if (etat.explores[id]) { b.querySelector('.schema-cible-etat').textContent = '✓ Examinée'; }
      });
      var lieux = [];
      p.cellules.forEach(function (lc) {
        if (boutonsCellules[cle(lc[0], lc[1])]) { marquer(cle(lc[0], lc[1]), true); }
        lieux.push(libelleCellule(lc[0], lc[1]));
      });
      detail.innerHTML = '';
      detail.appendChild(h('p', { class: 'schema-detail-titre' }, [h('span', { 'aria-hidden': 'true', text: '⚠ ' }), h('strong', { text: p.libelle })]));
      detail.appendChild(h('div', { html: U.richText(p.explication) }));
      detail.appendChild(h('p', { class: 'comparateur-lieux' }, [h('strong', { text: 'Cellules signalées : ' }), lieux.join(' ; ') + '.']));
      majSuite();
    }

    function cliquerCellule(l, c) {
      var concernes = problemes.filter(function (p) {
        return p.cellules.some(function (lc) { return lc[0] === l && lc[1] === c; });
      });
      if (!concernes.length) {
        effacerMarques();
        Object.keys(boutonsProblemes).forEach(function (id) { boutonsProblemes[id].setAttribute('aria-pressed', 'false'); });
        detail.innerHTML = '';
        detail.appendChild(h('p', { text: libelleCellule(l, c) + '. ' + (bloc.sansDifficulte || 'Cette cellule ne présente pas de difficulté particulière prise isolément. Essaie une autre cellule.') }));
        return;
      }
      var nouveau = concernes.filter(function (p) { return !etat.explores[p.id]; })[0];
      selectionner(nouveau || concernes[0]);
    }

    var idTitreAvant = prefixe + '-avant';
    var tableAvant = h('table', { class: 'tableau-comparateur' + (cols.length < 3 ? ' tableau-etroit' : '') }, [
      h('caption', { id: idTitreAvant, text: bloc.avant.titre }),
      h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
      h('tbody', null, bloc.avant.lignes.map(function (ligne, l) {
        return h('tr', null, ligne.map(function (v, c) {
          var b = h('button', {
            type: 'button', class: 'cellule-bouton', 'aria-label': libelleCellule(l, c), 'data-libelle': libelleCellule(l, c),
            onclick: function () { cliquerCellule(l, c); }
          }, [
            v === '' ? h('span', { class: 'cellule-vide', text: '(non renseignée)' }) : h('span', { text: v }),
            h('span', { class: 'cellule-marque', 'aria-hidden': 'true' })
          ]);
          boutonsCellules[cle(l, c)] = b;
          return h('td', { class: 'td-bouton' }, b);
        }));
      }))
    ]);

    var liste = h('ul', { class: 'comparateur-problemes' });
    problemes.forEach(function (p) {
      var b = h('button', {
        type: 'button', class: 'schema-cible', 'aria-pressed': 'false', 'aria-controls': prefixe + '-detail',
        onclick: function () { selectionner(p); }
      }, [
        h('span', { class: 'schema-cible-libelle', text: p.libelle }),
        h('span', { class: 'schema-cible-etat', text: etat.explores[p.id] ? '✓ Examinée' : 'Examiner' })
      ]);
      boutonsProblemes[p.id] = b;
      liste.appendChild(h('li', null, b));
    });

    var apres = null;
    if (etat.apres) {
      var idTitreApres = prefixe + '-apres';
      var tableApres = h('table', { class: 'tableau-comparateur' + (bloc.apres.colonnes.length < 3 ? ' tableau-etroit' : '') }, [
        h('caption', { id: idTitreApres, text: bloc.apres.titre }),
        h('thead', null, h('tr', null, bloc.apres.colonnes.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
        h('tbody', null, bloc.apres.lignes.map(function (ligne) {
          return h('tr', null, ligne.map(function (v) { return h('td', { text: v }); }));
        }))
      ]);
      apres = h('div', { class: 'comparateur-apres', id: prefixe + '-apres-zone', tabindex: '-1' }, [
        h('p', { class: 'comparateur-etiquette comparateur-etiquette-apres', text: L.apres }),
        h('div', { class: 'tableau-defilant', tabindex: '0', role: 'region', 'aria-labelledby': idTitreApres }, tableApres),
        h('p', { class: 'tableau-indice', 'aria-hidden': 'true', text: '↔ Fais glisser le tableau pour voir toutes les colonnes.' }),
        bloc.apres.legende ? h('p', { class: 'bloc-legende', text: bloc.apres.legende }) : null,
        bloc.apres.atouts ? h('div', { class: 'comparateur-atouts' }, [
          h('p', null, h('strong', { text: L.atouts })),
          h('ul', null, bloc.apres.atouts.map(function (a) { return h('li', { text: a }); }))
        ]) : null,
        bloc.apres.avertissement ? h('div', { class: 'note note-alerte', html: U.richText(bloc.apres.avertissement) }) : null
      ]);
    }

    var el = h('div', { class: 'bloc bloc-comparateur' }, [
      h('p', { class: 'bloc-etiquette', text: 'Comparaison' }),
      bloc.titre ? h('h3', { text: bloc.titre }) : null,
      bloc.consigne ? h('p', { text: bloc.consigne }) : null,
      h('p', { class: 'comparateur-etiquette', text: L.avant }),
      h('div', { class: 'tableau-defilant', tabindex: '0', role: 'region', 'aria-labelledby': idTitreAvant }, tableAvant),
      h('p', { class: 'tableau-indice', 'aria-hidden': 'true', text: '↔ Fais glisser le tableau pour voir toutes les colonnes.' }),
      bloc.avant.legende ? h('p', { class: 'bloc-legende', text: bloc.avant.legende }) : null,
      h('p', { class: 'comparateur-sous-titre', text: L.difficultes }),
      liste,
      compteur,
      detail,
      zoneSuite,
      apres
    ]);
    majSuite();
    return el;
  };

  /* Mémo : quelques repères numérotés à garder en tête. */
  UI.memo = function (bloc) {
    return h('div', { class: 'bloc bloc-memo' }, [
      h('p', { class: 'bloc-etiquette', text: bloc.etiquette || 'Mémo' }),
      bloc.titre ? h('h3', { text: bloc.titre }) : null,
      h('ol', { class: 'memo-etapes' + (bloc.disposition === 'enchainement' ? ' memo-enchainement' : '') }, bloc.etapes.map(function (e, i) {
        return h('li', { class: 'memo-etape' }, [
          h('span', { class: 'memo-numero', 'aria-hidden': 'true', text: String(i + 1) }),
          h('div', null, [
            h('p', { class: 'memo-titre', text: e.titre }),
            h('p', { class: 'memo-texte', html: U.inlineText(e.texte) })
          ])
        ]);
      })),
      bloc.legende ? h('p', { class: 'bloc-legende', text: bloc.legende }) : null
    ]);
  };

  /*
   * Simulateur de situations : une série de situations, un choix à faire pour chacune,
   * puis une correction détaillée et un bilan. Exercice formatif, non noté.
   * Sert au simulateur de décisions (module 4), au jeu des rôles (module 5) et à la journée du module 6 :
   * les libellés se règlent dans bloc.libelles, les issues communes (bloc.decisions) sont facultatives,
   * une heure indicative (scenario.heure) transforme la progression en frise horaire,
   * bloc.bilanReflexes résume chaque situation par son réflexe, libelles.revoir ajoute « revoir sans effacer ».
   * options : etat ({ i, choix: { idScenario: idChoix }, termine }, conservé par l'appelant),
   *           surTermine (function (idFocus)) appelée à l'affichage du bilan, prefixeId.
   */
  var LIBELLES_SIMULATEUR = {
    etiquette: 'Simulateur', icone: '⚖', iconeCarte: '✉',
    question: 'Quelle conduite adopter ?',
    juste: 'Réflexe adapté', faux: 'Réflexe à revoir',
    choixJuste: '✓ Ton choix, adapté', choixAttendu: '→ Conduite attendue', choixFaux: '✗ Ton choix, à revoir',
    attendu: 'Conduite attendue', manque: 'Choisis une conduite avant de valider.',
    valider: 'Valider ma décision', reflexe: 'Le bon réflexe',
    bilan: 'réflexe adapté|réflexes adaptés', recommencer: 'Recommencer le simulateur', revoir: ''
  };

  UI.simulateur = function (bloc, options) {
    var o = options || {};
    var etat = o.etat || { i: 0, choix: {}, termine: false };
    var prefixe = o.prefixeId || uid('sim');
    var L = {};
    Object.keys(LIBELLES_SIMULATEUR).forEach(function (k) {
      L[k] = bloc.libelles && typeof bloc.libelles[k] === 'string' ? bloc.libelles[k] : LIBELLES_SIMULATEUR[k];
    });
    var scenarios = bloc.scenarios;
    var n = scenarios.length;
    var horaires = scenarios.every(function (s) { return s.heure; });
    var decisions = {};
    (bloc.decisions || []).forEach(function (d) { decisions[d.id] = d; });

    function choixDe(s, id) { return s.choix.filter(function (c) { return c.id === id; })[0]; }
    function estAdapte(s) { return etat.choix[s.id] === s.reponse; }
    function libelleAttendu(s) {
      var attendu = choixDe(s, s.reponse);
      return decisions[attendu.decision] ? decisions[attendu.decision].libelle + '. ' + attendu.texte : attendu.texte;
    }
    function etiquetteDecision(idDecision) {
      var d = decisions[idDecision];
      if (!d) { return null; }
      return h('span', { class: 'simulateur-decision simulateur-decision-' + d.id }, [
        d.icone ? h('span', { 'aria-hidden': 'true', text: d.icone + ' ' }) : null, d.libelle
      ]);
    }
    function ficheDe(s) {
      if (s.fiche) { return s.fiche; }
      return [
        { libelle: 'Demandeur', valeur: s.demandeur },
        { libelle: 'Finalité annoncée', valeur: s.finalite },
        { libelle: 'Données demandées', valeur: s.donnees },
        s.complement ? { libelle: 'À noter', valeur: s.complement } : null
      ].filter(Boolean);
    }

    var zone = h('div', { class: 'simulateur-zone' });

    function rendre(idFocus) {
      zone.innerHTML = '';
      zone.appendChild(etat.i < n ? carte(scenarios[etat.i], etat.i) : bilan());
      if (idFocus) {
        var cible = document.getElementById(idFocus);
        if (cible) { cible.focus(); }
      }
    }

    function correction(s) {
      var choisi = choixDe(s, etat.choix[s.id]);
      var juste = estAdapte(s);
      var c = s.correction;
      return h('div', { class: 'feedback ' + (juste ? 'feedback-juste' : 'feedback-faux') }, [
        h('p', { class: 'feedback-titre' }, [h('span', { 'aria-hidden': 'true', text: juste ? '✓ ' : '✗ ' }), juste ? L.juste : L.faux]),
        choisi.feedback ? h('p', { html: U.inlineText(choisi.feedback) }) : null,
        juste ? null : h('p', null, [h('strong', { text: L.attendu + ' : ' }), h('span', { html: U.inlineText(libelleAttendu(s)) })]),
        h('div', { class: 'simulateur-criteres' }, [
          h('p', null, [h('strong', { text: 'Pourquoi : ' }), h('span', { html: U.inlineText(c.pourquoi) })]),
          c.roles ? h('p', null, h('strong', { text: 'Qui fait quoi :' })) : null,
          c.roles ? h('dl', { class: 'simulateur-roles' }, c.roles.map(function (r) {
            return [h('dt', { text: r.role }), h('dd', { html: U.inlineText(r.contribution) })];
          })) : null,
          c.aVerifier ? h('p', null, h('strong', { text: 'À vérifier :' })) : null,
          c.aVerifier ? h('ul', null, c.aVerifier.map(function (v) { return h('li', { html: U.inlineText(v) }); })) : null,
          c.risque ? h('p', null, [h('strong', { text: 'Risque d\'une mauvaise décision : ' }), h('span', { html: U.inlineText(c.risque) })]) : null,
          c.reflexe ? h('p', { class: 'simulateur-reflexe' }, [h('strong', { text: L.reflexe + ' : ' }), h('span', { html: U.inlineText(c.reflexe) })]) : null
        ])
      ]);
    }

    function carte(s, i) {
      var nom = prefixe + '-' + s.id;
      var idChoisi = etat.choix[s.id];
      var valide = idChoisi !== undefined;
      var idTitre = prefixe + '-titre';

      var fiche = h('dl', { class: 'simulateur-fiche' }, ficheDe(s).map(function (f) {
        return [h('dt', { text: f.libelle }), h('dd', { html: U.inlineText(f.valeur) })];
      }));

      var champs = h('fieldset', { class: 'activite-champs' }, h('legend', null, [
        h('span', { class: 'activite-consigne', text: s.question || L.question }),
        h('span', { class: 'activite-aide', text: 'Une seule réponse possible.' })
      ]));
      s.choix.forEach(function (c) {
        var id = nom + '-' + c.id;
        var annot = null;
        if (valide) {
          if (c.id === s.reponse && c.id === idChoisi) { annot = { classe: 'juste', texte: L.choixJuste }; }
          else if (c.id === s.reponse) { annot = { classe: 'attendue', texte: L.choixAttendu }; }
          else if (c.id === idChoisi) { annot = { classe: 'fausse', texte: L.choixFaux }; }
        }
        champs.appendChild(h('div', { class: 'option option-decision' + (annot ? ' option-' + annot.classe : '') }, [
          h('input', { type: 'radio', id: id, name: nom, value: c.id, checked: c.id === idChoisi, disabled: valide }),
          h('label', { for: id }, [
            etiquetteDecision(c.decision),
            h('span', { class: 'option-texte', html: U.inlineText(c.texte) }),
            annot ? h('span', { class: 'option-annotation', text: annot.texte }) : null
          ])
        ]));
      });

      var retour = h('div', { class: 'activite-message', id: prefixe + '-retour', tabindex: '-1', role: 'status' },
        valide ? correction(s) : null);

      var actions = h('div', { class: 'actions' });
      if (!valide) {
        actions.appendChild(h('button', {
          type: 'button', class: 'bouton bouton-principal',
          onclick: function () {
            var coche = champs.querySelector('input[name="' + nom + '"]:checked');
            if (!coche) {
              retour.innerHTML = '';
              retour.appendChild(h('p', { class: 'message-alerte', text: L.manque }));
              return;
            }
            etat.choix[s.id] = coche.value;
            rendre(prefixe + '-retour');
          }
        }, L.valider));
      } else if (i < n - 1) {
        actions.appendChild(h('button', {
          type: 'button', class: 'bouton bouton-principal',
          onclick: function () { etat.i = i + 1; rendre(prefixe + '-carte'); }
        }, 'Situation suivante'));
      } else {
        actions.appendChild(h('button', {
          type: 'button', class: 'bouton bouton-principal',
          onclick: function () {
            etat.i = n;
            var premiereFois = !etat.termine;
            etat.termine = true;
            if (premiereFois && o.surTermine) { o.surTermine(prefixe + '-bilan'); } else { rendre(prefixe + '-bilan'); }
          }
        }, 'Voir le bilan'));
      }

      return h('div', null, [
        h('div', { class: 'simulateur-progression' }, [
          h('p', { class: 'activite-numero', text: 'Situation ' + (i + 1) + ' sur ' + n }),
          h('ol', { class: 'simulateur-points' + (horaires ? ' simulateur-horaires' : ''), 'aria-hidden': 'true' }, scenarios.map(function (x, j) {
            return h('li', { class: j < i ? 'est-fait' : (j === i ? 'est-courant' : null), text: horaires ? x.heure : null });
          }))
        ]),
        h('article', { class: 'simulateur-carte', id: prefixe + '-carte', tabindex: '-1', 'aria-labelledby': idTitre }, [
          s.heure ? h('p', { class: 'simulateur-heure' }, [h('span', { 'aria-hidden': 'true', text: '🕘 ' }), s.heure]) : null,
          h('h4', { id: idTitre, class: 'simulateur-titre' }, [L.iconeCarte ? h('span', { 'aria-hidden': 'true', text: L.iconeCarte + ' ' }) : null, s.titre]),
          h('p', { html: U.inlineText(s.contexte) }),
          fiche
        ]),
        champs,
        retour,
        actions
      ]);
    }

    function bilan() {
      var nbAdaptes = scenarios.filter(estAdapte).length;
      var formes = L.bilan.split('|');
      return h('div', { class: 'simulateur-bilan', id: prefixe + '-bilan', tabindex: '-1' }, [
        h('h4', { text: 'Bilan : ' + nbAdaptes + ' ' + (nbAdaptes > 1 ? formes[1] || formes[0] : formes[0]) + ' sur ' + n }),
        h('ul', { class: 'simulateur-recap' }, scenarios.map(function (s) {
          var juste = estAdapte(s);
          var attendu = choixDe(s, s.reponse);
          var resume = decisions[attendu.decision] ? decisions[attendu.decision].libelle.toLowerCase() : attendu.texte;
          if (bloc.bilanReflexes) {
            return h('li', { class: juste ? 'est-juste' : 'est-faux' }, [
              h('span', { 'aria-hidden': 'true', text: juste ? '✓ ' : '✗ ' }),
              h('strong', { text: (s.heure ? s.heure + ' · ' : '') + s.titre }), ' — ',
              h('span', { class: 'simulateur-recap-reflexe', html: U.inlineText(s.correction.reflexe) }),
              ' (' + (juste ? L.juste.toLowerCase() : 'à revoir') + ')'
            ]);
          }
          return h('li', { class: juste ? 'est-juste' : 'est-faux' }, [
            h('span', { 'aria-hidden': 'true', text: juste ? '✓ ' : '✗ ' }),
            h('strong', { text: s.titre }), ' — ',
            h('span', { html: U.inlineText((juste ? L.juste.toLowerCase() + ' : ' : 'à revoir, ' + L.attendu.toLowerCase() + ' : ') + resume.replace(/\.$/, '') + '.') })
          ]);
        })),
        bloc.conclusion ? h('div', { class: 'simulateur-conclusion', html: U.richText(bloc.conclusion) }) : null,
        h('div', { class: 'actions' }, [
          L.revoir ? h('button', {
            type: 'button', class: 'bouton bouton-secondaire',
            onclick: function () { etat.i = 0; rendre(prefixe + '-carte'); }
          }, L.revoir) : null,
          h('button', {
            type: 'button', class: 'bouton bouton-secondaire',
            onclick: function () { etat.i = 0; etat.choix = {}; rendre(prefixe + '-carte'); }
          }, L.recommencer)
        ])
      ]);
    }

    var el = h('div', { class: 'bloc bloc-simulateur' }, [
      h('p', { class: 'bloc-etiquette' }, [L.icone ? h('span', { 'aria-hidden': 'true', text: L.icone + ' ' }) : null, L.etiquette]),
      bloc.titre ? h('h3', { text: bloc.titre }) : null,
      bloc.consigne ? h('p', { text: bloc.consigne }) : null,
      bloc.avertissement ? h('p', { class: 'note', html: U.inlineText(bloc.avertissement) }) : null,
      zone
    ]);
    rendre(null);
    return el;
  };

  /* ---------- Activités ---------- */

  var CONSIGNES_TYPE = {
    'choix-unique': 'Une seule réponse possible.',
    'choix-multiple': 'Plusieurs réponses possibles.',
    'vrai-faux': 'Choisis vrai ou faux.',
    'classement': 'Choisis une catégorie pour chaque élément.'
  };

  /*
   * options :
   *   mode       'formatif' (correction immédiate) | 'evaluation' (corrigée plus tard)
   *   code       réponse déjà enregistrée (chaîne encodée)
   *   corrige    afficher la correction (lecture seule)
   *   titre      intitulé affiché au-dessus de la consigne (ex. « Question 2 sur 4 »)
   *   valider    function(code) -> { correct, details }   (mode formatif)
   *   reessayer  function()
   */
  UI.activite = function (idActivite, activite, options) {
    var o = options || {};
    var nom = uid('q');
    var verrouille = !!o.corrige || (o.mode === 'formatif' && !!o.code);
    var donnees = A.decoder(activite, o.code);
    var correction = (verrouille && o.code) ? A.corriger(activite, o.code) : null;
    var attendu = A.decoder(activite, A.reponseAttendue(activite));

    var racine = h('div', { class: 'activite', id: 'act-' + idActivite, 'data-activite': idActivite });
    var fieldset = h('fieldset', { class: 'activite-champs', tabindex: '-1' });
    fieldset.appendChild(h('legend', null, [
      o.titre ? h('span', { class: 'activite-numero', text: o.titre }) : null,
      h('span', { class: 'activite-consigne', html: U.inlineText(activite.consigne) }),
      h('span', { class: 'activite-aide', text: CONSIGNES_TYPE[activite.type] || '' })
    ]));

    function option(type, name, valeur, libelle, coche, annotation) {
      var id = uid('opt');
      return h('div', { class: 'option' + (annotation ? ' option-' + annotation.classe : '') }, [
        h('input', { type: type, id: id, name: name, value: valeur, checked: coche, disabled: verrouille }),
        h('label', { for: id }, [
          h('span', { class: 'option-texte', html: U.inlineText(libelle) }),
          annotation ? h('span', { class: 'option-annotation', text: annotation.texte }) : null
        ])
      ]);
    }

    function annotationChoix(idChoix) {
      if (!correction) { return null; }
      var choisi = activite.type === 'choix-multiple' ? (donnees || []).indexOf(idChoix) >= 0 : donnees === idChoix;
      var bon = activite.type === 'choix-multiple' ? attendu.indexOf(idChoix) >= 0 : attendu === idChoix;
      if (bon && choisi) { return { classe: 'juste', texte: '✓ Ta réponse, correcte' }; }
      if (bon) { return { classe: 'attendue', texte: '→ Réponse attendue' }; }
      if (choisi) { return { classe: 'fausse', texte: '✗ Ta réponse, incorrecte' }; }
      return null;
    }

    if (activite.type === 'choix-unique' || activite.type === 'choix-multiple') {
      var type = activite.type === 'choix-unique' ? 'radio' : 'checkbox';
      activite.choix.forEach(function (c) {
        var coche = activite.type === 'choix-unique' ? donnees === c.id : (donnees || []).indexOf(c.id) >= 0;
        fieldset.appendChild(option(type, nom, c.id, c.texte, coche, annotationChoix(c.id)));
      });
    } else if (activite.type === 'vrai-faux') {
      [{ v: 't', t: 'Vrai', b: true }, { v: 'f', t: 'Faux', b: false }].forEach(function (c) {
        var annot = null;
        if (correction) {
          var choisi = donnees === c.b, bon = attendu === c.b;
          if (bon && choisi) { annot = { classe: 'juste', texte: '✓ Ta réponse, correcte' }; }
          else if (bon) { annot = { classe: 'attendue', texte: '→ Réponse attendue' }; }
          else if (choisi) { annot = { classe: 'fausse', texte: '✗ Ta réponse, incorrecte' }; }
        }
        fieldset.appendChild(option('radio', nom, c.v, c.t, donnees === c.b, annot));
      });
    } else if (activite.type === 'classement') {
      var liste = h('div', { class: 'classement' });
      activite.elements.forEach(function (el) {
        var sous = h('fieldset', { class: 'classement-element' }, h('legend', { html: U.inlineText(el.texte) }));
        var groupe = h('div', { class: 'classement-categories' });
        activite.categories.forEach(function (cat) {
          groupe.appendChild(option('radio', nom + '-' + el.id, cat.id, cat.texte, donnees && donnees[el.id] === cat.id, null));
        });
        sous.appendChild(groupe);
        if (correction) {
          var juste = correction.details[el.id];
          var libelleAttendu = activite.categories.filter(function (c) { return c.id === el.categorie; })[0].texte;
          sous.appendChild(h('p', { class: 'classement-correction ' + (juste ? 'est-juste' : 'est-faux') }, [
            h('strong', { text: juste ? '✓ Correct. ' : '✗ À revoir : « ' + libelleAttendu + ' ». ' }),
            el.explication || ''
          ]));
        }
        liste.appendChild(sous);
      });
      fieldset.appendChild(liste);
    }

    racine.appendChild(fieldset);

    function lireReponse() {
      if (activite.type === 'choix-unique') {
        var r = fieldset.querySelector('input[name="' + nom + '"]:checked');
        return A.encoder(activite, r ? r.value : null);
      }
      if (activite.type === 'choix-multiple') {
        var cases = fieldset.querySelectorAll('input[name="' + nom + '"]:checked');
        return A.encoder(activite, Array.prototype.map.call(cases, function (c) { return c.value; }));
      }
      if (activite.type === 'vrai-faux') {
        var vf = fieldset.querySelector('input[name="' + nom + '"]:checked');
        return A.encoder(activite, vf ? vf.value === 't' : null);
      }
      if (activite.type === 'classement') {
        var map = {};
        activite.elements.forEach(function (el) {
          var c = fieldset.querySelector('input[name="' + nom + '-' + el.id + '"]:checked');
          if (c) { map[el.id] = c.value; }
        });
        return A.encoder(activite, map);
      }
      return null;
    }

    var zoneMessage = h('div', { class: 'activite-message', id: 'fb-' + idActivite, tabindex: '-1', role: 'status' });
    racine.appendChild(zoneMessage);

    if (correction) {
      zoneMessage.appendChild(UI.feedback(activite, donnees, correction));
    }

    if (o.mode === 'formatif') {
      var actions = h('div', { class: 'actions' });
      if (!verrouille) {
        actions.appendChild(h('button', {
          type: 'button', class: 'bouton bouton-principal',
          onclick: function () {
            var code = lireReponse();
            if (code === null) {
              zoneMessage.innerHTML = '';
              zoneMessage.appendChild(h('p', { class: 'message-alerte', text: activite.type === 'classement'
                ? 'Choisis une catégorie pour chaque élément avant de valider.'
                : 'Choisis au moins une réponse avant de valider.' }));
              return;
            }
            if (o.valider) { o.valider(code); }
          }
        }, 'Valider ma réponse'));
      } else if (o.reessayer) {
        actions.appendChild(h('button', { type: 'button', class: 'bouton bouton-secondaire', onclick: o.reessayer }, 'Réessayer'));
      }
      racine.appendChild(actions);
    }

    return { element: racine, lireReponse: lireReponse };
  };

  UI.feedback = function (activite, donnees, correction) {
    var expl = activite.explication || {};
    var bloc = h('div', { class: 'feedback ' + (correction.correct ? 'feedback-juste' : 'feedback-faux') });
    bloc.appendChild(h('p', { class: 'feedback-titre' }, [
      h('span', { 'aria-hidden': 'true', text: correction.correct ? '✓ ' : '✗ ' }),
      correction.correct ? 'Bonne réponse' : 'Réponse à revoir'
    ]));
    if (activite.type === 'choix-unique' && activite.choix) {
      var choisi = activite.choix.filter(function (c) { return c.id === donnees; })[0];
      if (choisi && choisi.feedback) { bloc.appendChild(h('p', { html: U.inlineText(choisi.feedback) })); }
    }
    var texte = correction.correct ? expl.correct : expl.incorrect;
    if (texte) { bloc.appendChild(h('p', { html: U.inlineText(texte) })); }
    return bloc;
  };

  UI.barreProgression = function (valeur, libelle, texte) {
    return h('div', { class: 'progression' }, [
      h('div', {
        class: 'progression-barre', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
        'aria-valuenow': String(valeur), 'aria-label': libelle || 'Progression'
      }, h('div', { class: 'progression-remplissage', style: 'width:' + valeur + '%' })),
      h('span', { class: 'progression-texte', text: texte || (valeur + ' %') })
    ]);
  };

  UI.libelleStatut = function (statut) {
    if (statut.reussite === 'reussi') { return { texte: 'Réussi', icone: '✓', classe: 'reussi' }; }
    if (statut.reussite === 'echoue') { return { texte: statut.libelleEchec || 'Quiz à repasser', icone: '↻', classe: 'echoue' }; }
    if (statut.completion === 'termine') { return { texte: 'Terminé', icone: '✓', classe: 'termine' }; }
    if (statut.completion === 'en-cours') { return { texte: 'En cours', icone: '◐', classe: 'en-cours' }; }
    return { texte: 'Non commencé', icone: '○', classe: 'non-commence' };
  };

  UI.badge = function (statut) {
    var l = UI.libelleStatut(statut);
    return h('span', { class: 'badge badge-' + l.classe }, [h('span', { 'aria-hidden': 'true', text: l.icone + ' ' }), l.texte]);
  };
})(typeof window !== 'undefined' ? window : this);
