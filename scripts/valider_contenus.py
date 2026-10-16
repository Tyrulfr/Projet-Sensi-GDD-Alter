#!/usr/bin/env python3
"""Validation des contenus pédagogiques (contenus/*.json).

Usage : python3 scripts/valider_contenus.py
Code de sortie 0 si aucun problème bloquant, 1 sinon.
"""
import json
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_CONTENUS = RACINE / "contenus"

TYPES_BLOCS = {"situation", "texte", "definition", "exemple", "tableau", "schema", "chronologie", "comparateur",
               "simulateur", "memo", "activite", "aretenir"}
RE_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PRESENTATIONS = {"toutes", "une-par-une"}
TYPES_ACTIVITES = {"choix-unique", "choix-multiple", "vrai-faux", "classement"}
NAVIGATIONS = {"sequentielle", "libre"}
# Identifiants utilisés dans cmi.interactions (CMIIdentifier SCORM 1.2 : pas d'espace, 255 car. max).
RE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
# Réponses de type choice/matching SCORM 1.2 : identifiants d'un seul caractère.
RE_ID_CHOIX = re.compile(r"^[a-z0-9]$")


class Rapport:
    def __init__(self):
        self.erreurs = []
        self.avertissements = []

    def erreur(self, lieu, message):
        self.erreurs.append(f"{lieu} : {message}")

    def avertir(self, lieu, message):
        self.avertissements.append(f"{lieu} : {message}")


