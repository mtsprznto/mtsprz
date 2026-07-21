"""YeluScraper — Extrae negocios reales desde Yelu.cl (directorio chileno).

Estructura HTML real de Yelu.cl:
  <div class="company g_0" data-cmpid="...">
    <h3><a href="/company/ID/NOMBRE">NOMBRE</a></h3>
    <div class="address">DIRECCIÓN, <b>CIUDAD</b>, Chile</div>
    <div class="s"><i class="fa fa-phone"></i><span><b>TELÉFONO</b></span></div>
    <div class="rate">4.5</div>
    <div class="company_reviews">2 Reseñas</div>
  </div>

Extrae: nombre, teléfono, dirección, rating.
Los emails REQUIEREN abrir cada perfil individual (no implementado aún).
"""

from __future__ import annotations

import re
from typing import Optional

from bs4 import BeautifulSoup

from prospector.core.logger import get_logger
from prospector.core.models import Prospect, FuenteProspect
from prospector.scrapers.base import BaseScraper, ScraperResult

log = get_logger(__name__)

# Ciudades objetivo en la Región de Los Lagos + Los Ríos
CIUDADES = {
    "puerto_varas": "Puerto Varas",
    "puerto_montt": "Puerto Montt",
    "osorno": "Osorno",
    "valdivia": "Valdivia",
    "frutillar": "Frutillar",
    "llanquihue": "Llanquihue",
    "calbuco": "Calbuco",
    "ancud": "Ancud",
    "castro": "Castro",
    "quellon": "Quellón",
    "rio_negro": "Río Negro",
    "purranque": "Purranque",
    "la_union": "La Unión",
    "paillaco": "Paillaco",
    "rio_bueno": "Río Bueno",
    "lago_ranco": "Lago Ranco",
    "puyehue": "Puyehue",
}

BASE_URL = "https://www.yelu.cl"


class YeluScraper(BaseScraper):
    """Scraper para Yelu.cl — datos reales de negocios chilenos."""

    def __init__(self, dry_run: bool = False, resume: bool = False):
        super().__init__(name="yelu", delay=1.5, dry_run=dry_run, resume=resume)

    def scrape(self, **kwargs) -> ScraperResult:
        """Scrapea Yelu.cl por ciudad.

        Args:
            ciudades: Lista de slugs de ciudades.
            max_por_ciudad: Máx resultados por ciudad (0 = sin límite, default 50).

        Returns:
            ScraperResult con prospectos en .prospects.
        """
        ciudades = kwargs.get("ciudades", list(CIUDADES.keys()))
        max_por_ciudad = kwargs.get("max_por_ciudad", 50)

        result_total = ScraperResult()
        all_prospects: list[Prospect] = []

        for city_slug in ciudades:
            if city_slug not in CIUDADES:
                log.warning("Ciudad desconocida: {c}", c=city_slug)
                continue
            ciudad = CIUDADES[city_slug]
            log.info("Scrapeando Yelu: {ciudad}", ciudad=ciudad)

            if self.dry_run:
                self._log_dry_run("Scrapearía {ciudad}", ciudad=ciudad)
                continue

            page = 1
            while True:
                page_url = f"{BASE_URL}/location/{city_slug}" if page == 1 else f"{BASE_URL}/location/{city_slug}?page={page}"
                result = self._scrape_page(page_url, ciudad)
                all_prospects.extend(result.prospects)
                result_total += result

                if not result.prospects or len(result.prospects) < 20:
                    break
                if max_por_ciudad and len(all_prospects) >= max_por_ciudad:
                    break
                page += 1
                if page > 20:
                    break

        if all_prospects:
            result_total.prospects = all_prospects[:max_por_ciudad] if max_por_ciudad else all_prospects
            log.info("Yelu total: {n} prospectos de {c} ciudades", n=len(result_total.prospects), c=len(ciudades))

        return result_total

    def _scrape_page(self, url: str, ciudad: str) -> ScraperResult:
        """Scrapea una página de listado de Yelu."""
        resp = self._fetch(url)
        if resp is None:
            return ScraperResult(errores=1)

        soup = BeautifulSoup(resp.text, "lxml")
        cards = soup.select("div.company")
        prospects = []

        for card in cards:
            try:
                p = self._extract_card(card, ciudad)
                if p:
                    prospects.append(p)
            except Exception as e:
                log.trace("Error en card: {e}", e=str(e)[:80])
                continue

        return ScraperResult(nuevos=len(prospects), total=len(prospects), prospects=prospects)

    def _extract_card(self, card, ciudad: str) -> Optional[Prospect]:
        """Extrae datos de una tarjeta .company de Yelu."""
        # --- Nombre ---
        name_a = card.select_one("h3 a")
        if not name_a:
            return None
        nombre = name_a.get_text(strip=True)
        if not nombre or len(nombre) < 2:
            return None

        # --- Dirección ---
        addr_div = card.select_one("div.address")
        direccion = addr_div.get_text(" ", strip=True) if addr_div else ""

        # --- Teléfono ---
        tel_span = card.select_one(".s i.fa-phone + span b")
        telefono_raw = tel_span.get_text(strip=True) if tel_span else ""
        telefonos = []
        if telefono_raw:
            from prospector.validators.phone import normalizar_telefono
            tel = normalizar_telefono(telefono_raw)
            if tel:
                telefonos.append(tel)

        # --- Rating ---
        rating_el = card.select_one("div.rate")
        rating = None
        if rating_el:
            try:
                rating = float(rating_el.get_text(strip=True))
            except ValueError:
                pass

        reviews_el = card.select_one("div.company_reviews")
        reviews = 0
        if reviews_el:
            txt = reviews_el.get_text(strip=True)
            nums = re.findall(r"\d+", txt)
            if nums:
                reviews = int(nums[0])

        prospect = Prospect.create(
            empresa=nombre,
            rubro="otro",
            comuna=ciudad,
            direccion=direccion,
            telefonos=telefonos,
            google_rating=rating,
            google_reviews=reviews,
            fuente=FuenteProspect.AMARILLAS.value,
        )
        return prospect
