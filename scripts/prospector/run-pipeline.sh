#!/bin/bash
# Pipeline completo de prospección — Linux/WSL (.sh)
# Ejecuta scrape → enrich → validate → dedup → stats → export
#
# Uso:
#   ./run-pipeline.sh                  # todo por defecto
#   ./run-pipeline.sh --rubro abogado  # solo un rubro
#   ./run-pipeline.sh --skip-scrape    # desde enrich en adelante
#   ./run-pipeline.sh --export-only    # solo stats + csv
#   ./run-pipeline.sh --full           # scrape masivo chilerut + gmaps

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "══════════════════════════════════════════════════════"
echo "  PROSPECTOR Pipeline — Región de Los Lagos"
echo "══════════════════════════════════════════════════════"

uv run python run_pipeline.py "$@"

echo ""
echo "  ✓ Pipeline completado."
echo ""
