/*
 * Simulateur d'API SCORM 1.2 (window.API) avec contrôle des formats.
 * Les données sont conservées dans le localStorage du navigateur pour tester la reprise.
 */
(function () {
  'use strict';

  var ERREURS = {
    '0': 'No error', '101': 'General exception', '201': 'Invalid argument error',
    '202': 'Element cannot have children', '203': 'Element not an array - cannot have count',
    '301': 'Not initialized', '401': 'Not implemented error',
    '402': 'Invalid set value, element is a keyword', '403': 'Element is read only',
    '404': 'Element is write only', '405': 'Incorrect data type'
  };
  var RE_TIMESPAN = /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/;
  var RE_TIME = /^\d{2}:\d{2}:\d{2}(\.\d{1,2})?$/;
  var RE_DECIMAL = /^-?\d+(\.\d+)?$/;
  var STATUTS_ECRITURE = ['passed', 'completed', 'failed', 'incomplete', 'browsed'];
  var SORTIES = ['time-out', 'suspend', 'logout', ''];
  var TYPES_INTERACTION = ['true-false', 'choice', 'fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric'];
  var RESULTATS = ['correct', 'wrong', 'unanticipated', 'neutral'];

  function score(v) { return v === '' || (RE_DECIMAL.test(v) && +v >= 0 && +v <= 100); }
  function longueurMax(n) { return function (v) { return v.length <= n; }; }

  var ELEMENTS = {
    'cmi.core._children': { acces: 'ro', motcle: true },
    'cmi.core.student_id': { acces: 'ro' },
    'cmi.core.student_name': { acces: 'ro' },
    'cmi.core.lesson_location': { acces: 'rw', valide: longueurMax(255) },
    'cmi.core.credit': { acces: 'ro' },
    'cmi.core.lesson_status': { acces: 'rw', valide: function (v) { return STATUTS_ECRITURE.indexOf(v) >= 0; } },
    'cmi.core.entry': { acces: 'ro' },
    'cmi.core.score._children': { acces: 'ro', motcle: true },
    'cmi.core.score.raw': { acces: 'rw', valide: score },
    'cmi.core.score.min': { acces: 'rw', valide: score },
    'cmi.core.score.max': { acces: 'rw', valide: score },
    'cmi.core.total_time': { acces: 'ro' },
    'cmi.core.lesson_mode': { acces: 'ro' },
    'cmi.core.exit': { acces: 'wo', valide: function (v) { return SORTIES.indexOf(v) >= 0; } },
    'cmi.core.session_time': { acces: 'wo', valide: function (v) { return RE_TIMESPAN.test(v); } },
    'cmi.suspend_data': { acces: 'rw', valide: longueurMax(4096) },
    'cmi.launch_data': { acces: 'ro' },
    'cmi.comments': { acces: 'rw', valide: longueurMax(4096) },
    'cmi.interactions._children': { acces: 'ro', motcle: true },
    'cmi.interactions._count': { acces: 'ro', motcle: true }
  };
  var CHAMPS_INTERACTION = {
    'id': function (v) { return /^[^\s]{1,255}$/.test(v); },
    'time': function (v) { return RE_TIME.test(v); },
    'type': function (v) { return TYPES_INTERACTION.indexOf(v) >= 0; },
    'weighting': function (v) { return RE_DECIMAL.test(v); },
    'student_response': longueurMax(255),
    'result': function (v) { return RESULTATS.indexOf(v) >= 0 || RE_DECIMAL.test(v); },
    'latency': function (v) { return RE_TIMESPAN.test(v); },
    'correct_responses.0.pattern': longueurMax(255),
    'objectives.0.id': function (v) { return /^[^\s]{1,255}$/.test(v); }
  };

  var $ = function (id) { return document.getElementById(id); };
  var packages = window.PACKAGES || [];
  var courant = null;      /* package sélectionné */
  var donnees = null;      /* modèle de données cmi */
  var session = 'aucune';  /* aucune | initialisee | terminee */
  var erreur = '0';
  var compteurs = null;
  var debutSession = null;

  function cle() { return 'simulateur-scorm12:' + courant.id; }

  function donneesInitiales() {
    return {
      'cmi.core._children': 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
      'cmi.core.student_id': 'test-001',
      'cmi.core.student_name': 'Testeur, Camille',
      'cmi.core.lesson_location': '',
      'cmi.core.credit': 'credit',
      'cmi.core.lesson_status': 'not attempted',
      'cmi.core.entry': 'ab-initio',
      'cmi.core.score._children': 'raw,min,max',
      'cmi.core.score.raw': '', 'cmi.core.score.min': '', 'cmi.core.score.max': '',
      'cmi.core.total_time': '0000:00:00.00',
      'cmi.core.lesson_mode': 'normal',
      'cmi.core.exit': '',
      'cmi.core.session_time': '',
      'cmi.suspend_data': '',
      'cmi.launch_data': '',
      'cmi.comments': '',
      'cmi.interactions._children': 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency',
      interactions: [],
      sessions: 0
    };
  }

  function charger() {
    try { return JSON.parse(localStorage.getItem(cle()) || 'null') || donneesInitiales(); }
    catch (e) { return donneesInitiales(); }
  }
  function persister() { localStorage.setItem(cle(), JSON.stringify(donnees)); }

  function journal(appel, resultat) {
    var li = document.createElement('li');
    li.textContent = new Date().toLocaleTimeString() + '  ' + appel + ' → "' + resultat + '"' + (erreur !== '0' ? '  [erreur ' + erreur + ' ' + ERREURS[erreur] + ']' : '');
    if (erreur !== '0') { li.className = 'erreur'; }
    $('journal').insertBefore(li, $('journal').firstChild);
  }

  function echec(code) { erreur = code; return 'false'; }

  function interactionCible(element) {
    var m = /^cmi\.interactions\.(\d+)\.(.+)$/.exec(element);
    return m ? { index: parseInt(m[1], 10), champ: m[2] } : null;
  }

  function additionnerDurees(a, b) {
    function sec(t) { var p = t.split(':'); return (+p[0]) * 3600 + (+p[1]) * 60 + parseFloat(p[2]); }
    var total = sec(a) + sec(b);
    var h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    function pad(n, w) { n = String(n); while (n.length < w) { n = '0' + n; } return n; }
    return pad(h, 4) + ':' + pad(m, 2) + ':' + pad(s.toFixed(2), 5);
  }

  var API = {
    LMSInitialize: function (param) {
      compteurs.init++;
      if (param !== '') { journal('LMSInitialize(' + param + ')', 'false'); return echec('201'); }
      if (session === 'initialisee') { var r0 = echec('101'); journal('LMSInitialize("")', r0); return r0; }
      if (session === 'terminee') { var r1 = echec('101'); journal('LMSInitialize("")', r1); return r1; }
      session = 'initialisee'; erreur = '0'; debutSession = Date.now();
      donnees.sessions++;
      afficherSession();
      journal('LMSInitialize("")', 'true');
      return 'true';
    },
    LMSFinish: function (param) {
      compteurs.finish++;
      if (session !== 'initialisee') { var r = echec('301'); journal('LMSFinish("")', r); return r; }
      erreur = '0';
      if (donnees['cmi.core.session_time']) {
        donnees['cmi.core.total_time'] = additionnerDurees(donnees['cmi.core.total_time'], donnees['cmi.core.session_time']);
      }
      donnees['cmi.core.entry'] = donnees['cmi.core.exit'] === 'suspend' ? 'resume' : '';
      donnees.derniereSessionTime = donnees['cmi.core.session_time'];
      donnees['cmi.core.session_time'] = '';
      donnees['cmi.core.exit'] = '';
      session = 'terminee';
      persister();
      journal('LMSFinish("")', 'true');
      afficherSession();
      rafraichir();
      return 'true';
    },
    LMSGetValue: function (element) {
      if (session !== 'initialisee') { echec('301'); journal('LMSGetValue(' + element + ')', ''); return ''; }
      erreur = '0';
      var resultat = '';
      if (element === 'cmi.interactions._count') {
        if ($('sans-interactions').checked) { erreur = '401'; }
        else { resultat = String(donnees.interactions.length); }
      } else if (interactionCible(element)) {
        erreur = '404';
      } else if (!ELEMENTS[element]) {
        erreur = '401';
      } else if (ELEMENTS[element].acces === 'wo') {
        erreur = '404';
      } else {
        resultat = String(donnees[element]);
      }
      journal('LMSGetValue(' + element + ')', resultat);
      return resultat;
    },
    LMSSetValue: function (element, valeur) {
      compteurs.set++;
      valeur = String(valeur);
      var apercu = valeur.length > 60 ? valeur.slice(0, 60) + '… (' + valeur.length + ' car.)' : valeur;
      var appel = 'LMSSetValue(' + element + ', "' + apercu + '")';
      if (session !== 'initialisee') { var r = echec('301'); journal(appel, r); return r; }
      erreur = '0';
      var it = interactionCible(element);
      if (it) {
        if ($('sans-interactions').checked) { echec('401'); journal(appel, 'false'); return 'false'; }
        if (it.index > donnees.interactions.length) { echec('201'); journal(appel, 'false'); return 'false'; }
        var regle = CHAMPS_INTERACTION[it.champ];
        if (!regle) { echec('401'); journal(appel, 'false'); return 'false'; }
        if (!regle(valeur)) { echec('405'); journal(appel, 'false'); return 'false'; }
        if (it.index === donnees.interactions.length) {
          if (it.champ !== 'id') { echec('201'); journal(appel, 'false'); return 'false'; }
          donnees.interactions.push({});
        }
        donnees.interactions[it.index][it.champ] = valeur;
        journal(appel, 'true');
        rafraichir();
        return 'true';
      }
      var def = ELEMENTS[element];
      if (!def) { echec('401'); journal(appel, 'false'); return 'false'; }
      if (def.motcle) { echec('402'); journal(appel, 'false'); return 'false'; }
      if (def.acces === 'ro') { echec('403'); journal(appel, 'false'); return 'false'; }
      if (def.valide && !def.valide(valeur)) { echec('405'); journal(appel, 'false'); return 'false'; }
      donnees[element] = valeur;
      journal(appel, 'true');
      rafraichir();
      return 'true';
    },
    LMSCommit: function (param) {
      compteurs.commit++;
      if (session !== 'initialisee') { var r = echec('301'); journal('LMSCommit("")', r); return r; }
      erreur = '0';
      persister();
      journal('LMSCommit("")', 'true');
      return 'true';
    },
    LMSGetLastError: function () { return erreur; },
    LMSGetErrorString: function (code) { return ERREURS[String(code)] || ''; },
    LMSGetDiagnostic: function (code) { return ERREURS[String(code || erreur)] || ''; }
  };
  window.API = API;

  function afficherSession() {
    var libelles = { aucune: 'aucune', initialisee: 'initialisée (en cours)', terminee: 'terminée' };
    $('session').textContent = 'Session : ' + libelles[session] + (donnees ? ' · lancements : ' + donnees.sessions : '');
    $('fermer').disabled = session !== 'initialisee' && $('cadre').getAttribute('src') === 'about:blank';
  }

  function rafraichir() {
    var corps = $('donnees').querySelector('tbody');
    corps.innerHTML = '';
    if (!donnees) { return; }
    var lignes = Object.keys(ELEMENTS).filter(function (k) { return k.indexOf('_children') < 0 && k !== 'cmi.interactions._count'; })
      .map(function (k) { return [k, donnees[k]]; });
    lignes.push(['(dernier session_time reçu)', donnees.derniereSessionTime || '']);
    lignes.push(['cmi.interactions._count', String(donnees.interactions.length)]);
    donnees.interactions.forEach(function (it, i) {
      lignes.push(['cmi.interactions.' + i, [it.id, it.type, 'réponse=' + it.student_response, 'attendu=' + it['correct_responses.0.pattern'], it.result].join(' | ')]);
    });
    lignes.forEach(function (l) {
      var tr = document.createElement('tr');
      var a = document.createElement('td'); a.textContent = l[0];
      var b = document.createElement('td'); b.textContent = l[1];
      tr.appendChild(a); tr.appendChild(b); corps.appendChild(tr);
    });
    controles();
  }

  function controles() {
    var liste = [];
    function c(ok, texte) { liste.push({ ok: ok, texte: texte }); }
    c(compteurs.init <= 1, 'LMSInitialize appelé ' + compteurs.init + ' fois dans ce lancement (attendu : 1)');
    if (session === 'terminee') {
      c(compteurs.finish === 1, 'LMSFinish appelé ' + compteurs.finish + ' fois (attendu : 1)');
      c(RE_TIMESPAN.test(donnees.derniereSessionTime || ''), 'session_time transmis au format CMITimespan : ' + (donnees.derniereSessionTime || 'absent'));
    }
    c(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'].indexOf(donnees['cmi.core.lesson_status']) >= 0, 'lesson_status valide : ' + donnees['cmi.core.lesson_status']);
    c(donnees['cmi.suspend_data'].length <= 4096, 'suspend_data : ' + donnees['cmi.suspend_data'].length + ' / 4096 caractères');
    c(compteurs.set > 0 || session === 'aucune', 'Données transmises (' + compteurs.set + ' LMSSetValue, ' + compteurs.commit + ' LMSCommit)');
    var ul = $('controles');
    ul.innerHTML = '';
    liste.forEach(function (x) {
      var li = document.createElement('li');
      li.className = x.ok ? 'ok' : 'ko';
      li.textContent = x.texte;
      ul.appendChild(li);
    });
  }

  function choisir() {
    courant = packages.filter(function (p) { return p.id === $('package').value; })[0];
    donnees = charger();
    session = 'aucune';
    compteurs = { init: 0, finish: 0, set: 0, commit: 0 };
    afficherSession();
    rafraichir();
  }

  function fermer(apres) {
    var cadre = $('cadre');
    if (cadre.getAttribute('src') === 'about:blank') { if (apres) { apres(); } return; }
    cadre.addEventListener('load', function quandVide() {
      cadre.removeEventListener('load', quandVide);
      if (session === 'initialisee') {
        journal('(fermeture sans LMSFinish : données non finalisées)', '-');
        persister();
      }
      afficherSession();
      if (apres) { apres(); }
    });
    cadre.setAttribute('src', 'about:blank');
  }

  $('lancer').addEventListener('click', function () {
    fermer(function () {
      donnees = charger();
      session = 'aucune';
      compteurs = { init: 0, finish: 0, set: 0, commit: 0 };
      rafraichir();
      $('cadre').setAttribute('src', courant.url);
      $('fermer').disabled = false;
      afficherSession();
    });
  });
  $('fermer').addEventListener('click', function () { fermer(); $('fermer').disabled = true; });
  $('effacer').addEventListener('click', function () {
    fermer(function () {
      localStorage.removeItem(cle());
      choisir();
      journal('(données LMS effacées)', '-');
    });
  });
  $('vider-journal').addEventListener('click', function () { $('journal').innerHTML = ''; });
  $('package').addEventListener('change', function () { fermer(choisir); });

  packages.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id; o.textContent = p.titre;
    $('package').appendChild(o);
  });
  if (packages.length) { choisir(); }
  else { $('session').textContent = 'Aucun package : lancer ./build.sh'; }
})();
