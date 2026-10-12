#!/usr/bin/env bash
# Valide les contenus puis génère le site web (dist/site) et les packages SCORM 1.2 (exports/).
set -euo pipefail
cd "$(dirname "$0")"
python3 scripts/construire.py
