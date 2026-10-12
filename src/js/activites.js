/*
 * Évaluation des activités, indépendante de l'affichage.
 * Une réponse est toujours stockée sous forme de chaîne compacte, compatible
 * avec les formats de réponse SCORM 1.2 (cmi.interactions.n.student_response) :
 *   choix-unique   "b"
 *   choix-multiple "a,c"
 *   vrai-faux      "t" ou "f"
 *   classement     "1.p,2.n"   (élément.catégorie)
 */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};
  var U = GDD.util;
  var A = GDD.activites = {};

  A.TYPES = ['choix-unique', 'choix-multiple', 'vrai-faux', 'classement'];

  A.typeScorm = function (activite) {
    switch (activite.type) {
      case 'choix-unique':
      case 'choix-multiple': return 'choice';
      case 'vrai-faux': return 'true-false';
      case 'classement': return 'matching';
      default: return 'other';
    }
  };

  /* Réponse attendue, au même format que les réponses encodées. */
  A.reponseAttendue = function (activite) {
    switch (activite.type) {
      case 'choix-unique': return activite.reponse;
      case 'choix-multiple': return activite.reponses.slice().sort().join(',');
      case 'vrai-faux': return activite.reponse ? 't' : 'f';
      case 'classement':
        return activite.elements.map(function (e) { return e.id + '.' + e.categorie; }).join(',');
      default: return '';
    }
  };

  /* Décode une réponse stockée en structure exploitable par l'interface. */
  A.decoder = function (activite, code) {
    if (code == null || code === '') { return null; }
    switch (activite.type) {
      case 'choix-unique': return code;
      case 'choix-multiple': return code.split(',');
      case 'vrai-faux': return code === 't';
      case 'classement':
        var map = {};
        code.split(',').forEach(function (paire) {
          var p = paire.split('.');
          if (p.length === 2) { map[p[0]] = p[1]; }
        });
        return map;
      default: return null;
    }
  };

  /* Encode une réponse saisie ; renvoie null si la réponse est incomplète. */
  A.encoder = function (activite, reponse) {
    switch (activite.type) {
      case 'choix-unique':
        return reponse ? String(reponse) : null;
      case 'choix-multiple':
        return reponse && reponse.length ? reponse.slice().sort().join(',') : null;
      case 'vrai-faux':
        return reponse === true ? 't' : (reponse === false ? 'f' : null);
      case 'classement':
        if (!reponse) { return null; }
        var complet = activite.elements.every(function (e) { return !!reponse[e.id]; });
        if (!complet) { return null; }
        return activite.elements.map(function (e) { return e.id + '.' + reponse[e.id]; }).join(',');
      default: return null;
    }
  };

  /* Corrige une réponse encodée. */
  A.corriger = function (activite, code) {
    var resultat = { correct: false, details: null };
    if (code == null) { return resultat; }
    switch (activite.type) {
      case 'choix-unique':
        resultat.correct = code === activite.reponse;
        break;
      case 'choix-multiple':
        resultat.correct = U.sameSet(code.split(','), activite.reponses);
        break;
      case 'vrai-faux':
        resultat.correct = code === (activite.reponse ? 't' : 'f');
        break;
      case 'classement':
        var donnees = A.decoder(activite, code);
        var details = {};
        var tous = true;
        activite.elements.forEach(function (e) {
          details[e.id] = donnees[e.id] === e.categorie;
          if (!details[e.id]) { tous = false; }
        });
        resultat.correct = tous;
        resultat.details = details;
        break;
    }
    return resultat;
  };
})(typeof window !== 'undefined' ? window : this);
