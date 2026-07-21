"""WebScraper — Visita sitios web de empresas y extrae emails, teléfonos y redes.

Extrae:
  - Emails (mailto: + regex en texto)
  - Teléfonos chilenos (+56 9 XXXX XXXX)
  - Redes sociales (Facebook, Instagram, LinkedIn)
  - Título del sitio

Uso:
    scraper = WebScraper()
    data = scraper.scrape_website("https://ejemplo.cl")
    # data = {"emails": [...], "telefonos": [...], "redes": {...}, "titulo": "..."}
"""

from __future__ import annotations

import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from prospector.core.logger import get_logger
from prospector.core.models import Prospect
from prospector.scrapers.base import BaseScraper, ScraperResult

log = get_logger(__name__)

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

PHONE_RE = re.compile(
    r"(\+?56\s?0?9\s?\d{4}\s?\d{4})"
    r"|(09\s?\d{4}\s?\d{4})"
)

# Falsos positivos comunes en emails
EMAIL_BLACKLIST = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg",
    ".css", ".js", ".ico", "@example.com",
    "@domain.com", "@email.com", "@test.com",
    "@mail.com", "@yopmail.com", "@temp.com",
    "png", "jpg", "jpeg",
}


class WebScraper(BaseScraper):
    """Scraper de sitios web para extraer contactos."""

    def __init__(self, delay: float = 1.0, timeout: int = 15, dry_run: bool = False):
        super().__init__(name="web", delay=delay, timeout=timeout, dry_run=dry_run)

    def scrape(self, **kwargs) -> ScraperResult:
        """Interfaz BaseScraper — procesa una lista de URLs.

        Args:
            urls: Lista de URLs a scrapear.

        Returns:
            ScraperResult con prospectos (simulado).
        """
        urls: list[str] = kwargs.get("urls", [])
        results = []
        for url in urls:
            data = self.scrape_website(url)
            results.append(data)
        return ScraperResult(total=len(results))

    def scrape_website(self, url: str) -> dict:
        """Visita un sitio web y extrae contactos.

        Args:
            url: URL completa (https://...).

        Returns:
            Dict con emails, telefonos, redes, titulo.
        """
        result = {"emails": [], "telefonos": [], "redes": {}, "titulo": "", "error": ""}

        if not url.startswith("http"):
            url = f"https://{url}"

        resp = self._fetch(url)
        if resp is None:
            result["error"] = "No se pudo acceder"
            return result

        try:
            soup = BeautifulSoup(resp.text, "lxml")

            # --- Título ---
            title_tag = soup.find("title")
            if title_tag:
                result["titulo"] = title_tag.get_text(strip=True)[:120]

            # --- Emails desde mailto: ---
            emails = set()
            for a_tag in soup.find_all("a", href=re.compile(r"^mailto:", re.I)):
                email = a_tag["href"].replace("mailto:", "").split("?")[0].strip()
                if "@" in email and not any(b in email for b in EMAIL_BLACKLIST):
                    emails.add(email.lower())

            # --- Emails desde texto HTML ---
            for match in EMAIL_RE.finditer(resp.text):
                e = match.group(0).lower().strip()
                if not any(b in e for b in EMAIL_BLACKLIST):
                    emails.add(e)

            result["emails"] = sorted(emails)

            # --- Teléfonos ---
            telefonos = set()
            for match in PHONE_RE.finditer(resp.text):
                tel = match.group(0).strip()
                from prospector.validators.phone import normalizar_telefono
                norm = normalizar_telefono(tel)
                if norm:
                    telefonos.add(norm)
            result["telefonos"] = sorted(telefonos)

            # --- Redes sociales ---
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"].lower()
                if "facebook.com/" in href and "sharer" not in href and "share" not in href:
                    result["redes"]["facebook"] = a_tag["href"]
                elif "instagram.com/" in href:
                    result["redes"]["instagram"] = a_tag["href"]
                elif "linkedin.com/company/" in href:
                    result["redes"]["linkedin"] = a_tag["href"]

            if emails:
                log.info("  {url}: {n} emails encontrados", url=url, n=len(emails))

        except Exception as e:
            log.trace("Error parseando {url}: {e}", url=url, e=str(e)[:80])
            result["error"] = str(e)[:100]

        return result

    def enrichen_prospect(self, prospect: Prospect) -> Prospect:
        """Visita el sitio web del prospecto y enriquece sus datos."""
        if not prospect.sitio_web:
            return prospect

        log.info("Extrayendo contactos de: {url}", url=prospect.sitio_web)
        data = self.scrape_website(prospect.sitio_web)

        updates = {}

        nuevos_emails = [e for e in data["emails"] if e not in prospect.emails]
        if nuevos_emails:
            updates["emails"] = prospect.emails + nuevos_emails
            log.info("  +{n} emails: {e}", n=len(nuevos_emails), e=", ".join(nuevos_emails[:3]))

        nuevos_tels = [t for t in data["telefonos"] if t not in prospect.telefonos]
        if nuevos_tels:
            updates["telefonos"] = prospect.telefonos + nuevos_tels
            log.info("  +{n} teléfonos: {t}", n=len(nuevos_tels), t=", ".join(nuevos_tels[:2]))

        redes = dict(prospect.redes)
        for red, url in data["redes"].items():
            if red not in redes:
                redes[red] = url
        if redes != prospect.redes:
            updates["redes"] = redes

        if not updates:
            log.info("  Sin datos nuevos")

        return prospect.model_copy(update=updates)

    def enrichen_batch(self, prospects: list[Prospect]) -> list[Prospect]:
        """Enriquece una lista de prospectos desde sus sitios web."""
        result = []
        for p in prospects:
            enriched = self.enrichen_prospect(p)
            result.append(enriched)
            self._rate_limit()
        return result
