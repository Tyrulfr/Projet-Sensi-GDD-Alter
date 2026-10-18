/*
 * Carnet « Les données en jeu ».
 * Assemble, à partir des choix enregistrés, les données déjà rencontrées :
 * où elles ont été créées, qui les a reprises, où elles n'existent pas,
 * et la trace laissée par les décisions de l'apprenant.
 * Le parcours reste le même pour tout le monde : une trace s'ajoute,
 * elle ne change pas les leçons suivantes.
 */
(function (root) {
  'use strict';
  var GDD = root.GDD = root.GDD || {};

  function assembler(def, sources, ctx) {
    var vues = (ctx && ctx.vues) || {};
    var choix = (ctx && ctx.choix) || {};
    var avant = ctx && ctx.etabliesAvant;
    var entrees = [];
    ((def && def.donnees) || []).forEach(function (d) {
      var effets = [];
      (sources || []).forEach(function (s) {
        if (s.donnee !== d.id) { return; }
        var code = choix[s.id];
        var ef = code && s.effets && s.effets[code];
        if (ef) { effets.push(ef); }
      });
      var vue = !!(vues[d.depuis] || (avant && d.module < avant) || effets.length);
      if (!vue) { return; }
      var etat = null;
      var traces = [];
      effets.forEach(function (ef) {
        if (ef.etat) { etat = ef.etat; }
        if (ef.trace) { traces.push(ef.trace); }
      });
      entrees.push({
        id: d.id,
        titre: d.titre,
        creee: d.creee,
        reprises: d.reprises,
        absente: d.absente,
        etat: etat,
        traces: traces
      });
    });
    return entrees;
  }

  GDD.carnet = { assembler: assembler };
})(typeof window !== 'undefined' ? window : this);
