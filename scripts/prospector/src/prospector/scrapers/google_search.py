"""GoogleSearchScraper — Busca el sitio web de una empresa usando Google Search.

Dado un nombre de empresa + ciudad, busca en Google la URL de su sitio web oficial.
Esto permite conectar Yelu (que da nombre+teléfono) con el WebScraper (que extrae emails).

Uso:
    scraper = GoogleSearchScraper()
    sitio = scraper.buscar_sitio_web("Sime Ltda", "Puerto Montt")
    # → "https://www.sime.cl"
"""

from __future__ import annotations

import re
import urllib.parse
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from prospector.core.config import load_config
from prospector.core.logger import get_logger
from prospector.scrapers.base import BaseScraper, ScraperResult

log = get_logger(__name__)


class GoogleSearchScraper(BaseScraper):
    """Busca sitios web de empresas usando Google Search."""

    def __init__(self, delay: float = 1.5, dry_run: bool = False):
        super().__init__(name="google_search", delay=delay, dry_run=dry_run)

    def scrape(self, **kwargs) -> ScraperResult:
        """Interfaz BaseScraper."""
        return ScraperResult()

    def buscar_sitio_web(self, nombre: str, ciudad: str = "", rubro: str = "") -> Optional[str]:
        """Busca en Google el sitio web oficial de una empresa.

        Args:
            nombre: Nombre de la empresa.
            ciudad: Ciudad opcional para refinar.
            rubro: Rubro opcional para refinar.

        Returns:
            URL del sitio web o None si no se encuentra.
        """
        # Construir query
        partes = [nombre, ciudad, rubro or "", "sitio oficial Chile"]
        query = " ".join(p for p in partes if p)
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&hl=es&lr=lang_es"

        log.debug("Buscando web para: {nombre} — {ciudad}", nombre=nombre, ciudad=ciudad)

        try:
            resp = self._fetch(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                },
            )
        except Exception as e:
            log.trace("Error buscando {nombre}: {e}", nombre=nombre, e=str(e)[:80])
            return None

        if resp is None:
            return None

        sitio = self._extraer_primera_url(resp.text, nombre)
        if sitio:
            log.info("  Web encontrada: {nombre} → {sitio}", nombre=nombre, sitio=sitio)
        return sitio

    def _extraer_primera_url(self, html: str, nombre_empresa: str) -> Optional[str]:
        """Extrae la primera URL relevante de resultados de Google."""
        soup = BeautifulSoup(html, "lxml")

        # Google moderno: los resultados están en <a> con href que empieza con /url?q=
        for a in soup.find_all("a", href=True):
            href = a["href"]

            # Saltar resultados de Google propios
            if any(skip in href for skip in [
                "google.com", "youtube.com", "facebook.com", "instagram.com",
                "twitter.com", "linkedin.com", "maps.google",
            ]):
                continue

            # Extraer URL real de /url?q=...
            if href.startswith("/url?q="):
                real_url = href.split("/url?q=")[1].split("&")[0]
                real_url = urllib.parse.unquote(real_url)
                if self._es_url_valida(real_url):
                    return real_url

            # URLs directas
            if href.startswith("http") and not href.startswith("https://www.google"):
                if self._es_url_valida(href):
                    return href

        # Fallback: buscar URLs en texto plano
        urls = re.findall(r'https?://(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/\S*)?', html)
        for u in urls:
            if self._es_url_valida(u):
                return u

        return None

    def _es_url_valida(self, url: str) -> bool:
        """Filtra URLs no deseadas (redes sociales, directorios, etc.)."""
        url_lower = url.lower()
        if any(skip in url_lower for skip in [
            "google.com", "youtube.com", "facebook.com", "instagram.com",
            "twitter.com", "linkedin.com", "maps.google", "yelu.cl",
            "chilerut", "mercadolibre", "yapo.cl", "clasificados",
            "todo.cl", "dondepago", "páginasamarillas",
        ]):
            return False
        if not url_lower.startswith("http"):
            return False
        # Debe tener un dominio válido
        if not re.match(r'https?://[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', url_lower):
            return False
        return True

    def enrichen_prospect(self, prospect) -> tuple[bool, Optional[str]]:
        """Busca el sitio web de un prospecto que no tiene web."""
        if prospect.sitio_web:
            return False, None

        sitio = self.buscar_sitio_web(prospect.empresa, prospect.comuna, prospect.rubro)
        if sitio:
            return True, sitio
        return False, None

    def enrichen_batch(self, prospects: list, limit: int = 0) -> list[tuple]:
        """Busca webs para una lista de prospectos sin web.

        Returns:
            Lista de (prospect, sitio_encontrado, url).
        """
        results = []
        for i, p in enumerate(prospects):
            if limit and i >= limit:
                break
            if p.sitio_web:
                results.append((p, False, None))
                continue
            encontrado, sitio = self.enrichen_prospect(p)
            results.append((p, encontrado, sitio))
            self._rate_limit()
        return results
