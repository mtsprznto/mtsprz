"""CSVImporter — Importa prospectos desde archivos CSV externos.

Soporta mapeo flexible de columnas:
  - Auto-detecta columnas por nombre (case-insensitive)
  - Permite mapeo manual con un dict
  - Normaliza automáticamente teléfonos, RUTs y emails
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect, FuenteProspect

log = get_logger(__name__)

# Mapeo automático de nombres de columna (case-insensitive)
COLUMN_ALIASES = {
    "empresa": ["empresa", "nombre", "razon_social", "razón social", "negocio", "comercio", "business"],
    "rut": ["rut", "id tributario", "rol"],
    "rubro": ["rubro", "sector", "industria", "categoria", "categoría", "giro"],
    "comuna": ["comuna", "ciudad", "localidad", "población"],
    "direccion": ["direccion", "dirección", "address", "domicilio"],
    "telefono": ["telefono", "teléfono", "phone", "celular", "movil", "móvil", "contacto"],
    "email": ["email", "e-mail", "correo", "mail", "e_mail"],
    "sitio_web": ["sitio_web", "sitio web", "web", "website", "url", "pagina_web", "página web"],
    "notas": ["notas", "observaciones", "comentarios"],
}


class CSVImporter:
    """Importa prospectos desde CSV."""

    def __init__(self, column_mapping: Optional[dict[str, str]] = None):
        """
        Args:
            column_mapping: Dict manual de {columna destino: columna CSV}.
                            Ej: {"empresa": "Nombre del Negocio", "telefono": "Celular"}
        """
        self.column_mapping = column_mapping or {}

    def import_file(self, file_path: Path, fuente: str = "importacion") -> list[Prospect]:
        """Importa prospectos desde un archivo CSV.

        Args:
            file_path: Ruta al archivo CSV.
            fuente: Nombre de la fuente (para el campo 'fuente').

        Returns:
            Lista de prospectos importados (sin guardar en DB).
        """
        if not file_path.exists():
            log.error("Archivo no encontrado: {f}", f=file_path)
            return []

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            if reader.fieldnames is None:
                log.error("CSV sin cabeceras: {f}", f=file_path)
                return []

            # Detectar mapeo de columnas
            mapping = self._detect_mapping(reader.fieldnames)
            log.info("Mapeo detectado: {m}", m=mapping)

            prospects = []
            errores = 0
            for i, row in enumerate(reader, start=2):  # línea 2 = primera data
                try:
                    p = self._row_to_prospect(row, mapping, fuente)
                    if p:
                        prospects.append(p)
                except Exception as e:
                    errores += 1
                    log.trace("Error línea {n}: {e}", n=i, e=str(e)[:100])

        log.info(
            "CSV {f}: {ok} importados, {err} errores",
            f=file_path.name, ok=len(prospects), err=errores,
        )
        return prospects

    # ------------------------------------------------------------------
    # Mapeo de columnas
    # ------------------------------------------------------------------

    def _detect_mapping(self, fieldnames: list[str]) -> dict[str, str]:
        """Auto-detecta mapeo entre columnas CSV y campos Prospect."""
        mapping = {}
        for csv_col in fieldnames:
            csv_lower = csv_col.lower().strip()
            for target, aliases in COLUMN_ALIASES.items():
                if csv_lower in [a.lower() for a in aliases]:
                    mapping[target] = csv_col
                    break
        # Sobreescribir con mapeo manual
        mapping.update(self.column_mapping)
        return mapping

    # ------------------------------------------------------------------
    # Conversión
    # ------------------------------------------------------------------

    def _row_to_prospect(
        self, row: dict, mapping: dict[str, str], fuente: str
    ) -> Optional[Prospect]:
        """Convierte una fila CSV a Prospect."""
        def val(key: str) -> str:
            col = mapping.get(key)
            return row.get(col, "").strip() if col else ""

        empresa = val("empresa")
        if not empresa:
            return None

        from prospector.validators.rut import validar_rut, formatear_rut
        from prospector.validators.phone import normalizar_telefono
        from prospector.validators.email import normalizar_email

        # Normalizar teléfono
        telefono_raw = val("telefono")
        telefonos = []
        if telefono_raw:
            tel = normalizar_telefono(telefono_raw)
            if tel:
                telefonos.append(tel)

        # Normalizar email
        email_raw = val("email")
        emails = []
        if email_raw:
            email = normalizar_email(email_raw)
            if email:
                emails.append(email)

        # Normalizar RUT
        rut_raw = val("rut")
        rut = formatear_rut(rut_raw) if rut_raw and validar_rut(rut_raw) else ""

        prospect = Prospect.create(
            empresa=empresa,
            rut=rut,
            rubro=val("rubro"),
            comuna=val("comuna"),
            direccion=val("direccion"),
            telefonos=telefonos,
            emails=emails,
            sitio_web=val("sitio_web"),
            notas=val("notas"),
            fuente=fuente,
        )
        return prospect
