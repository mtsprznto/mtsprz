"""DigitalPresenceEnricher — Analiza la presencia digital de un prospecto.

Para cada prospecto, verifica:
  - Si tiene sitio web (HTTP check)
  - Velocidad de carga aproximada
  - Si tiene Google Business Profile (GMB)
  - Presencia en Facebook, Instagram
  - Calcula un score digital 0-100
"""

from __future__ import annotations

import re
import time
from typing import Optional

import httpx

from prospector.core.logger import get_logger
from prospector.core.models import Prospect, SenalesDigitales

log = get_logger(__name__)


class DigitalPresenceEnricher:
    """Enriquece prospectos con análisis de presencia digital."""

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self._client = httpx.Client(
            timeout=httpx.Timeout(timeout),
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
                    " (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
            },
        )

    def enrichen(self, prospect: Prospect) -> Prospect:
        """Analiza y actualiza las señales digitales de un prospecto."""
        senales = SenalesDigitales()

        # --- Sitio web ---
        if prospect.sitio_web:
            web_info = self._check_website(prospect.sitio_web)
            senales.has_website = web_info["exists"]
            senales.site_speed_ms = web_info.get("speed_ms")

        # --- Google Business Profile ---
        if prospect.google_maps_url or prospect.sitio_web:
            senales.has_gmb = self._check_gmb(prospect)

        # --- Redes sociales ---
        if prospect.redes:
            senales.has_facebook = "facebook" in str(prospect.redes).lower()
            senales.has_instagram = "instagram" in str(prospect.redes).lower()
        else:
            # Intentar encontrar redes desde el nombre
            redes = self._find_social(prospect.empresa)
            senales.has_facebook = redes.get("facebook", False)
            senales.has_instagram = redes.get("instagram", False)

        # --- Calcular score ---
        senales.score = self._calculate_score(senales)

        return prospect.model_copy(update={"senales_digitales": senales})

    def enrichen_batch(self, prospects: list[Prospect]) -> list[Prospect]:
        """Enriquece una lista de prospectos."""
        result = []
        for p in prospects:
            result.append(self.enrichen(p))
            time.sleep(0.2)  # rate limit
        return result

    # ------------------------------------------------------------------
    # Checks individuales
    # ------------------------------------------------------------------

    def _check_website(self, url: str) -> dict:
        """Verifica si un sitio web responde y mide velocidad."""
        if not url.startswith("http"):
            url = f"https://{url}"

        try:
            start = time.time()
            resp = self._client.get(url)
            elapsed_ms = int((time.time() - start) * 1000)

            if resp.status_code < 400:
                return {"exists": True, "speed_ms": elapsed_ms, "status": resp.status_code}
            return {"exists": False, "speed_ms": None, "status": resp.status_code}
        except (httpx.HTTPError, httpx.TimeoutException, Exception) as e:
            log.trace("Website check falló para {url}: {e}", url=url, e=str(e)[:80])
            return {"exists": False, "speed_ms": None, "status": None}

    def _check_gmb(self, prospect: Prospect) -> bool:
        """Determina si probablemente tiene Google Business Profile."""
        if prospect.google_maps_url:
            return True
        # Si tiene reseñas/rating en nuestros datos, asumimos que tiene GMB
        if prospect.google_rating is not None and prospect.google_reviews > 0:
            return True
        if prospect.google_rating is not None:
            return True
        return False

    def _find_social(self, empresa: str) -> dict:
        """Busca presencia en redes por nombre (placeholder)."""
        # TODO: buscar en redes sociales por API o scraping
        return {"facebook": False, "instagram": False}

    # ------------------------------------------------------------------
    # Score calculation
    # ------------------------------------------------------------------

    def _calculate_score(self, senales: SenalesDigitales) -> int:
        """Calcula score digital 0-100 basado en señales."""
        score = 0

        # Website (0-35 pts)
        if senales.has_website:
            score += 25
            if senales.site_speed_ms and senales.site_speed_ms < 2000:
                score += 10  # sitio rápido
            elif senales.site_speed_ms and senales.site_speed_ms < 4000:
                score += 5  # sitio moderado

        # Google Business (0-30 pts)
        if senales.has_gmb:
            score += 30

        # Redes sociales (0-35 pts)
        if senales.has_facebook:
            score += 15
        if senales.has_instagram:
            score += 20

        return min(score, 100)

    def close(self) -> None:
        self._client.close()
