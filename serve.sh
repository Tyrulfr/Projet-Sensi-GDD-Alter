#!/usr/bin/env bash
# Sert le projet en local pour tester le site, le simulateur SCORM et les tests unitaires.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo "Site web         : http://localhost:${PORT}/"
echo "Simulateur SCORM : http://localhost:${PORT}/dist/simulateur/"
echo "Tests unitaires  : http://localhost:${PORT}/tests/"
echo "(Ctrl+C pour arrêter)"
python3 -m http.server "${PORT}" --bind 127.0.0.1
