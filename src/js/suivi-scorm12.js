/*
 * Traceur SCORM 1.2 : dialogue avec l'objet window.API fourni par le LMS.
 * Seul le modèle de données SCORM 1.2 (cmi.core.*) est utilisé.
 */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};
  var U = GDD.util;

  var MAX_PROFONDEUR = 10;

  function chercherDans(fenetre) {
    var n = 0;
    try {
      while (fenetre && !fenetre.API && fenetre.parent && fenetre.parent !== fenetre && n < MAX_PROFONDEUR) {
        n++;
        fenetre = fenetre.parent;
      }
      return (fenetre && fenetre.API) || null;
    } catch (e) {
      return null; /* fenêtre d'une autre origine */
    }
  }

  function trouverApi(fenetre) {
    var api = chercherDans(fenetre);
    if (!api) {
      try {
        if (fenetre.opener) { api = chercherDans(fenetre.opener); }
      } catch (e) { api = null; }
    }
    return api;
  }

  function vrai(valeur) {
    return valeur === true || String(valeur) === 'true';
  }

  /* Correspondance statut du moteur -> cmi.core.lesson_status. */
  function statutScorm(statut) {
    if (statut.reussite === 'reussi') { return 'passed'; }
    if (statut.reussite === 'echoue') { return 'failed'; }
    if (statut.completion === 'termine') { return 'completed'; }
    return 'incomplete';
  }

  function TraceurScorm12(options) {
    this.type = 'scorm12';
    this.options = options || {};
    this.api = null;
    this.initialise = false;
    this.termine = false;
    this.debut = null;
    this.journal = [];
    this.interactionsActives = true;
    this.nbInteractions = 0;
    this.scoreMinMaxEnvoyes = false;
  }

  TraceurScorm12.prototype.trace = function (message) {
    this.journal.push(new Date().toISOString() + ' ' + message);
    if (root.console && this.options.debug) { root.console.log('[SCORM] ' + message); }
  };

  TraceurScorm12.prototype.erreur = function () {
    if (!this.api) { return null; }
    var code = String(this.api.LMSGetLastError());
    if (code === '0' || code === '') { return null; }
    return { code: code, message: String(this.api.LMSGetErrorString(code)) };
  };

  TraceurScorm12.prototype.lire = function (element) {
    var v = String(this.api.LMSGetValue(element));
    var err = this.erreur();
    if (err) { this.trace('LMSGetValue(' + element + ') erreur ' + err.code + ' ' + err.message); return ''; }
    return v;
  };

  TraceurScorm12.prototype.ecrire = function (element, valeur) {
    var ok = vrai(this.api.LMSSetValue(element, String(valeur)));
    if (!ok) {
      var err = this.erreur();
      this.trace('LMSSetValue(' + element + ') refusé' + (err ? ' : ' + err.code + ' ' + err.message : ''));
    }
    return ok;
  };

  TraceurScorm12.prototype.init = function () {
    this.api = trouverApi(root);
    if (!this.api) {
      this.trace('API SCORM 1.2 introuvable');
      return { ok: false, raison: 'api-introuvable' };
    }
    if (this.initialise) { return this.infoInit; }
    if (!vrai(this.api.LMSInitialize(''))) {
      var err = this.erreur();
      this.trace('LMSInitialize a échoué' + (err ? ' : ' + err.code + ' ' + err.message : ''));
      this.api = null;
      return { ok: false, raison: 'initialisation' };
    }
    this.initialise = true;
    this.debut = Date.now();
    this.trace('LMSInitialize OK');

    var statut = this.lire('cmi.core.lesson_status');
    var entree = this.lire('cmi.core.entry');
    var mode = this.lire('cmi.core.lesson_mode');
    var suspend = this.lire('cmi.suspend_data');
    var position = this.lire('cmi.core.lesson_location');
    this.lectureSeule = mode === 'review' || mode === 'browse';

    if (!this.lectureSeule && (statut === 'not attempted' || statut === '')) {
      this.ecrire('cmi.core.lesson_status', 'incomplete');
      this.api.LMSCommit('');
    }
    this.trace('Lecture : statut=' + statut + ' entry=' + entree + ' mode=' + mode + ' suspend_data=' + suspend.length + ' car.');

    this.infoInit = {
      ok: true,
      persistant: true,
      apprenant: this.lire('cmi.core.student_name') || null,
      sauvegarde: suspend ? { etat: suspend, position: position } : null,
      statutLms: statut,
      entree: entree,
      lectureSeule: this.lectureSeule
    };
    return this.infoInit;
  };

  TraceurScorm12.prototype.enregistrer = function (paquet) {
    if (!this.initialise || this.termine) { return false; }
    if (this.lectureSeule) { return true; }
    var ok = true;
    ok = this.ecrire('cmi.suspend_data', paquet.etat) && ok;
    ok = this.ecrire('cmi.core.lesson_location', String(paquet.position).slice(0, 255)) && ok;
    ok = this.ecrire('cmi.core.lesson_status', statutScorm(paquet.statut)) && ok;
    if (paquet.statut.score !== null && paquet.statut.score !== undefined) {
      if (!this.scoreMinMaxEnvoyes) {
        this.ecrire('cmi.core.score.min', '0');
        this.ecrire('cmi.core.score.max', '100');
        this.scoreMinMaxEnvoyes = true;
      }
      ok = this.ecrire('cmi.core.score.raw', String(paquet.statut.score)) && ok;
    }
    /* Une sortie brutale doit permettre la reprise. */
    this.ecrire('cmi.core.exit', 'suspend');
    this.envoyerInteractions(paquet.interactions || []);
    return ok;
  };

  TraceurScorm12.prototype.envoyerInteractions = function (liste) {
    if (!liste.length || !this.interactionsActives) { return; }
    var compte = parseInt(String(this.api.LMSGetValue('cmi.interactions._count')), 10);
    if (isNaN(compte) || this.erreur()) {
      this.interactionsActives = false;
      this.trace('Interactions non prises en charge par le LMS : non transmises');
      return;
    }
    var self = this;
    liste.forEach(function (it, i) {
      var p = 'cmi.interactions.' + (compte + i) + '.';
      if (!self.ecrire(p + 'id', it.id)) { self.interactionsActives = false; return; }
      self.ecrire(p + 'type', it.type);
      self.ecrire(p + 'time', U.scormTime(it.date));
      self.ecrire(p + 'weighting', String(it.poids));
      self.ecrire(p + 'student_response', it.reponse || '');
      self.ecrire(p + 'correct_responses.0.pattern', it.attendu);
      self.ecrire(p + 'result', it.resultat);
      if (it.objectif) { self.ecrire(p + 'objectives.0.id', it.objectif); }
    });
    this.nbInteractions += liste.length;
  };

  TraceurScorm12.prototype.valider = function () {
    if (!this.initialise || this.termine) { return false; }
    return vrai(this.api.LMSCommit(''));
  };

  TraceurScorm12.prototype.terminer = function (statut) {
    if (!this.initialise || this.termine) { return false; }
    if (!this.lectureSeule) {
      this.ecrire('cmi.core.session_time', U.scormTimespan(Date.now() - this.debut));
      var fini = statut && (statut.reussite === 'reussi' || (statut.completion === 'termine' && statut.reussite === 'inconnue'));
      this.ecrire('cmi.core.exit', fini ? '' : 'suspend');
    }
    this.api.LMSCommit('');
    var ok = vrai(this.api.LMSFinish(''));
    this.termine = true;
    this.trace('LMSFinish ' + (ok ? 'OK' : 'en échec'));
    return ok;
  };

  GDD.TraceurScorm12 = TraceurScorm12;
  GDD.TraceurScorm12.statutScorm = statutScorm;
  GDD.TraceurScorm12.trouverApi = trouverApi;
})(typeof window !== 'undefined' ? window : this);
