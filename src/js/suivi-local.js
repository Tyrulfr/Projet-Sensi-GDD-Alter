/*
 * Traceurs hors LMS.
 *  - TraceurLocal : progression conservée dans le navigateur (localStorage).
 *    Utile pour les essais et démonstrations ; ce n'est PAS un suivi institutionnel.
 *  - TraceurMemoire : rien n'est conservé (aperçu d'un package SCORM sans LMS).
 */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};
  var PREFIXE = 'ups-gdd:v1:';

  function stockage() {
    try {
      var s = root.localStorage;
      var test = PREFIXE + 'test';
      s.setItem(test, '1');
      s.removeItem(test);
      return s;
    } catch (e) {
      return null;
    }
  }

  function TraceurLocal(idFormation, idModule) {
    this.type = 'local';
    this.cle = PREFIXE + idFormation + ':' + idModule;
    this.store = stockage();
  }

  TraceurLocal.prototype.init = function () {
    var sauvegarde = null;
    if (this.store) {
      try { sauvegarde = JSON.parse(this.store.getItem(this.cle) || 'null'); } catch (e) { sauvegarde = null; }
    }
    return { ok: true, persistant: !!this.store, sauvegarde: sauvegarde, apprenant: null, lectureSeule: false };
  };

  TraceurLocal.prototype.enregistrer = function (paquet) {
    if (!this.store) { return false; }
    try {
      this.store.setItem(this.cle, JSON.stringify({
        etat: paquet.etat,
        position: paquet.position,
        statut: paquet.statut,
        date: new Date().toISOString()
      }));
      return true;
    } catch (e) {
      return false;
    }
  };

  TraceurLocal.prototype.valider = function () { return true; };
  TraceurLocal.prototype.terminer = function () { return true; };

  TraceurLocal.effacerTout = function (idFormation) {
    var s = stockage();
    if (!s) { return; }
    var debut = PREFIXE + idFormation + ':';
    var cles = [];
    for (var i = 0; i < s.length; i++) {
      var k = s.key(i);
      if (k && k.indexOf(debut) === 0) { cles.push(k); }
    }
    cles.forEach(function (k) { s.removeItem(k); });
  };

  function TraceurMemoire() {
    this.type = 'memoire';
  }
  TraceurMemoire.prototype.init = function () {
    return { ok: true, persistant: false, sauvegarde: null, apprenant: null, lectureSeule: false };
  };
  TraceurMemoire.prototype.enregistrer = function () { return true; };
  TraceurMemoire.prototype.valider = function () { return true; };
  TraceurMemoire.prototype.terminer = function () { return true; };

  GDD.TraceurLocal = TraceurLocal;
  GDD.TraceurMemoire = TraceurMemoire;
})(typeof window !== 'undefined' ? window : this);