def charger_json(chemin, rapport):
    try:
        with open(chemin, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        rapport.erreur(chemin.name, "fichier introuvable")
    except json.JSONDecodeError as e:
        rapport.erreur(chemin.name, f"JSON invalide (ligne {e.lineno}, colonne {e.colno}) : {e.msg}")
    return None


def texte_present(obj, cle):
    return isinstance(obj.get(cle), str) and obj.get(cle).strip() != ""


def valider_activite(id_act, act, objectifs, r):
    lieu = f"activité {id_act}"
    if not RE_ID.match(id_act):
        r.erreur(lieu, "identifiant invalide (lettres, chiffres, - et _ uniquement)")
    t = act.get("type")
    if t not in TYPES_ACTIVITES:
        r.erreur(lieu, f"type inconnu « {t} »")
        return
    if not texte_present(act, "consigne"):
        r.erreur(lieu, "consigne manquante")
    if act.get("objectif") not in objectifs:
        r.erreur(lieu, f"objectif « {act.get('objectif')} » absent des objectifsSpecifiques du module")
    expl = act.get("explication") or {}
    if not (texte_present(expl, "correct") and texte_present(expl, "incorrect")):
        r.erreur(lieu, "explication.correct et explication.incorrect sont obligatoires")
    notation = act.get("notation")
    if not isinstance(notation, dict) or not isinstance(notation.get("formative"), bool):
        r.erreur(lieu, "notation.formative (true/false) est obligatoire")
    elif not isinstance(notation.get("points", 1), (int, float)) or notation.get("points", 1) <= 0:
        r.erreur(lieu, "notation.points doit être un nombre positif")

    if t in ("choix-unique", "choix-multiple"):
        choix = act.get("choix") or []
        ids = [c.get("id") for c in choix]
        if len(choix) < 2:
            r.erreur(lieu, "au moins deux choix sont nécessaires")
        if len(set(ids)) != len(ids):
            r.erreur(lieu, "identifiants de choix en double")
        for c in choix:
            if not RE_ID_CHOIX.match(str(c.get("id", ""))):
                r.erreur(lieu, f"identifiant de choix « {c.get('id')} » : un seul caractère a-z ou 0-9")
            if not texte_present(c, "texte"):
                r.erreur(lieu, f"texte manquant pour le choix « {c.get('id')} »")
        if t == "choix-unique":
            if act.get("reponse") not in ids:
                r.erreur(lieu, "« reponse » doit correspondre à un identifiant de choix")
        else:
            rep = act.get("reponses")
            if not isinstance(rep, list) or not rep:
                r.erreur(lieu, "« reponses » doit être une liste non vide")
            elif any(x not in ids for x in rep):
                r.erreur(lieu, "« reponses » contient un identifiant de choix inconnu")
    elif t == "vrai-faux":
        if not isinstance(act.get("reponse"), bool):
            r.erreur(lieu, "« reponse » doit valoir true ou false")
    elif t == "classement":
        cats = act.get("categories") or []
        elts = act.get("elements") or []
        ids_cats = [c.get("id") for c in cats]
        ids_elts = [e.get("id") for e in elts]
        if len(cats) < 2:
            r.erreur(lieu, "au moins deux catégories sont nécessaires")
        if len(elts) < 2:
            r.erreur(lieu, "au moins deux éléments sont nécessaires")
        if len(set(ids_cats)) != len(ids_cats) or len(set(ids_elts)) != len(ids_elts):
            r.erreur(lieu, "identifiants en double dans les catégories ou les éléments")
        for x in ids_cats + ids_elts:
            if not RE_ID_CHOIX.match(str(x or "")):
                r.erreur(lieu, f"identifiant « {x} » : un seul caractère a-z ou 0-9")
        for e in elts:
            if e.get("categorie") not in ids_cats:
                r.erreur(lieu, f"élément « {e.get('id')} » : catégorie attendue inconnue")
            if not texte_present(e, "texte"):
                r.erreur(lieu, f"élément « {e.get('id')} » : texte manquant")


def valider_tableau_simple(t, lieu, r):
    cols = t.get("colonnes") or []
    if not texte_present(t, "titre") or not cols or not t.get("lignes"):
        r.erreur(lieu, "« titre », « colonnes » et « lignes » sont obligatoires")
    for j, ligne in enumerate(t.get("lignes") or [], 1):
        if len(ligne) != len(cols):
            r.erreur(lieu, f"ligne {j} : {len(ligne)} cellules pour {len(cols)} colonnes")


def valider_comparateur(b, lieu, r):
    avant, apres = b.get("avant") or {}, b.get("apres") or {}
    valider_tableau_simple(avant, f"{lieu}, tableau « avant »", r)
    valider_tableau_simple(apres, f"{lieu}, tableau « après »", r)
    problemes = b.get("problemes") or []
    if not problemes:
        r.erreur(lieu, "au moins une difficulté (« problemes ») est nécessaire")
    ids = [p.get("id") for p in problemes]
    if len(set(ids)) != len(ids):
        r.erreur(lieu, "identifiants de difficultés en double")
    nb_lignes, nb_cols = len(avant.get("lignes") or []), len(avant.get("colonnes") or [])
    for p in problemes:
        plieu = f"{lieu}, difficulté « {p.get('id')} »"
        if not (texte_present(p, "libelle") and texte_present(p, "explication")):
            r.erreur(plieu, "« libelle » et « explication » sont obligatoires")
        cellules = p.get("cellules") or []
        if not cellules:
            r.erreur(plieu, "aucune cellule signalée")
        for c in cellules:
            if not (isinstance(c, list) and len(c) == 2 and all(isinstance(x, int) for x in c)
                    and 0 <= c[0] < nb_lignes and 0 <= c[1] < nb_cols):
                r.erreur(plieu, f"cellule {c} invalide : [ligne, colonne] comptées à partir de 0, dans le tableau « avant »")
    if not texte_present(apres, "avertissement"):
        r.avertir(lieu, "pas d'« avertissement » : préciser que le tableau « après » n'est pas une correction certaine")


def valider_simulateur(b, lieu, objectifs, r):
    """Renvoie les objectifs couverts par les scénarios."""
    decisions = b.get("decisions") or []
    ids_dec = [d.get("id") for d in decisions]
    if len(decisions) < 2 or len(set(ids_dec)) != len(ids_dec):
        r.erreur(lieu, "au moins deux « decisions » aux identifiants distincts sont nécessaires")
    for d in decisions:
        if not texte_present(d, "libelle"):
            r.erreur(lieu, f"décision « {d.get('id')} » : « libelle » manquant")
    scenarios = b.get("scenarios") or []
    if not scenarios:
        r.erreur(lieu, "au moins un scénario est nécessaire")
    ids_sc = [s.get("id") for s in scenarios]
    if len(set(ids_sc)) != len(ids_sc):
        r.erreur(lieu, "identifiants de scénarios en double")
    couverts = set()
    for s in scenarios:
        slieu = f"{lieu}, scénario « {s.get('id')} »"
        if not RE_ID.match(str(s.get("id") or "")):
            r.erreur(slieu, "identifiant manquant ou invalide")
        for cle in ("titre", "contexte", "demandeur", "finalite", "donnees"):
            if not texte_present(s, cle):
                r.erreur(slieu, f"« {cle} » manquant")
        if s.get("objectif") not in objectifs:
            r.erreur(slieu, f"objectif « {s.get('objectif')} » absent des objectifsSpecifiques du module")
        couverts.add(s.get("objectif"))
        choix = s.get("choix") or []
        ids_ch = [c.get("id") for c in choix]
        if len(choix) < 2 or len(set(ids_ch)) != len(ids_ch):
            r.erreur(slieu, "au moins deux choix aux identifiants distincts sont nécessaires")
        for c in choix:
            if c.get("decision") not in ids_dec:
                r.erreur(slieu, f"choix « {c.get('id')} » : décision « {c.get('decision')} » inconnue")
            if not (texte_present(c, "texte") and texte_present(c, "feedback")):
                r.erreur(slieu, f"choix « {c.get('id')} » : « texte » et « feedback » sont obligatoires")
        if s.get("reponse") not in ids_ch:
            r.erreur(slieu, "« reponse » doit correspondre à un identifiant de choix")
        corr = s.get("correction") or {}
        if not all(texte_present(corr, k) for k in ("pourquoi", "risque", "reflexe")) or not corr.get("aVerifier"):
            r.erreur(slieu, "« correction » : « pourquoi », « aVerifier » (liste), « risque » et « reflexe » sont obligatoires")
    if not texte_present(b, "avertissement"):
        r.avertir(lieu, "pas d'« avertissement » : préciser qu'il s'agit d'un exercice, pas d'un outil de validation réelle")
    return couverts


def valider_module(mod, entree, r, ids_globaux):
    lieu = f"module {entree.get('id')}"
    if "slugArchive" in mod and not RE_SLUG.match(str(mod["slugArchive"])):
        r.erreur(lieu, "« slugArchive » : lettres minuscules sans accent, chiffres et tirets uniquement")
    if mod.get("id") != entree.get("id"):
        r.erreur(lieu, f"l'identifiant du fichier ({mod.get('id')}) diffère de celui du catalogue")
    for cle in ("titre", "objectif"):
        if not texte_present(mod, cle):
            r.erreur(lieu, f"« {cle} » manquant")
    if not isinstance(mod.get("duree"), (int, float)) or mod.get("duree") <= 0:
        r.erreur(lieu, "« duree » (en minutes) manquante ou invalide")
    if mod.get("numero") != entree.get("numero"):
        r.erreur(lieu, "le numéro diffère de celui du catalogue")

    objectifs = {o.get("id") for o in mod.get("objectifsSpecifiques") or []}
    if not objectifs:
        r.erreur(lieu, "au moins un objectif spécifique est nécessaire")

    activites = mod.get("activites") or {}
    lecons = mod.get("lecons") or []
    if not lecons:
        r.erreur(lieu, "aucune leçon")
    utilisations = {k: 0 for k in activites}
    couverts_blocs = set()
    ids_lecons = set()
    for lec in lecons:
        lid = lec.get("id")
        llieu = f"{lieu}, leçon {lid}"
        if not lid or not RE_ID.match(lid):
            r.erreur(llieu, "identifiant de leçon manquant ou invalide")
        if lid in ids_lecons or lid in ids_globaux:
            r.erreur(llieu, "identifiant déjà utilisé")
        ids_lecons.add(lid)
        ids_globaux.add(lid)
        if not texte_present(lec, "titre"):
            r.erreur(llieu, "titre manquant")
        if lec.get("type") == "lecon":
            blocs = lec.get("blocs") or []
            if not blocs:
                r.erreur(llieu, "aucun bloc")
            for i, b in enumerate(blocs, 1):
                blieu = f"{llieu}, bloc {i}"
                bt = b.get("type")
                if bt not in TYPES_BLOCS:
                    r.erreur(blieu, f"type de bloc inconnu « {bt} »")
                elif bt == "activite":
                    if b.get("ref") not in activites:
                        r.erreur(blieu, f"activité « {b.get('ref')} » introuvable")
                    else:
                        utilisations[b["ref"]] += 1
                        if not activites[b["ref"]].get("notation", {}).get("formative", False):
                            r.avertir(blieu, "activité non formative placée dans une leçon")
                elif bt == "tableau":
                    cols = b.get("colonnes") or []
                    if not cols or not b.get("lignes"):
                        r.erreur(blieu, "tableau sans colonnes ou sans lignes")
                    for j, ligne in enumerate(b.get("lignes") or [], 1):
                        if len(ligne) != len(cols):
                            r.erreur(blieu, f"ligne {j} : {len(ligne)} cellules pour {len(cols)} colonnes")
                elif bt == "definition":
                    if not (texte_present(b, "terme") and texte_present(b, "texte")):
                        r.erreur(blieu, "« terme » et « texte » sont obligatoires")
                elif bt == "schema":
                    if not texte_present(b.get("source") or {}, "libelle") or not texte_present(b, "flux"):
                        r.erreur(blieu, "« source.libelle » et « flux » sont obligatoires")
                    cibles = b.get("cibles") or []
                    if len(cibles) < 2:
                        r.erreur(blieu, "au moins deux cibles sont nécessaires")
                    for j, c in enumerate(cibles, 1):
                        if not all(texte_present(c, k) for k in ("libelle", "usage", "detail")):
                            r.erreur(blieu, f"cible {j} : « libelle », « usage » et « detail » sont obligatoires")
                    if not texte_present(b, "legende"):
                        r.avertir(blieu, "schéma sans légende (préciser s'il s'agit d'un exemple illustratif)")
                elif bt == "comparateur":
                    valider_comparateur(b, blieu, r)
                elif bt == "simulateur":
                    couverts_blocs |= valider_simulateur(b, blieu, objectifs, r)
                elif bt in ("chronologie", "memo"):
                    etapes = b.get("etapes") or []
                    if len(etapes) < 2:
                        r.erreur(blieu, "au moins deux étapes sont nécessaires")
                    for j, e in enumerate(etapes, 1):
                        if not (texte_present(e, "titre") and texte_present(e, "texte")):
                            r.erreur(blieu, f"étape {j} : « titre » et « texte » sont obligatoires")
                elif not texte_present(b, "texte"):
                    r.erreur(blieu, "« texte » manquant")
            if blocs and blocs[-1].get("type") != "aretenir":
                r.avertir(llieu, "la leçon ne se termine pas par un bloc « aretenir »")
        elif lec.get("type") == "evaluation":
            qs = lec.get("activites") or []
            if not qs:
                r.erreur(llieu, "évaluation sans question")
            for q in qs:
                if q not in activites:
                    r.erreur(llieu, f"question « {q} » introuvable")
                else:
                    utilisations[q] += 1
                    if activites[q].get("notation", {}).get("formative", True):
                        r.avertir(llieu, f"question « {q} » marquée formative dans une évaluation")
            if lec.get("presentation", "toutes") not in PRESENTATIONS:
                r.erreur(llieu, f"« presentation » doit valoir {sorted(PRESENTATIONS)}")
            messages = lec.get("messagesResultat")
            if messages is not None:
                if not isinstance(messages, list) or not messages:
                    r.erreur(llieu, "« messagesResultat » doit être une liste non vide")
                else:
                    for j, msg in enumerate(messages, 1):
                        if not isinstance(msg.get("min"), (int, float)) or not 0 <= msg["min"] <= 100 or not texte_present(msg, "texte"):
                            r.erreur(llieu, f"message {j} : « min » (0 à 100, en %) et « texte » sont obligatoires")
                    if not any(msg.get("min") == 0 for msg in messages):
                        r.avertir(llieu, "aucun message avec « min » à 0 : un score faible n'aura pas de message")
        else:
            r.erreur(llieu, f"type de leçon inconnu « {lec.get('type')} »")

    for id_act, act in activites.items():
        if id_act in ids_globaux:
            r.erreur(f"activité {id_act}", "identifiant déjà utilisé ailleurs")
        ids_globaux.add(id_act)
        valider_activite(id_act, act, objectifs, r)
        if utilisations.get(id_act, 0) == 0:
            r.avertir(f"activité {id_act}", "définie mais jamais utilisée")
        elif utilisations[id_act] > 1:
            r.erreur(f"activité {id_act}", "utilisée plusieurs fois")

    val = mod.get("validation") or {}
    if val.get("navigation") not in NAVIGATIONS:
        r.erreur(lieu, f"validation.navigation doit valoir {sorted(NAVIGATIONS)}")
    seuil = val.get("seuilReussite")
    ev = val.get("evaluation")
    if ev:
        if not any(l.get("id") == ev and l.get("type") == "evaluation" for l in lecons):
            r.erreur(lieu, f"validation.evaluation « {ev} » ne désigne pas une leçon de type evaluation")
        if seuil is not None and (not isinstance(seuil, (int, float)) or not 0 <= seuil <= 100):
            r.erreur(lieu, "validation.seuilReussite doit être compris entre 0 et 100 (ou absent : module « terminé » sans seuil)")
    elif seuil is not None:
        r.erreur(lieu, "validation.seuilReussite n'a de sens qu'avec validation.evaluation")
    couverts = {a.get("objectif") for a in activites.values()} | couverts_blocs
    for o in objectifs - couverts:
        r.avertir(lieu, f"objectif « {o} » n'est couvert par aucune activité")


def valider():
    """Renvoie (catalogue, modules, rapport)."""
    r = Rapport()
    catalogue = charger_json(DOSSIER_CONTENUS / "catalogue.json", r)
    modules = {}
    if catalogue is None:
        return None, modules, r
    for cle in ("id", "titre", "sousTitre", "institution", "version", "introduction"):
        if not texte_present(catalogue, cle):
            r.erreur("catalogue", f"« {cle} » manquant")
    vus, numeros, ids_globaux = set(), set(), set()
    for entree in catalogue.get("modules") or []:
        mid = entree.get("id")
        if not mid or not RE_ID.match(mid) or mid in vus:
            r.erreur("catalogue", f"identifiant de module manquant, invalide ou en double : {mid}")
        vus.add(mid)
        if entree.get("numero") in numeros:
            r.erreur("catalogue", f"numéro de module en double : {entree.get('numero')}")
        numeros.add(entree.get("numero"))
        if entree.get("etat") == "disponible":
            mod = charger_json(DOSSIER_CONTENUS / "modules" / str(entree.get("fichier")), r)
            if mod is not None:
                valider_module(mod, entree, r, ids_globaux)
                modules[mid] = mod
        elif entree.get("etat") == "a-venir":
            for cle in ("titre", "objectif"):
                if not texte_present(entree, cle):
                    r.erreur(f"catalogue, module {mid}", f"« {cle} » manquant")
        else:
            r.erreur(f"catalogue, module {mid}", "« etat » doit valoir « disponible » ou « a-venir »")
    return catalogue, modules, r


def afficher_rapport(r):
    for a in r.avertissements:
        print(f"  ⚠ {a}")
    for e in r.erreurs:
        print(f"  ✗ {e}")
    print(f"Validation : {len(r.erreurs)} erreur(s), {len(r.avertissements)} avertissement(s).")


if __name__ == "__main__":
    _, mods, rapport = valider()
    print(f"Modules disponibles analysés : {', '.join(mods) or 'aucun'}")
    afficher_rapport(rapport)
    sys.exit(1 if rapport.erreurs else 0)
