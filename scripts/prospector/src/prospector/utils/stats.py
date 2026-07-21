"""StatsReporter — Genera reportes de calidad y estadísticas de la base de datos.

Uso:
    reporter = StatsReporter(prospects)
    reporter.print_report()
    reporter.export_report("data/report.json")
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect

log = get_logger(__name__)


class StatsReporter:
    """Genera estadísticas de la base de prospectos."""

    def __init__(self, prospects: list[Prospect]):
        self.prospects = prospects

    # ------------------------------------------------------------------
    # Estadísticas principales
    # ------------------------------------------------------------------

    def total(self) -> int:
        return len(self.prospects)

    def por_rubro(self) -> Counter:
        return Counter(p.rubro for p in self.prospects)

    def por_comuna(self) -> Counter:
        return Counter(p.comuna for p in self.prospects if p.comuna)

    def por_estado(self) -> Counter:
        return Counter(p.estado for p in self.prospects)

    def por_fuente(self) -> Counter:
        return Counter(p.fuente for p in self.prospects)

    def por_score_range(self) -> dict[str, int]:
        ranges = {"sin_datos (0)": 0, "bajo (1-30)": 0, "medio (31-60)": 0, "bueno (61-80)": 0, "excelente (81-100)": 0}
        for p in self.prospects:
            s = p.digital_score
            if s == 0:
                ranges["sin_datos (0)"] += 1
            elif s <= 30:
                ranges["bajo (1-30)"] += 1
            elif s <= 60:
                ranges["medio (31-60)"] += 1
            elif s <= 80:
                ranges["bueno (61-80)"] += 1
            else:
                ranges["excelente (81-100)"] += 1
        return ranges

    # ------------------------------------------------------------------
    # Métricas de calidad
    # ------------------------------------------------------------------

    def calidad_datos(self) -> dict:
        """Reporta qué % de prospectos tiene cada campo."""
        total = self.total() or 1
        return {
            "con_telefono": sum(1 for p in self.prospects if p.telefonos) / total * 100,
            "con_email": sum(1 for p in self.prospects if p.emails) / total * 100,
            "con_web": sum(1 for p in self.prospects if p.sitio_web) / total * 100,
            "con_rut": sum(1 for p in self.prospects if p.rut) / total * 100,
            "con_rubro": sum(1 for p in self.prospects if p.rubro) / total * 100,
            "con_comuna": sum(1 for p in self.prospects if p.comuna) / total * 100,
            "con_direccion": sum(1 for p in self.prospects if p.direccion) / total * 100,
            "con_gmb": sum(1 for p in self.prospects if p.google_maps_url) / total * 100,
            "con_rating": sum(1 for p in self.prospects if p.google_rating is not None) / total * 100,
        }

    # ------------------------------------------------------------------
    # Outputs
    # ------------------------------------------------------------------

    def resumen(self) -> dict:
        return {
            "total": self.total(),
            "por_rubro": dict(self.por_rubro().most_common()),
            "por_comuna": dict(self.por_comuna().most_common(10)),
            "por_estado": dict(self.por_estado()),
            "por_fuente": dict(self.por_fuente()),
            "por_score": self.por_score_range(),
            "calidad": self.calidad_datos(),
        }

    def print_report(self) -> None:
        """Imprime reporte formateado en consola."""
        r = self.resumen()
        log.info("=" * 50)
        log.info("📊 REPORTE DE PROSPECTOS")
        log.info("=" * 50)
        log.info("Total: {n}", n=r["total"])
        log.info("")

        log.info("Por rubro:")
        for rubro, count in r["por_rubro"].items():
            log.info("  • {r}: {c}", r=rubro or "sin rubro", c=count)

        log.info("")
        log.info("Top 10 comunas:")
        for comuna, count in r["por_comuna"].items():
            log.info("  • {c}: {n}", c=comuna, n=count)

        log.info("")
        log.info("Score digital:")
        for rango, count in r["por_score"].items():
            log.info("  • {r}: {n}", r=rango, n=count)

        log.info("")
        log.info("Calidad de datos:")
        for campo, pct in sorted(r["calidad"].items()):
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            log.info("  • {c}: {p:5.1f}% {b}", c=campo.ljust(15), p=pct, b=bar)

        log.info("")
        log.info("Por estado:")
        for estado, count in r["por_estado"].items():
            log.info("  • {e}: {n}", e=estado, n=count)

        log.info("")
        log.info("Por fuente:")
        for fuente, count in r["por_fuente"].items():
            log.info("  • {f}: {n}", f=fuente, n=count)
        log.info("=" * 50)

    def export_report(self, path: Optional[Path] = None) -> Path:
        """Exporta el reporte a JSON."""
        path = path or Path("data/report.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "generated_at": datetime.now().isoformat(),
            **self.resumen(),
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        log.info("Reporte exportado a {f}", f=path)
        return path
