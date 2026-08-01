#!/usr/bin/env python3
"""Pipeline completo de prospección — cross-platform (Windows/Ubuntu).
Ejecuta scrape → enrich → validate → dedup → stats → export en secuencia.

Uso:
    python run_pipeline.py                           # todo por defecto
    python run_pipeline.py --full                    # scrape masivo
    python run_pipeline.py --rubro inmobiliaria       # solo un rubro
    python run_pipeline.py --skip-scrape              # re-ejecutar desde enrich
    python run_pipeline.py --skip-enrich              # solo scrape + reporte
    python run_pipeline.py --export-only              # solo stats + csv
    python run_pipeline.py --rubro abogado --max 30   # rubro específico, pocos
"""

import subprocess
import sys
import time
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────
SCRIPTS_DIR = Path(__file__).parent
DB_PATH = SCRIPTS_DIR / "data" / "prospects.json"

RUBROS = ["inmobiliaria", "abogado", "contador", "constructora", "dentista"]
PROVINCIAS = ["Llanquihue", "Osorno"]
# CIUDADES = ["Puerto Varas", "Osorno", "Puerto Montt"]  # gmaps

MAX_POR_RUBRO = 60  # chilerut
MAX_GMAPS = 30


# ── Utilidades ──────────────────────────────────────────────────────────
def run(cmd: list[str], desc: str = "", critical: bool = False) -> bool:
    """Ejecuta comando uv run prospector. Retorna True si ok."""
    cmd_str = " ".join(str(c) for c in cmd)
    print("")
    print("━" * 60)
    print(f"  {desc}")
    print(f"  $ {cmd_str}")
    print("━" * 60)

    result = subprocess.run(cmd, cwd=SCRIPTS_DIR)

    if result.returncode != 0:
        print(f"  ✗ ERROR (código {result.returncode})")
        if critical:
            print("  ⛔ Pipeline detenido por error crítico")
            sys.exit(1)
        return False

    print(f"  ✓ OK")
    return True


# ── Steps ────────────────────────────────────────────────────────────────
def step_scrape_gmaps(comuna: str) -> bool:
    q = f"inmobiliaria {comuna}"
    return run(
        ["uv", "run", "prospector", "scrape", "gmaps",
         "--query", q, "--max", str(MAX_GMAPS)],
        desc=f"Scrape Google Maps: {q}",
    )


def step_scrape_chilerut() -> bool:
    return run(
        ["uv", "run", "prospector", "scrape", "chilerut",
         "--provincias", ",".join(PROVINCIAS),
         "--max", str(MAX_POR_RUBRO)],
        desc=f"Scrape ChileRut: provincias {', '.join(PROVINCIAS)}",
    )


def pipeline(args: list[str]) -> None:
    global MAX_POR_RUBRO, MAX_GMAPS
    # ── Parsea flags inline ─────────────────────────────────────────
    flags = set(args)
    full = "--full" in flags
    export_only = "--export-only" in flags
    skip_scrape = "--skip-scrape" in flags or export_only
    skip_enrich = "--skip-enrich" in flags or export_only

    rubro_filter = None
    for a in args:
        if a.startswith("--rubro="):
            rubro_filter = a.split("=", 1)[1]
        elif a == "--rubro":
            idx = args.index(a)
            if idx + 1 < len(args):
                rubro_filter = args[idx + 1]

    max_override = None
    for a in args:
        if a.startswith("--max="):
            max_override = int(a.split("=", 1)[1])

    if max_override:
        MAX_POR_RUBRO = max_override
        MAX_GMAPS = max_override

    # --full: más provincias, más resultados
    if full:
        PROVINCIAS.extend(["Chiloe", "Palena"])
        MAX_POR_RUBRO = 120
        MAX_GMAPS = 60

    # ── Header ─────────────────────────────────────────────────────
    print("")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║        PROSPECTOR — Pipeline Completo de Prospección    ║")
    print("║        Región de Los Lagos, Chile                       ║")
    print("╚══════════════════════════════════════════════════════════╝")
    inicio = time.time()

    if export_only:
        print("  Modo: solo exportación (skips scrape + enrich)")

    # ── 1. SCRAPE ──────────────────────────────────────────────────
    if not skip_scrape:
        print("")
        print("▓" * 60)
        print("  FASE 1: SCRAPE")
        print("▓" * 60)

        # ChileRut — todas las empresas de las provincias
        step_scrape_chilerut()

        # Google Maps — inmobiliarias por comuna
        if not rubro_filter or rubro_filter == "inmobiliaria":
            for ciudad in ["Puerto Varas", "Osorno", "Puerto Montt"]:
                step_scrape_gmaps(ciudad)

    # ── 2. FIND-WEBSITES ───────────────────────────────────────────
    if not skip_enrich:
        print("")
        print("▓" * 60)
        print("  FASE 2: BUSCAR SITIOS WEB")
        print("▓" * 60)
        run(
            ["uv", "run", "prospector", "find-websites", "--limit", "0", "--save"],
            desc="Buscar sitios web de prospectos sin web conocida",
        )

    # ── 3. ENRICH ──────────────────────────────────────────────────
    if not skip_enrich:
        print("")
        print("▓" * 60)
        print("  FASE 3: ENRIQUECER (score digital, redes, whatapps)")
        print("▓" * 60)
        run(
            ["uv", "run", "prospector", "enrich", "all"],
            desc="Enriquecer todos los prospectos pendientes",
        )

    # ── 4. VALIDATE ────────────────────────────────────────────────
    print("")
    print("▓" * 60)
    print("  FASE 4: VALIDAR")
    print("▓" * 60)
    run(
        ["uv", "run", "prospector", "validate"],
        desc="Validar teléfonos, RUTs y emails",
    )

    # ── 5. DEDUP ───────────────────────────────────────────────────
    print("")
    print("▓" * 60)
    print("  FASE 5: DEDUPLICAR")
    print("▓" * 60)
    run(
        ["uv", "run", "prospector", "dedup"],
        desc="Fusionar prospectos duplicados",
    )

    # ── 6. STATS ───────────────────────────────────────────────────
    print("")
    print("▓" * 60)
    print("  FASE 6: ESTADÍSTICAS Y EXPORTACIÓN")
    print("▓" * 60)
    run(
        ["uv", "run", "prospector", "stats"],
        desc="Estadísticas de la base de prospectos",
    )

    # ── 7. EXPORT ──────────────────────────────────────────────────
    run(
        ["uv", "run", "prospector", "export", "--formato", "csv",
         "--min-score", "30"],
        desc="Exportar CSV (score >= 30)",
    )
    run(
        ["uv", "run", "prospector", "export", "--formato", "csv",
         "--min-score", "50"],
        desc="Exportar CSV (score >= 50 — los mejores)",
    )

    # ── Resumen ────────────────────────────────────────────────────
    elapsed = time.time() - inicio
    print("")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  PIPELINE COMPLETO ✓                                    ║")
    print(f"║  Tiempo total: {elapsed:.0f}s                               ║")
    print("║                                                         ║")
    print("║  Siguiente: sincronizar al panel admin:                 ║")
    print("║    uv run prospector push-leads --dry-run               ║")
    print("║    uv run prospector push-leads --min-score 40          ║")
    print("║                                                         ║")
    print("║  O campaña WhatsApp:                                    ║")
    print("║    uv run prospector send-whatsapp --rubro abogado      ║")
    print("║         --limit 3 --dry-run                             ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print("")


if __name__ == "__main__":
    pipeline(sys.argv[1:])
