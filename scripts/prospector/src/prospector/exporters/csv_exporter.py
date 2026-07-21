"""CSVExporter — Exporta prospectos a CSV listos para campañas.

Soporta filtros por:
  - Rubro
  - Score mínimo
  - Comuna
  - Estado
  - Solo con teléfono o email
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect

log = get_logger(__name__)


class CSVExporter:
    """Exporta prospectos a archivo CSV."""

    # Columnas estándar para campañas de outreach
    DEFAULT_FIELDS = [
        "id",
        "empresa",
        "rubro",
        "comuna",
        "telefonos",
        "emails",
        "sitio_web",
        "google_rating",
        "google_reviews",
        "digital_score",
        "estado",
        "notas",
    ]

    # Columnas para WhatsApp (mínimas)
    WHATSAPP_FIELDS = [
        "empresa",
        "telefonos",
        "rubro",
        "comuna",
        "notas",
    ]

    # Columnas para Email Marketing
    EMAIL_FIELDS = [
        "empresa",
        "emails",
        "rubro",
        "comuna",
        "sitio_web",
        "digital_score",
    ]

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path("data/exports")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export(
        self,
        prospects: list[Prospect],
        filename: str = "",
        fields: Optional[list[str]] = None,
        rubro: Optional[str] = None,
        min_score: int = 0,
        comuna: Optional[str] = None,
        solo_con_telefono: bool = False,
        solo_con_email: bool = False,
        estado: Optional[str] = None,
    ) -> Path:
        """Exporta prospectos filtrados a CSV.

        Args:
            prospects: Lista completa de prospectos.
            filename: Nombre del archivo (default: export_{rubro}_YYYYMMDD.csv).
            fields: Columnas a incluir.
            rubro: Filtrar por rubro.
            min_score: Score mínimo (0-100).
            comuna: Filtrar por comuna.
            solo_con_telefono: Solo prospectos con teléfono.
            solo_con_email: Solo prospectos con email.
            estado: Filtrar por estado.

        Returns:
            Path al archivo generado.
        """
        # Aplicar filtros
        filtrados = self._filtrar(
            prospects,
            rubro=rubro,
            min_score=min_score,
            comuna=comuna,
            solo_con_telefono=solo_con_telefono,
            solo_con_email=solo_con_email,
            estado=estado,
        )

        if not filtrados:
            log.warning("Sin prospectos después de filtrar")
            # Crear archivo vacío igual
            filename = filename or self._default_filename(rubro or "todos")
            output_path = self.output_dir / filename
            with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(fields or self.DEFAULT_FIELDS)
            log.info("CSV vacío generado: {f}", f=output_path)
            return output_path

        # Preparar datos
        fields = fields or self.DEFAULT_FIELDS
        filename = filename or self._default_filename(rubro or "todos")
        output_path = self.output_dir / filename

        with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for p in filtrados:
                row = p.model_dump()
                # Aplanar campos multivalor
                if "telefonos" in fields:
                    row["telefonos"] = "; ".join(p.telefonos)
                if "emails" in fields:
                    row["emails"] = "; ".join(p.emails)
                if "digital_score" in fields:
                    row["digital_score"] = p.digital_score
                writer.writerow(row)

        log.info(
            "Exportados {n} prospectos a {f} ({rubro}, score≥{s})",
            n=len(filtrados), f=output_path, rubro=rubro or "todos", s=min_score,
        )
        return output_path

    # ------------------------------------------------------------------
    # Filtros
    # ------------------------------------------------------------------

    @staticmethod
    def _filtrar(
        prospects: list[Prospect],
        rubro: Optional[str] = None,
        min_score: int = 0,
        comuna: Optional[str] = None,
        solo_con_telefono: bool = False,
        solo_con_email: bool = False,
        estado: Optional[str] = None,
    ) -> list[Prospect]:
        result = prospects
        if rubro:
            result = [p for p in result if p.rubro == rubro]
        if min_score > 0:
            result = [p for p in result if p.digital_score >= min_score]
        if comuna:
            result = [p for p in result if p.comuna.lower() == comuna.lower()]
        if solo_con_telefono:
            result = [p for p in result if p.telefonos]
        if solo_con_email:
            result = [p for p in result if p.emails]
        if estado:
            result = [p for p in result if p.estado == estado]
        return result

    @staticmethod
    def _default_filename(rubro: str) -> str:
        from datetime import datetime
        ts = datetime.now().strftime("%Y%m%d")
        return f"prospectos_{rubro}_{ts}.csv"
