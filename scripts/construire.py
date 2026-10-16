#!/usr/bin/env python3
"""Construction du site web et des packages SCORM 1.2 à partir de la source unique.

Usage : python3 scripts/construire.py
Produit :
  index.html + contenus/contenu.js  site web (racine du dépôt, publiable tel quel par GitHub Pages)
  fiches/fiche-memo-module-XX.html  fiche mémo imprimable des modules qui en définissent une
  exports/module-XX-<titre>-scorm12.zip  un package SCORM autonome par module disponible
  dist/scorm/<module>/              contenu décompressé de chaque package (pour le simulateur)
  dist/simulateur/                  simulateur d'API SCORM 1.2 pour les tests
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree
from xml.sax.saxutils import escape, quoteattr

sys.path.insert(0, str(Path(__file__).resolve().parent))
import valider_contenus  # noqa: E402

RACINE = valider_contenus.RACINE
SRC = RACINE / "src"
DIST = RACINE / "dist"
EXPORTS = RACINE / "exports"
SIMULATEUR = RACINE / "outils" / "simulateur-scorm"


def ecrire(chemin, texte):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    chemin.write_text(texte, encoding="utf-8")


def copier_moteur(destination):
    shutil.copytree(SRC / "js", destination / "assets" / "js")
    shutil.copytree(SRC / "css", destination / "assets" / "css")
    if (SRC / "medias").exists():
        shutil.copytree(SRC / "medias", destination / "assets" / "medias")


def empreinte_sources():
    h = hashlib.sha1()
    for p in sorted(SRC.rglob("*")) + sorted((RACINE / "contenus").rglob("*.json")):
        if p.is_file():
            h.update(p.read_bytes())
    return h.hexdigest()[:10]


def page_index(catalogue, config, titre, empreinte, base, contenu):
    gabarit = (SRC / "index.html").read_text(encoding="utf-8")
    gabarit = gabarit.replace("{{BASE}}", base).replace("{{CONTENU}}", contenu)
    # Évite qu'un navigateur ou un LMS serve une ancienne version en cache.
    gabarit = re.sub(r'((?:src|href)="(?!#|https?:)[^"?]+)"', r'\1?v=' + empreinte + '"', gabarit)
    valeurs = {
        "TITRE": escape(titre),
        "INSTITUTION": escape(catalogue["institution"]),
        "SOUS_TITRE": escape(catalogue["sousTitre"]),
        "VERSION": escape(catalogue["version"]),
        "CONFIG": json.dumps(config, ensure_ascii=False),
    }
    for cle, val in valeurs.items():
        gabarit = gabarit.replace("{{" + cle + "}}", val)
    return gabarit


def fichier_contenu(catalogue, modules):
    donnees = {"catalogue": catalogue, "modules": modules}
    return "window.GDD_CONTENU = " + json.dumps(donnees, ensure_ascii=False, separators=(",", ":")) + ";\n"


def verifier_references(dossier):
    """Vérifie que chaque fichier référencé dans index.html est présent dans le dossier."""
    html = (dossier / "index.html").read_text(encoding="utf-8")
    manquants = []
    for ref in re.findall(r'(?:src|href)="([^"#:?]+)', html):
        if not (dossier / ref).is_file():
            manquants.append(ref)
    return manquants


def manifeste(catalogue, module, fichiers):
    mid = module["id"].upper()
    seuil = module.get("validation", {}).get("seuilReussite")
    titre = f"Module {module['numero']} - {module['titre']}"
    lignes_fichiers = "\n".join(f"      <file href={quoteattr(f)}/>" for f in fichiers)
    maitrise = (
        f"\n        <adlcp:masteryscore>{int(seuil)}</adlcp:masteryscore>"
        if module.get("validation", {}).get("evaluation") and seuil is not None else ""
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="UPS-GDD-{mid}" version="{escape(catalogue['version'])}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-{mid}">
    <organization identifier="ORG-{mid}">
      <title>{escape(titre)}</title>
      <item identifier="ITEM-{mid}" identifierref="RES-{mid}" isvisible="true">
        <title>{escape(titre)}</title>{maitrise}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-{mid}" type="webcontent" adlcp:scormtype="sco" href="index.html">
{lignes_fichiers}
    </resource>
  </resources>
</manifest>
"""


