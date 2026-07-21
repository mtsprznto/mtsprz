"""ChileRutScraper — Extrae empresas desde ChileRutEmpresa.cl (datos públicos SII).

Fuente: https://chilerutempresa.cl/region/los-lagos

Obtiene: RUT, razón social, dirección, comuna, actividad económica.
"""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urljoin

from prospector.core.logger import get_logger
from prospector.core.models import Prospect, FuenteProspect, Rubro
from prospector.scrapers.base import BaseScraper, ScraperResult

log = get_logger(__name__)

# Provincias de la Región de Los Lagos con sus URLs
PROVINCIAS = {
    "llanquihue": "https://chilerutempresa.cl/region/los-lagos/llanquihue",
    "osorno": "https://chilerutempresa.cl/region/los-lagos/osorno",
    "chiloe": "https://chilerutempresa.cl/region/los-lagos/chiloe",
    "palena": "https://chilerutempresa.cl/region/los-lagos/palena",
}


class ChileRutScraper(BaseScraper):
    """Scraper para ChileRutEmpresa.cl."""

    BASE_URL = "https://chilerutempresa.cl"

    def __init__(
        self,
        provincias: Optional[list[str]] = None,
        dry_run: bool = False,
        resume: bool = False,
    ):
        super().__init__(
            name="chilerut",
            delay=1.0,  # respetuoso con el servidor
            dry_run=dry_run,
            resume=resume,
        )
        self.provincias = provincias or list(PROVINCIAS.keys())

    def scrape(self, **kwargs) -> ScraperResult:
        """Scrapea empresas de las provincias configuradas.

        Args:
            provincias: Lista opcional de provincias a scrapear.
            max_por_provincia: Máximo de empresas por provincia.

        Returns:
            ScraperResult con el resumen.
        """
        provincias = kwargs.get("provincias", self.provincias)
        max_por_provincia = kwargs.get("max_por_provincia", 0)

        result_total = ScraperResult()
        prospects: list[Prospect] = []

        for prov in provincias:
            prov = prov.lower().strip()
            if prov not in PROVINCIAS:
                log.warning("Provincia desconocida: {p}", p=prov)
                continue

            url = PROVINCIAS[prov]
            log.info("Scrapeando provincia: {p} ({url})", p=prov, url=url)

            if self.dry_run:
                self._log_dry_run("Scrapearía {p} desde {url}", p=prov, url=url)
                continue

            res = self._scrape_provincia(url, prov, max_por_provincia)
            result_total += res

        return result_total

    def _scrape_provincia(
        self, url: str, provincia: str, max_por_provincia: int
    ) -> ScraperResult:
        """Scrapea una página de listado de provincia."""
        # En la implementación real, aquí se parsearía el HTML de
        # chilerutempresa.cl. Por ahora, usamos datos de ejemplo
        # para demostrar el pipeline.

        empresas_ejemplo = [
            {
                "nombre": "Inmobiliaria Puerto Varas SpA",
                "rubro": "inmobiliaria",
                "comuna": "Puerto Varas",
            },
            {
                "nombre": "Constructora Lagos del Sur Ltda",
                "rubro": "constructora",
                "comuna": "Puerto Montt",
            },
            {
                "nombre": "Hotel & Cabañas Volcán Osorno",
                "rubro": "hoteleria",
                "comuna": "Puerto Varas",
            },
            {
                "nombre": "Clínica Dental Puerto Varas",
                "rubro": "dentista",
                "comuna": "Puerto Varas",
            },
            {
                "nombre": "Estudio Jurídico Osorno Ltda",
                "rubro": "abogado",
                "comuna": "Osorno",
            },
            {
                "nombre": "Automotriz Valdivia SpA",
                "rubro": "automotriz",
                "comuna": "Valdivia",
            },
            {
                "nombre": "Restaurant Mar y Tierra",
                "rubro": "restaurante",
                "comuna": "Puerto Montt",
            },
            {
                "nombre": "Gimnasio FitZone Osorno",
                "rubro": "gimnasio",
                "comuna": "Osorno",
            },
            {
                "nombre": "Contabilidad Total SpA",
                "rubro": "contador",
                "comuna": "Puerto Varas",
            },
            {
                "nombre": "SpA Bienestar Austral",
                "rubro": "spa",
                "comuna": "Valdivia",
            },
        ]

        result = ScraperResult()
        empresas_list = empresas_ejemplo[:max_por_provincia] if max_por_provincia else empresas_ejemplo
        for emp in empresas_list:
            p = Prospect.create(
                empresa=emp["nombre"],
                rubro=Rubro.from_str(emp["rubro"]).value,
                comuna=emp["comuna"],
                provincia=provincia,
                region="Los Lagos",
                fuente=FuenteProspect.CHILE_RUT.value,
            )
            result.prospects.append(p)
            result.nuevos += 1
            result.total += 1

        # TODO: parse real de chilerutempresa.cl con BeautifulSoup
        log.info(
            "Provincia {p}: {r}",
            p=provincia,
            r=result.resumen,
        )
        return result

    def _scrape_comuna(self, comuna_url: str, comuna: str) -> list[dict]:
        """Scrapea el listado de empresas de una comuna."""
        resp = self._fetch(comuna_url)
        if resp is None:
            return []

        # TODO: parse real con bs4
        empresas = []
        # ... (implementación con BeautifulSoup cuando esté disponible)
        return empresas
