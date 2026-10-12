/* Utilitaires communs (site web et SCORM). Aucun accès au DOM ici. */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};
  var U = GDD.util = {};

  U.pad = function (n, width) {
    var s = String(n);
    while (s.length < width) { s = '0' + s; }
    return s;
  };

  /* SCORM 1.2 CMITimespan : HHHH:MM:SS, heures sur 2 à 4 chiffres. */
  U.scormTimespan = function (ms) {
    var total = Math.max(0, Math.round((ms || 0) / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    if (h > 9999) { h = 9999; m = 59; s = 59; }
    return U.pad(h, 2) + ':' + U.pad(m, 2) + ':' + U.pad(s, 2);
  };

  /* SCORM 1.2 CMITime : heure de la journée HH:MM:SS. */
  U.scormTime = function (date) {
    var d = date || new Date();
    return U.pad(d.getHours(), 2) + ':' + U.pad(d.getMinutes(), 2) + ':' + U.pad(d.getSeconds(), 2);
  };

  U.sameSet = function (a, b) {
    if (a.length !== b.length) { return false; }
    var sa = a.slice().sort(), sb = b.slice().sort();
    for (var i = 0; i < sa.length; i++) { if (sa[i] !== sb[i]) { return false; } }
    return true;
  };

  U.escapeHtml = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /*
   * Texte enrichi minimal et sûr : paragraphes séparés par une ligne vide, **gras**,
   * listes à puces (paragraphe dont toutes les lignes commencent par « - »).
   */
  U.richText = function (str) {
    function enrichir(t) { return U.escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
    return String(str || '').split(/\n\s*\n/).map(function (p) {
      var lignes = p.trim().split('\n');
      if (lignes.every(function (l) { return /^\s*-\s+/.test(l); })) {
        return '<ul>' + lignes.map(function (l) { return '<li>' + enrichir(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + lignes.map(enrichir).join('<br>') + '</p>';
    }).join('');
  };

  U.inlineText = function (str) {
    return U.escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  };
})(typeof window !== 'undefined' ? window : this);