def nom_fiche(module):
    return f"fiche-memo-module-{int(module['numero']):02d}.html"


def texte_fiche(texte):
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escape(texte))


def page_fiche(catalogue, module):
    """Fiche mémo autonome (HTML imprimable), générée depuis module["fiche"]."""
    f = module["fiche"]
    items = "\n".join(
        f"""    <li>
      <h2><span class="icone" aria-hidden="true">{escape(r.get("icone", ""))}</span> {texte_fiche(r["titre"])}</h2>
      <p>{texte_fiche(r["texte"])}</p>
      <p class="question"><strong>Ma question :</strong> {texte_fiche(r["question"])}</p>
    </li>""" for r in f["reflexes"])
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(f["titre"])} - Module {module["numero"]}</title>
<style>
  body {{ font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f1f1f; line-height: 1.5; margin: 0; background: #fff; }}
  main {{ max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }}
  .surtitre {{ color: #63003c; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; font-size: .85rem; margin: 0; }}
  h1 {{ color: #63003c; font-size: 1.7rem; margin: .2rem 0 .6rem; }}
  ol {{ list-style: none; padding: 0; margin: 1.2rem 0; display: grid; gap: .7rem; counter-reset: r; }}
  li {{ border: 2px solid #63003c; border-radius: .6rem; padding: .7rem 1rem; break-inside: avoid; }}
  h2 {{ font-size: 1.15rem; margin: 0 0 .3rem; color: #63003c; }}
  li p {{ margin: .2rem 0; }}
  .question {{ background: #f7eef3; border-radius: .4rem; padding: .35rem .6rem; }}
  .rappel {{ border-left: 4px solid #005a70; padding: .5rem .9rem; background: #eef6f8; font-weight: 600; }}
  footer {{ color: #555; font-size: .85rem; margin-top: 1.5rem; }}
  button {{ font: inherit; font-weight: 700; color: #fff; background: #63003c; border: 0; border-radius: .4rem; padding: .6rem 1.1rem; cursor: pointer; }}
  button:focus-visible {{ outline: 3px solid #005a70; outline-offset: 2px; }}
  @media print {{ .ecran {{ display: none; }} main {{ padding: 0; }} @page {{ margin: 1.5cm; }} }}
</style>
</head>
<body>
<main>
  <p class="surtitre">{escape(catalogue["titre"])} · Module {module["numero"]}</p>
  <h1>{escape(f["titre"])}</h1>
  <p>{texte_fiche(f["introduction"])}</p>
  <p class="ecran"><button type="button" onclick="window.print()">Imprimer ou enregistrer en PDF</button></p>
  <ol>
{items}
  </ol>
  <p class="rappel">{texte_fiche(f["rappel"])}</p>
  <footer>{escape(catalogue["institution"])} · {escape(catalogue["sousTitre"])} · version {escape(catalogue["version"])}</footer>
</main>
</body>
</html>
"""


def lister_fichiers(dossier):
    return sorted(p.relative_to(dossier).as_posix() for p in dossier.rglob("*") if p.is_file())


def verifier_xml(chemin):
    if shutil.which("xmllint") is None:
        try:
            ElementTree.parse(chemin)
            return True, "XML bien formé"
        except ElementTree.ParseError as e:
            return False, str(e)
    res = subprocess.run(["xmllint", "--noout", str(chemin)], capture_output=True, text=True)
    return res.returncode == 0, res.stderr.strip() or "XML bien formé"


def zipper(dossier, archive):
    archive.parent.mkdir(parents=True, exist_ok=True)
    if archive.exists():
        archive.unlink()
    # Le manifeste doit être à la racine de l'archive. Dates fixes : l'archive ne change
    # que si son contenu change (évite des modifications inutiles dans git).
    noms = ["imsmanifest.xml"] + [f for f in lister_fichiers(dossier) if f != "imsmanifest.xml"]
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        for f in noms:
            info = zipfile.ZipInfo(f, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, (dossier / f).read_bytes())


def nom_archive(module):
    """module-02-une-donnee-plusieurs-usages-scorm12.zip (titre) ou module-03-qualite-structuration-scorm12.zip (slugArchive)"""
    base = module.get("slugArchive") or module["titre"]
    sans_accents = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", sans_accents.lower()).strip("-")
    return f"module-{int(module['numero']):02d}-{slug}-scorm12.zip"


def construire():
    print("1. Validation des contenus")
    catalogue, modules, rapport = valider_contenus.valider()
    valider_contenus.afficher_rapport(rapport)
    if rapport.erreurs:
        print("Construction interrompue : corriger les erreurs ci-dessus.")
        return 1

    if DIST.exists():
        shutil.rmtree(DIST)
    problemes = []
    empreinte = empreinte_sources()
    # Chaque package SCORM ne contient que son module : le catalogue publié porte le titre
    # des autres modules (renvois de la remédiation du module final).
    catalogue = json.loads(json.dumps(catalogue))
    for entree in catalogue["modules"]:
        if entree["id"] in modules:
            entree["titre"] = modules[entree["id"]]["titre"]

    print("2. Site web -> index.html (racine) + contenus/contenu.js")
    ecrire(RACINE / "contenus" / "contenu.js", fichier_contenu(catalogue, modules))
    config_web = {"mode": "web", "exports": {mid: "exports/" + nom_archive(m) for mid, m in modules.items()}}
    ecrire(RACINE / "index.html", page_index(catalogue, config_web, catalogue["titre"], empreinte,
                                             "src/", "contenus/contenu.js"))
    problemes += [f"site : ressource manquante {m}" for m in verifier_references(RACINE)]
    fiches = RACINE / "fiches"
    attendues = {nom_fiche(m) for m in modules.values() if m.get("fiche")}
    for perimee in fiches.glob("*.html") if fiches.exists() else []:
        if perimee.name not in attendues:
            perimee.unlink()
    for module in modules.values():
        if module.get("fiche"):
            ecrire(fiches / nom_fiche(module), page_fiche(catalogue, module))
            print(f"   fiches/{nom_fiche(module)}")

    print("3. Packages SCORM 1.2 -> exports/")
    EXPORTS.mkdir(exist_ok=True)
    attendus = {nom_archive(m) for m in modules.values()}
    for perime in EXPORTS.glob("*.zip"):
        if perime.name not in attendus:
            perime.unlink()
            print(f"   ancien package supprimé : {perime.relative_to(RACINE)}")
    for mid, module in modules.items():
        dossier = DIST / "scorm" / mid
        copier_moteur(dossier)
        ecrire(dossier / "assets" / "js" / "contenu.js", fichier_contenu(catalogue, {mid: module}))
        titre = f"Module {module['numero']} - {module['titre']}"
        ecrire(dossier / "index.html", page_index(catalogue, {"mode": "scorm", "module": mid}, titre, empreinte,
                                                  "assets/", "assets/js/contenu.js"))
        if module.get("fiche"):
            ecrire(dossier / nom_fiche(module), page_fiche(catalogue, module))
        fichiers = lister_fichiers(dossier)
        ecrire(dossier / "imsmanifest.xml", manifeste(catalogue, module, fichiers))
        ok, msg = verifier_xml(dossier / "imsmanifest.xml")
        if not ok:
            problemes.append(f"{mid} : manifeste invalide : {msg}")
        problemes += [f"{mid} : ressource manquante {m}" for m in verifier_references(dossier)]
        archive = EXPORTS / nom_archive(module)
        zipper(dossier, archive)
        print(f"   {archive.relative_to(RACINE)} ({len(fichiers) + 1} fichiers, {archive.stat().st_size // 1024} Ko) - {msg}")

    print("4. Simulateur SCORM -> dist/simulateur/")
    shutil.copytree(SIMULATEUR, DIST / "simulateur")
    ecrire(DIST / "simulateur" / "packages.js",
           "window.PACKAGES = " + json.dumps(
               [{"id": mid, "titre": f"Module {m['numero']} - {m['titre']}", "url": f"../scorm/{mid}/index.html"}
                for mid, m in modules.items()], ensure_ascii=False) + ";\n")

    if problemes:
        print("Problèmes détectés :")
        for p in problemes:
            print(f"  ✗ {p}")
        return 1
    print("Construction terminée sans erreur.")
    return 0


if __name__ == "__main__":
    sys.exit(construire())
