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
    var cibles = h('ul', { class: 'schema-cibles' });
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
        h('p', { class: 'sr-only', text: 'Cette information peut servir à ' + bloc.cibles.length + ' services :' }),
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
    return h('div', { class: 'bloc bloc-tableau' }, h('div', {
      class: 'tableau-defilant', tabindex: '0', role: 'region', 'aria-labelledby': bloc.titre ? idTitre : null
    }, table));
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
    if (statut.reussite === 'echoue') { return { texte: 'Quiz à repasser', icone: '↻', classe: 'echoue' }; }
    if (statut.completion === 'termine') { return { texte: 'Terminé', icone: '✓', classe: 'termine' }; }
    if (statut.completion === 'en-cours') { return { texte: 'En cours', icone: '◐', classe: 'en-cours' }; }
    return { texte: 'Non commencé', icone: '○', classe: 'non-commence' };
  };

  UI.badge = function (statut) {
    var l = UI.libelleStatut(statut);
    return h('span', { class: 'badge badge-' + l.classe }, [h('span', { 'aria-hidden': 'true', text: l.icone + ' ' }), l.texte]);
  };
})(typeof window !== 'undefined' ? window : this);
