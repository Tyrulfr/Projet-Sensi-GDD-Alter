(function () {
  'use strict';
  var U = GDD.util, A = GDD.activites;
  var resultats = [];

  function test(nom, fn) {
    try { fn(); resultats.push({ nom: nom, ok: true }); }
    catch (e) { resultats.push({ nom: nom, ok: false, message: e.message }); }
  }
  function egal(obtenu, attendu, msg) {
    if (JSON.stringify(obtenu) !== JSON.stringify(attendu)) {
      throw new Error((msg || '') + ' attendu ' + JSON.stringify(attendu) + ', obtenu ' + JSON.stringify(obtenu));
    }
  }
  function vrai(v, msg) { if (!v) { throw new Error(msg || 'condition fausse'); } }

  /* Traceur de test : mémorise ce qui lui est transmis. */
  function TraceurTest(sauvegarde) {
    this.paquets = []; this.fin = null; this.sauvegarde = sauvegarde || null;
  }
  TraceurTest.prototype.init = function () { return { ok: true, persistant: true, sauvegarde: this.sauvegarde }; };
  TraceurTest.prototype.enregistrer = function (p) { this.paquets.push(p); return true; };
  TraceurTest.prototype.valider = function () { return true; };
  TraceurTest.prototype.terminer = function (s) { this.fin = s; return true; };

  /* Fausse API LMS minimale pour tester l'adaptateur SCORM 1.2. */
  function FausseApi(initial) {
    var d = initial || {}, journal = [], self = this;
    this.d = d; this.journal = journal; this.erreur = '0';
    this.LMSInitialize = function () { journal.push('init'); return 'true'; };
    this.LMSFinish = function () { journal.push('finish'); return 'true'; };
    this.LMSCommit = function () { journal.push('commit'); return 'true'; };
    this.LMSGetValue = function (k) {
      self.erreur = '0';
      if (k === 'cmi.interactions._count') { return String(self.nbInter || 0); }
      return d[k] !== undefined ? d[k] : '';
    };
    this.LMSSetValue = function (k, v) {
      d[k] = v;
      var m = /^cmi\.interactions\.(\d+)\.id$/.exec(k);
      if (m) { self.nbInter = Math.max(self.nbInter || 0, +m[1] + 1); }
      journal.push('set ' + k); return 'true';
    };
    this.LMSGetLastError = function () { return self.erreur; };
    this.LMSGetErrorString = function () { return ''; };
  }

  function bonnesReponses(module, idEval) {
    var codes = {};
    module.lecons.filter(function (l) { return l.id === idEval; })[0].activites.forEach(function (id) {
      codes[id] = A.reponseAttendue(module.activites[id]);
    });
    return codes;
  }

  function lancer(module) {
    var idEval = module.validation.evaluation;
    var lecons = module.lecons.filter(function (l) { return l.type === 'lecon'; });

    test('Format SCORM du temps de session (CMITimespan)', function () {
      egal(U.scormTimespan(0), '00:00:00');
      egal(U.scormTimespan(3723000), '01:02:03');
      egal(U.scormTimespan(125 * 3600 * 1000), '125:00:00');
      egal(U.scormTimespan(1e12), '9999:59:59');
      vrai(/^\d{2}:\d{2}:\d{2}$/.test(U.scormTime(new Date())), 'CMITime');
    });

    test('Texte enrichi : échappement HTML et gras', function () {
      egal(U.richText('a <b> **c**'), '<p>a &lt;b&gt; <strong>c</strong></p>');
      egal(U.richText('un\n\ndeux'), '<p>un</p><p>deux</p>');
      egal(U.richText('un\ndeux'), '<p>un<br>deux</p>');
    });

    test('Texte enrichi : listes à puces', function () {
      egal(U.richText('Intro :\n\n- a ;\n- **b**'), '<p>Intro :</p><ul><li>a ;</li><li><strong>b</strong></li></ul>');
      egal(U.richText('Pour corriger :\n- a'), '<p>Pour corriger :<br>- a</p>', 'liste non séparée par une ligne vide');
    });

    test('Chaque activité du module accepte sa réponse attendue', function () {
      Object.keys(module.activites).forEach(function (id) {
        var act = module.activites[id];
        vrai(A.corriger(act, A.reponseAttendue(act)).correct, id);
      });
    });

    test('Réponses incorrectes ou incomplètes', function () {
      var qcm = module.activites['m01-a1'];
      vrai(!A.corriger(qcm, 'a,b').correct, 'réponse partielle refusée');
      vrai(!A.corriger(qcm, 'a,b,c,d').correct, 'réponse en trop refusée');
      egal(A.encoder(qcm, []), null);
      egal(A.encoder(qcm, ['c', 'a', 'b']), 'a,b,c', 'tri de l\'encodage');
      var vf = module.activites['m01-a3'];
      vrai(!A.corriger(vf, 't').correct);
      egal(A.encoder(vf, null), null);
      var cl = module.activites['m01-a2'];
      egal(A.encoder(cl, { 1: 'p' }), null, 'classement incomplet');
      var r = A.corriger(cl, '1.p,2.p,3.p,4.n,5.p,6.n');
      vrai(!r.correct); egal(r.details['2'], false); egal(r.details['1'], true);
    });

    test('Types SCORM des interactions', function () {
      egal(A.typeScorm(module.activites['m01-q1']), 'choice');
      egal(A.typeScorm(module.activites['m01-q3']), 'true-false');
      egal(A.typeScorm(module.activites['m01-a2']), 'matching');
    });

    test('Statut initial : non commencé', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      var s = m.statut();
      egal([s.completion, s.reussite, s.score, s.progression], ['non-commence', 'inconnue', null, 0]);
    });

    test('Navigation séquentielle', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      vrai(m.estAccessible(0)); vrai(!m.estAccessible(1)); vrai(!m.estAccessible(module.lecons.length - 1));
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      vrai(m.estAccessible(module.lecons.length - 1), 'quiz accessible après les leçons');
    });

    test('Leçons vues sans quiz : en cours, sans réussite', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var s = m.statut();
      egal([s.completion, s.reussite], ['en-cours', 'inconnue']);
      egal(GDD.TraceurScorm12.statutScorm(s), 'incomplete');
    });

    test('Quiz réussi (100 %) : terminé et réussi -> passed', function () {
      var t = new TraceurTest(); var m = new GDD.Moteur(module, t); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var r = m.soumettreEvaluation(idEval, bonnesReponses(module, idEval));
      egal(r.score, 100);
      var s = m.statut();
      egal([s.completion, s.reussite, s.score], ['termine', 'reussi', 100]);
      egal(GDD.TraceurScorm12.statutScorm(s), 'passed');
      var dernier = t.paquets[t.paquets.length - 1];
      vrai(t.paquets.some(function (p) { return p.interactions.length === 4; }), 'interactions transmises une fois');
      egal(dernier.interactions.length, 0, 'pas de doublon d\'interactions');
    });

    test('Quiz sous le seuil (50 %) -> failed, puis meilleur score conservé', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var codes = bonnesReponses(module, idEval);
      codes['m01-q1'] = 'a'; codes['m01-q3'] = 't';
      egal(m.soumettreEvaluation(idEval, codes).score, 50);
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'failed');
      egal(m.soumettreEvaluation(idEval, bonnesReponses(module, idEval)).score, 100);
      codes['m01-q2'] = 'a';
      var r3 = m.soumettreEvaluation(idEval, codes);
      egal([r3.score, r3.meilleur], [25, 100]);
      egal(m.statut().reussite, 'reussi', 'une tentative moins bonne ne fait pas perdre la réussite');
      egal(m.resultatEvaluation(idEval).n, 3);
    });

    test('Seuil exact : 75 % >= 70 % réussi', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var codes = bonnesReponses(module, idEval); codes['m01-q4'] = 'a';
      egal(m.soumettreEvaluation(idEval, codes).score, 75);
      egal(m.statut().reussite, 'reussi');
    });

    test('Sauvegarde puis reprise de l\'état', function () {
      var t = new TraceurTest(); var m = new GDD.Moteur(module, t); m.demarrer();
      m.marquerVue(lecons[0].id); m.repondre('m01-a1', 'a,b'); m.definirPosition(1);
      var sauve = t.paquets[t.paquets.length - 1];
      egal(sauve.position, module.lecons[1].id);
      var m2 = new GDD.Moteur(module, new TraceurTest({ etat: sauve.etat })); m2.demarrer();
      vrai(m2.estVue(lecons[0].id)); egal(m2.reponseEnregistree('m01-a1'), 'a,b'); egal(m2.etat.p, 1);
    });

    test('Reprise robuste : identifiants inconnus et données corrompues ignorés', function () {
      var m = new GDD.Moteur(module, new TraceurTest({ etat: '{"v":1,"p":99,"s":["inconnue","m01-l1"],"a":{"x":"a"},"e":{}}' }));
      m.demarrer();
      egal(m.etat.s, ['m01-l1']); egal(m.etat.a, {}); egal(m.etat.p, module.lecons.length - 1);
      var m2 = new GDD.Moteur(module, new TraceurTest({ etat: 'pas du json' })); m2.demarrer();
      egal(m2.etat.s, []);
    });

    test('suspend_data : parcours complet bien sous la limite de 4096 caractères', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      Object.keys(module.activites).forEach(function (id) { m.repondre(id, A.reponseAttendue(module.activites[id])); });
      m.soumettreEvaluation(idEval, bonnesReponses(module, idEval));
      var n = m.serialiser().length;
      vrai(n < 1000, n + ' caractères');
    });

    test('suspend_data : dégradation si la limite est dépassée', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      m.marquerVue(lecons[0].id);
      var gros = new Array(5000).join('x');
      m.etat.a['m01-a1'] = gros;
      var texte = m.serialiser();
      vrai(texte.length <= GDD.Moteur.LIMITE_ETAT, texte.length + ' caractères');
      vrai(JSON.parse(texte).s.length === 1, 'progression conservée');
    });

    test('Adaptateur SCORM 1.2 : initialisation, envoi, fermeture', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'not attempted', 'cmi.core.entry': 'ab-initio', 'cmi.core.lesson_mode': 'normal' });
      window.API = api;
      var tr = new GDD.TraceurScorm12();
      var m = new GDD.Moteur(module, tr);
      var info = m.demarrer();
      vrai(info.ok); egal(api.d['cmi.core.lesson_status'], 'incomplete');
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      m.soumettreEvaluation(idEval, bonnesReponses(module, idEval));
      egal(api.d['cmi.core.lesson_status'], 'passed');
      egal([api.d['cmi.core.score.raw'], api.d['cmi.core.score.min'], api.d['cmi.core.score.max']], ['100', '0', '100']);
      egal(api.d['cmi.interactions.0.id'], 'm01-q1');
      egal(api.d['cmi.interactions.2.type'], 'true-false');
      egal(api.d['cmi.interactions.1.student_response'], 'a,b');
      egal(api.d['cmi.interactions.3.result'], 'correct');
      vrai(api.d['cmi.suspend_data'].length > 0);
      m.terminer();
      vrai(/^\d{2,4}:\d{2}:\d{2}$/.test(api.d['cmi.core.session_time']), 'session_time ' + api.d['cmi.core.session_time']);
      egal(api.d['cmi.core.exit'], '', 'sortie normale une fois réussi');
      m.terminer();
      egal(api.journal.filter(function (x) { return x === 'finish'; }).length, 1, 'un seul LMSFinish');
      egal(api.journal.filter(function (x) { return x === 'init'; }).length, 1, 'un seul LMSInitialize');
      delete window.API;
    });

    test('Adaptateur SCORM 1.2 : sortie en cours -> suspend, puis reprise', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'not attempted', 'cmi.core.lesson_mode': 'normal' });
      window.API = api;
      var m = new GDD.Moteur(module, new GDD.TraceurScorm12()); m.demarrer();
      m.marquerVue(lecons[0].id); m.definirPosition(1); m.terminer();
      egal(api.d['cmi.core.exit'], 'suspend');
      egal(api.d['cmi.core.lesson_location'], module.lecons[1].id);
      var api2 = new FausseApi({ 'cmi.core.lesson_status': 'incomplete', 'cmi.core.entry': 'resume', 'cmi.core.lesson_mode': 'normal', 'cmi.suspend_data': api.d['cmi.suspend_data'] });
      window.API = api2;
      var m2 = new GDD.Moteur(module, new GDD.TraceurScorm12()); m2.demarrer();
      vrai(m2.estVue(lecons[0].id)); egal(m2.etat.p, 1);
      delete window.API;
    });

    test('Adaptateur SCORM 1.2 : mode consultation (review) sans écriture de résultats', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'passed', 'cmi.core.lesson_mode': 'review' });
      window.API = api;
      var m = new GDD.Moteur(module, new GDD.TraceurScorm12()); var info = m.demarrer();
      vrai(info.lectureSeule);
      m.marquerVue(lecons[0].id); m.terminer();
      egal(api.d['cmi.core.lesson_status'], 'passed');
      vrai(api.d['cmi.suspend_data'] === undefined, 'aucune écriture');
      delete window.API;
    });

    test('Adaptateur SCORM 1.2 : absence d\'API détectée', function () {
      delete window.API;
      var info = new GDD.TraceurScorm12().init();
      egal([info.ok, info.raison], [false, 'api-introuvable']);
    });
  }

  /* Module 2 : défi sans seuil de réussite -> statut « completed » quel que soit le score. */
  function lancerModule2(module) {
    var idEval = module.validation.evaluation;
    var lecons = module.lecons.filter(function (l) { return l.type === 'lecon'; });

    test('M2 : chaque activité accepte sa réponse attendue', function () {
      Object.keys(module.activites).forEach(function (id) {
        var act = module.activites[id];
        vrai(A.corriger(act, A.reponseAttendue(act)).correct, id);
      });
    });

    test('M2 : bonnes réponses du défi conformes au scénario (B, A, C)', function () {
      egal(bonnesReponses(module, idEval), { 'm02-q1': 'b', 'm02-q2': 'a', 'm02-q3': 'c' });
    });

    test('M2 : défi réussi à 3/3 -> terminé, sans réussite/échec, score 100', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var r = m.soumettreEvaluation(idEval, bonnesReponses(module, idEval));
      egal([r.bonnes, r.total, r.score], [3, 3, 100]);
      var s = m.statut();
      egal([s.completion, s.reussite, s.score, s.seuil, s.progression], ['termine', 'inconnue', 100, null, 100]);
      egal(GDD.TraceurScorm12.statutScorm(s), 'completed');
    });

    test('M2 : défi à 0/3 -> toujours completed (jamais failed), score 0', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var r = m.soumettreEvaluation(idEval, { 'm02-q1': 'a', 'm02-q2': 'b', 'm02-q3': 'a' });
      egal(r.score, 0);
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'completed');
    });

    test('M2 : leçons vues sans défi -> incomplete', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'incomplete');
    });

    test('M2 : adaptateur SCORM 1.2 -> completed, score brut, 3 interactions, sortie normale', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'not attempted', 'cmi.core.entry': 'ab-initio', 'cmi.core.lesson_mode': 'normal' });
      window.API = api;
      var m = new GDD.Moteur(module, new GDD.TraceurScorm12()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var codes = bonnesReponses(module, idEval); codes['m02-q3'] = 'b';
      m.soumettreEvaluation(idEval, codes);
      egal(api.d['cmi.core.lesson_status'], 'completed');
      egal([api.d['cmi.core.score.raw'], api.d['cmi.core.score.min'], api.d['cmi.core.score.max']], ['67', '0', '100']);
      egal(api.d['cmi.interactions.2.id'], 'm02-q3');
      egal(api.d['cmi.interactions.2.result'], 'wrong');
      m.terminer();
      egal(api.d['cmi.core.exit'], '', 'sortie normale une fois terminé');
      delete window.API;
    });

    test('M2 : reprise après interruption en leçon 2', function () {
      var t = new TraceurTest(); var m = new GDD.Moteur(module, t); m.demarrer();
      m.marquerVue(lecons[0].id); m.repondre('m02-a1', 'f'); m.definirPosition(1);
      var m2 = new GDD.Moteur(module, new TraceurTest({ etat: t.paquets[t.paquets.length - 1].etat })); m2.demarrer();
      vrai(m2.estVue(lecons[0].id)); egal(m2.etat.p, 1); vrai(!m2.estAccessible(3), 'défi verrouillé');
    });
  }

  /* Module 3 : défi de 4 questions sans seuil, comparateur de tableaux, association à 5 catégories. */
  function lancerModule3(module) {
    var idEval = module.validation.evaluation;
    var lecons = module.lecons.filter(function (l) { return l.type === 'lecon'; });
    var comparateur = module.lecons[0].blocs.filter(function (b) { return b.type === 'comparateur'; })[0];

    test('M3 : chaque activité accepte sa réponse attendue', function () {
      Object.keys(module.activites).forEach(function (id) {
        var act = module.activites[id];
        vrai(A.corriger(act, A.reponseAttendue(act)).correct, id);
      });
    });

    test('M3 : bonnes réponses du défi conformes au scénario (B, A, C, A)', function () {
      egal(bonnesReponses(module, idEval), { 'm03-q1': 'b', 'm03-q2': 'a', 'm03-q3': 'c', 'm03-q4': 'a' });
    });

    test('M3 : association qualité / situation corrigée élément par élément', function () {
      var act = module.activites['m03-a2'];
      egal(A.reponseAttendue(act), '1.h,2.e,3.a,4.f,5.c');
      var r = A.corriger(act, '1.h,2.e,3.e,4.f,5.c');
      vrai(!r.correct); egal(r.details['3'], false); egal(r.details['1'], true);
      egal(A.typeScorm(act), 'matching');
    });

    test('M3 : 4 leçons obligatoires, défi verrouillé avant la fin', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      egal(lecons.length, 4);
      lecons.slice(0, 3).forEach(function (l) { m.marquerVue(l.id); });
      vrai(!m.estAccessible(4), 'défi verrouillé');
      m.marquerVue(lecons[3].id);
      vrai(m.estAccessible(4), 'défi ouvert');
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'incomplete');
    });

    test('M3 : défi 3/4 -> completed, score 75 ; 0/4 -> completed, meilleur score conservé', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var codes = bonnesReponses(module, idEval); codes['m03-q4'] = 'c';
      var r = m.soumettreEvaluation(idEval, codes);
      egal([r.bonnes, r.total, r.score], [3, 4, 75]);
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'completed');
      var r2 = m.soumettreEvaluation(idEval, { 'm03-q1': 'a', 'm03-q2': 'b', 'm03-q3': 'a', 'm03-q4': 'b' });
      egal([r2.score, r2.meilleur], [0, 75]);
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'completed');
    });

    test('M3 : adaptateur SCORM 1.2 -> completed, score 75, 4 interactions, reprise', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'not attempted', 'cmi.core.entry': 'ab-initio', 'cmi.core.lesson_mode': 'normal' });
      window.API = api;
      var m = new GDD.Moteur(module, new GDD.TraceurScorm12()); m.demarrer();
      m.marquerVue(lecons[0].id); m.marquerVue(lecons[1].id); m.repondre('m03-a2', '1.h,2.e,3.a,4.f,5.c'); m.definirPosition(2);
      m.terminer();
      egal([api.d['cmi.core.exit'], api.d['cmi.core.lesson_location']], ['suspend', 'm03-l3']);
      var api2 = new FausseApi({ 'cmi.core.lesson_status': 'incomplete', 'cmi.core.entry': 'resume', 'cmi.core.lesson_mode': 'normal', 'cmi.suspend_data': api.d['cmi.suspend_data'] });
      window.API = api2;
      var m2 = new GDD.Moteur(module, new GDD.TraceurScorm12()); m2.demarrer();
      egal(m2.etat.p, 2); egal(m2.reponseEnregistree('m03-a2'), '1.h,2.e,3.a,4.f,5.c');
      lecons.forEach(function (l) { m2.marquerVue(l.id); });
      var codes = bonnesReponses(module, idEval); codes['m03-q2'] = 'b';
      m2.soumettreEvaluation(idEval, codes);
      egal(api2.d['cmi.core.lesson_status'], 'completed');
      egal([api2.d['cmi.core.score.raw'], api2.d['cmi.core.score.min'], api2.d['cmi.core.score.max']], ['75', '0', '100']);
      egal(api2.d['cmi.interactions.3.id'], 'm03-q4');
      egal(api2.d['cmi.interactions.1.result'], 'wrong');
      m2.terminer();
      egal(api2.d['cmi.core.exit'], '');
      delete window.API;
    });

    test('Comparateur : une cellule signalée met en évidence sa difficulté (texte, pas seulement couleur)', function () {
      var etat = { explores: {}, apres: false };
      var appels = 0;
      var el = GDD.ui.comparateur(comparateur, { etat: etat, prefixeId: 't', afficherApres: function () { appels++; } });
      var cellules = el.querySelectorAll('.cellule-bouton');
      egal(cellules.length, 12, 'une cellule cliquable par donnée du tableau A');
      cellules[11].click();
      vrai(etat.explores.manquante, 'date manquante examinée');
      vrai(cellules[11].classList.contains('est-signalee'));
      egal(cellules[11].querySelector('.cellule-marque').textContent, '⚠');
      vrai(/difficulté signalée/.test(cellules[11].getAttribute('aria-label')), 'signalement annoncé');
      vrai(/Une donnée manquante/.test(el.querySelector('.comparateur-detail').textContent));
      vrai(!el.querySelector('.comparateur-suite button'), 'tableau B pas encore proposé');
      [].forEach.call(el.querySelectorAll('.comparateur-problemes button'), function (b) { b.click(); });
      egal(Object.keys(etat.explores).length, 5);
      el.querySelector('.comparateur-suite button').click();
      egal(appels, 1, 'tableau B demandé');
    });

    test('Comparateur : cliquer deux fois une cellule à double difficulté passe à la suivante', function () {
      var etat = { explores: {}, apres: false };
      var el = GDD.ui.comparateur(comparateur, { etat: etat, prefixeId: 't2' });
      var premiere = el.querySelectorAll('.cellule-bouton')[0];
      premiere.click(); premiere.click();
      vrai(etat.explores['nom-prenom'] && etat.explores.doublon, 'les deux difficultés de « Martin Julie »');
    });

    test('Comparateur : tableau B et avertissement affichés une fois demandés', function () {
      var el = GDD.ui.comparateur(comparateur, { etat: { explores: {}, apres: true }, prefixeId: 't3' });
      egal(el.querySelectorAll('.comparateur-apres tbody tr').length, 3);
      vrai(/structure cible/.test(el.querySelector('.comparateur-apres .note').textContent));
    });
  }

  function lancerModule4(module) {
    var idEval = module.validation.evaluation;
    var lecons = module.lecons.filter(function (l) { return l.type === 'lecon'; });
    var simulateur = lecons[3].blocs.filter(function (b) { return b.type === 'simulateur'; })[0];

    test('M4 : chaque activité accepte sa réponse attendue', function () {
      Object.keys(module.activites).forEach(function (id) {
        var act = module.activites[id];
        vrai(A.corriger(act, A.reponseAttendue(act)).correct, id);
      });
    });

    test('M4 : bonnes réponses du défi conformes au scénario (B, A, B, C)', function () {
      egal(bonnesReponses(module, idEval), { 'm04-q1': 'b', 'm04-q2': 'a', 'm04-q3': 'b', 'm04-q4': 'c' });
    });

    test('M4 : classification (rémunération = donnée personnelle, pas catégorie particulière)', function () {
      var act = module.activites['m04-a1'];
      egal(A.reponseAttendue(act), '1.p,2.n,3.p,4.s');
      var r = A.corriger(act, '1.p,2.n,3.s,4.s');
      vrai(!r.correct); egal(r.details['3'], false); egal(r.details['4'], true);
    });

    test('M4 : simulateur - trois issues par situation, chacune attendue au moins une fois', function () {
      var attendues = {};
      simulateur.scenarios.forEach(function (s) {
        egal(s.choix.map(function (c) { return c.decision; }).sort(), ['ne-pas-transmettre', 'partager', 'verifier'], s.id);
        attendues[s.choix.filter(function (c) { return c.id === s.reponse; })[0].decision] = true;
      });
      egal(Object.keys(attendues).sort(), ['ne-pas-transmettre', 'partager', 'verifier']);
      var sante = simulateur.scenarios.filter(function (s) { return s.id === 'sante'; })[0];
      egal(sante.choix.filter(function (c) { return c.id === sante.reponse; })[0].decision, 'ne-pas-transmettre', 'santé : pas de transmission');
    });

    test('M4 : 4 leçons obligatoires, défi verrouillé avant la fin', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      egal(lecons.length, 4);
      lecons.slice(0, 3).forEach(function (l) { m.marquerVue(l.id); });
      vrai(!m.estAccessible(4), 'défi verrouillé');
      m.marquerVue(lecons[3].id);
      vrai(m.estAccessible(4), 'défi ouvert');
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'incomplete');
    });

    test('M4 : défi 2/4 -> completed, score 50 (aucun seuil imposé)', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      lecons.forEach(function (l) { m.marquerVue(l.id); });
      var codes = bonnesReponses(module, idEval); codes['m04-q1'] = 'a'; codes['m04-q4'] = 'a';
      var r = m.soumettreEvaluation(idEval, codes);
      egal([r.bonnes, r.total, r.score], [2, 4, 50]);
      egal(m.statut().seuil, null);
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'completed');
    });

    test('M4 : adaptateur SCORM 1.2 -> reprise, completed, score 100, 4 interactions', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'not attempted', 'cmi.core.entry': 'ab-initio', 'cmi.core.lesson_mode': 'normal' });
      window.API = api;
      var m = new GDD.Moteur(module, new GDD.TraceurScorm12()); m.demarrer();
      m.marquerVue(lecons[0].id); m.repondre('m04-a1', '1.p,2.n,3.p,4.s'); m.definirPosition(1);
      m.terminer();
      egal([api.d['cmi.core.exit'], api.d['cmi.core.lesson_location'], api.d['cmi.core.lesson_status']], ['suspend', 'm04-l2', 'incomplete']);
      var api2 = new FausseApi({ 'cmi.core.lesson_status': 'incomplete', 'cmi.core.entry': 'resume', 'cmi.core.lesson_mode': 'normal', 'cmi.suspend_data': api.d['cmi.suspend_data'] });
      window.API = api2;
      var m2 = new GDD.Moteur(module, new GDD.TraceurScorm12()); m2.demarrer();
      egal(m2.etat.p, 1); egal(m2.reponseEnregistree('m04-a1'), '1.p,2.n,3.p,4.s');
      lecons.forEach(function (l) { m2.marquerVue(l.id); });
      m2.soumettreEvaluation(idEval, bonnesReponses(module, idEval));
      egal(api2.d['cmi.core.lesson_status'], 'completed');
      egal([api2.d['cmi.core.score.raw'], api2.d['cmi.core.score.min'], api2.d['cmi.core.score.max']], ['100', '0', '100']);
      egal(api2.d['cmi.interactions.3.id'], 'm04-q4');
      egal(api2.d['cmi.interactions.0.result'], 'correct');
      m2.terminer();
      egal(api2.d['cmi.core.exit'], '');
      delete window.API;
    });

    function choisir(el, idChoix) {
      el.querySelector('.option-decision input[value="' + idChoix + '"]').checked = true;
      el.querySelector('.simulateur-zone .actions button').click();
    }

    test('Simulateur : validation sans choix refusée, puis correction complète', function () {
      var etat = { i: 0, choix: {}, termine: false };
      var el = GDD.ui.simulateur(simulateur, { etat: etat, prefixeId: 's1' });
      document.body.appendChild(el);
      egal(el.querySelectorAll('.option-decision').length, 3);
      vrai(/Situation 1 sur 4/.test(el.textContent));
      vrai(/Service logistique/.test(el.querySelector('.simulateur-fiche').textContent), 'fiche du demandeur');
      el.querySelector('.simulateur-zone .actions button').click();
      vrai(/Choisis une conduite/.test(el.querySelector('.activite-message').textContent));
      egal(Object.keys(etat.choix).length, 0);
      choisir(el, 'c');
      var fb = el.querySelector('.activite-message').textContent;
      vrai(/Réflexe à revoir/.test(fb) && /Conduite attendue/.test(fb), 'erreur expliquée');
      vrai(/Pourquoi/.test(fb) && /À vérifier/.test(fb) && /Risque/.test(fb) && /Le bon réflexe/.test(fb), 'critères détaillés');
      egal(document.activeElement && document.activeElement.id, 's1-retour', 'focus sur la correction');
      vrai(el.querySelector('.option-decision input').disabled, 'choix verrouillé après validation');
      document.body.removeChild(el);
    });

    test('Simulateur : bilan, fin signalée une seule fois, recommencer', function () {
      var etat = { i: 0, choix: {}, termine: false };
      var fins = 0;
      var el = GDD.ui.simulateur(simulateur, { etat: etat, prefixeId: 's2', surTermine: function () { fins++; } });
      document.body.appendChild(el);
      simulateur.scenarios.forEach(function (s, j) {
        choisir(el, j === 1 ? 'a' : s.reponse);
        el.querySelector('.simulateur-zone .actions button').click();
      });
      egal([etat.i, etat.termine, fins], [4, true, 1]);
      var el2 = GDD.ui.simulateur(simulateur, { etat: etat, prefixeId: 's3' });
      vrai(/Bilan : 3 réflexes adaptés sur 4/.test(el2.textContent));
      egal(el2.querySelectorAll('.simulateur-recap .est-faux').length, 1);
      el2.querySelector('.simulateur-bilan button').click();
      egal([etat.i, Object.keys(etat.choix).length, etat.termine], [0, 0, true]);
      document.body.removeChild(el);
    });

    test('Mémo : quatre réflexes numérotés', function () {
      var memo = lecons[3].blocs.filter(function (b) { return b.type === 'memo'; })[0];
      var el = GDD.ui.memo(memo);
      egal(el.querySelectorAll('.memo-etape').length, 4);
      egal(el.querySelector('.memo-titre').textContent, 'Comprendre');
    });
  }

  function lancerModule5(module) {
    var idEval = module.validation.evaluation;
    var lecons = module.lecons.filter(function (l) { return l.type === 'lecon'; });
    var jeu = lecons[3].blocs.filter(function (b) { return b.type === 'simulateur'; })[0];

    test('M5 : chaque activité accepte sa réponse attendue', function () {
      Object.keys(module.activites).forEach(function (id) {
        var act = module.activites[id];
        vrai(A.corriger(act, A.reponseAttendue(act)).correct, id);
      });
    });

    test('M5 : bonnes réponses du défi conformes au scénario (B, A, C, A)', function () {
      egal(bonnesReponses(module, idEval), { 'm05-q1': 'b', 'm05-q2': 'a', 'm05-q3': 'c', 'm05-q4': 'a' });
    });

    test('M5 : classement gouvernance / gestion opérationnelle (3 + 3)', function () {
      var act = module.activites['m05-a2'];
      var parId = {};
      act.elements.forEach(function (e) { parId[e.texte.split(' ').slice(0, 2).join(' ')] = e.categorie; });
      egal([parId['Définir une'], parId['Définir qui'], parId['Déterminer les']], ['g', 'g', 'g']);
      egal([parId['Corriger une'], parId['Saisir une'], parId['Signaler une']], ['o', 'o', 'o']);
      var r = A.corriger(act, '1.g,2.g,3.o,4.g,5.o,6.g');
      vrai(!r.correct); egal(r.details['2'], false); egal(r.details['1'], true);
    });

    test('M5 : schéma des rôles - cinq familles, aucune hiérarchie de rendu', function () {
      var schema = lecons[2].blocs.filter(function (b) { return b.type === 'schema'; })[0];
      egal(schema.cibles.map(function (c) { return c.libelle; }),
        ['Décider et coordonner', 'Apporter l\'expertise métier', 'Accompagner la qualité', 'Produire et utiliser', 'Sécuriser et soutenir les usages']);
      var el = GDD.ui.bloc(schema);
      vrai(el.querySelector('.schema-cibles.schema-cibles-5'), 'disposition à cinq cibles');
      vrai(/n'autorise pas lui-même chaque partage/.test(JSON.stringify(schema)), 'rôle du DPO non surévalué');
      vrai(/pas l'organigramme officiel/.test(schema.legende), 'modèle pédagogique annoncé');
    });

    test('M5 : jeu des rôles - 5 situations, sans issues communes, rôles expliqués', function () {
      egal(jeu.scenarios.map(function (s) { return s.id; }), ['regle', 'application', 'anomalie', 'technique', 'arbitrage']);
      vrai(!jeu.decisions, 'pas de décisions communes');
      jeu.scenarios.forEach(function (s) {
        vrai(s.correction.roles.length >= 2, s.id + ' : plusieurs rôles expliqués');
        vrai(s.fiche && s.fiche.length, s.id + ' : fiche');
      });
    });

    test('M5 : 4 leçons, défi verrouillé, 1/4 -> completed 25 sans seuil', function () {
      var m = new GDD.Moteur(module, new TraceurTest()); m.demarrer();
      egal(lecons.length, 4);
      lecons.slice(0, 3).forEach(function (l) { m.marquerVue(l.id); });
      vrai(!m.estAccessible(4), 'défi verrouillé');
      m.marquerVue(lecons[3].id);
      vrai(m.estAccessible(4), 'défi ouvert');
      var codes = bonnesReponses(module, idEval); codes['m05-q1'] = 'a'; codes['m05-q2'] = 'b'; codes['m05-q3'] = 'a';
      var r = m.soumettreEvaluation(idEval, codes);
      egal([r.bonnes, r.total, r.score], [1, 4, 25]);
      egal(m.statut().seuil, null);
      egal(GDD.TraceurScorm12.statutScorm(m.statut()), 'completed');
    });

    test('M5 : adaptateur SCORM 1.2 -> reprise, completed, score 100, 4 interactions', function () {
      var api = new FausseApi({ 'cmi.core.lesson_status': 'not attempted', 'cmi.core.entry': 'ab-initio', 'cmi.core.lesson_mode': 'normal' });
      window.API = api;
      var m = new GDD.Moteur(module, new GDD.TraceurScorm12()); m.demarrer();
      m.marquerVue(lecons[0].id); m.marquerVue(lecons[1].id); m.repondre('m05-a2', '1.g,2.o,3.o,4.g,5.o,6.g'); m.definirPosition(2);
      m.terminer();
      egal([api.d['cmi.core.exit'], api.d['cmi.core.lesson_location'], api.d['cmi.core.lesson_status']], ['suspend', 'm05-l3', 'incomplete']);
      var api2 = new FausseApi({ 'cmi.core.lesson_status': 'incomplete', 'cmi.core.entry': 'resume', 'cmi.core.lesson_mode': 'normal', 'cmi.suspend_data': api.d['cmi.suspend_data'] });
      window.API = api2;
      var m2 = new GDD.Moteur(module, new GDD.TraceurScorm12()); m2.demarrer();
      egal(m2.etat.p, 2); egal(m2.reponseEnregistree('m05-a2'), '1.g,2.o,3.o,4.g,5.o,6.g');
      lecons.forEach(function (l) { m2.marquerVue(l.id); });
      m2.soumettreEvaluation(idEval, bonnesReponses(module, idEval));
      egal(api2.d['cmi.core.lesson_status'], 'completed');
      egal(api2.d['cmi.core.score.raw'], '100');
      egal(api2.d['cmi.interactions.3.id'], 'm05-q4');
      m2.terminer();
      egal(api2.d['cmi.core.exit'], '');
      delete window.API;
    });

    function repondre(el, idChoix) {
      el.querySelector('.option-decision input[value="' + idChoix + '"]').checked = true;
      el.querySelector('.simulateur-zone .actions button').click();
    }

    test('Jeu des rôles : libellés propres, rôles affichés, bilan', function () {
      var etat = { i: 0, choix: {}, termine: false };
      var fins = 0;
      var el = GDD.ui.simulateur(jeu, { etat: etat, prefixeId: 'r1', surTermine: function () { fins++; } });
      document.body.appendChild(el);
      vrai(/Jeu des rôles/.test(el.querySelector('.bloc-etiquette').textContent));
      vrai(/Qui doit principalement intervenir/.test(el.querySelector('legend').textContent));
      egal(el.querySelectorAll('.simulateur-decision').length, 0, 'pas d\'étiquette de décision');
      el.querySelector('.simulateur-zone .actions button').click();
      vrai(/Choisis une réponse/.test(el.querySelector('.activite-message').textContent));
      repondre(el, 'c');
      var fb = el.querySelector('.activite-message').textContent;
      vrai(/À revoir/.test(fb) && /Réponse attendue/.test(fb) && /Qui fait quoi/.test(fb) && /À retenir/.test(fb), 'correction du jeu');
      vrai(!/À vérifier|Risque/.test(fb), 'pas de rubriques du module 4');
      egal(el.querySelectorAll('.simulateur-roles dt').length, 3);
      egal(document.activeElement && document.activeElement.id, 'r1-retour');
      el.querySelector('.simulateur-zone .actions button').click();
      jeu.scenarios.slice(1).forEach(function (s) {
        repondre(el, s.reponse);
        el.querySelector('.simulateur-zone .actions button').click();
      });
      egal([etat.i, etat.termine, fins], [5, true, 1]);
      var el2 = GDD.ui.simulateur(jeu, { etat: etat, prefixeId: 'r2' });
      vrai(/Bilan : 4 bonnes réponses sur 5/.test(el2.textContent), el2.querySelector('h4').textContent);
      vrai(/à revoir, réponse attendue : Les responsables métiers/.test(el2.querySelector('.simulateur-recap').textContent));
      vrai(el2.querySelector('.simulateur-bilan button').textContent === 'Recommencer le jeu');
      document.body.removeChild(el);
    });

    test('Mémo M5 : six contributions', function () {
      var memo = lecons[3].blocs.filter(function (b) { return b.type === 'memo'; })[0];
      egal(GDD.ui.memo(memo).querySelectorAll('.memo-etape').length, 6);
    });
  }

  function afficher() {
    var ol = document.getElementById('resultats');
    var echecs = 0;
    resultats.forEach(function (r) {
      var li = document.createElement('li');
      li.className = r.ok ? 'ok' : 'ko';
      li.textContent = (r.ok ? '✓ ' : '✗ ') + r.nom + (r.ok ? '' : ' : ' + r.message);
      if (!r.ok) { echecs++; }
      ol.appendChild(li);
    });
    var resume = document.getElementById('resume');
    resume.textContent = (resultats.length - echecs) + ' / ' + resultats.length + ' tests réussis';
    resume.className = echecs ? 'ko' : 'ok';
    window.RESULTATS_TESTS = { total: resultats.length, echecs: echecs, details: resultats };
  }

  function charger(fichier) {
    return fetch('../contenus/modules/' + fichier).then(function (r) { return r.json(); });
  }
  Promise.all([charger('module-01.json'), charger('module-02.json'), charger('module-03.json'), charger('module-04.json'), charger('module-05.json')])
    .then(function (mods) { lancer(mods[0]); lancerModule2(mods[1]); lancerModule3(mods[2]); lancerModule4(mods[3]); lancerModule5(mods[4]); afficher(); })
    .catch(function (e) { document.getElementById('resume').textContent = 'Impossible de charger le contenu : ' + e.message; });
})();
