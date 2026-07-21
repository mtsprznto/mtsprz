"""GoogleMapsScraper — Extrae negocios reales desde Google Maps con Playwright.

Extrae del panel de resultados (feed) SIN necesidad de click individual:
  - Nombre, rating, reseñas, categoría
  - Teléfono (span.UsdlK)
  - Sitio web (a.lcr4fd con href)

La extracción desde el feed es ~10x más rápida que abrir cada detalle.

Uso:
    scraper = GoogleMapsScraper()
    result = scraper.scrape(query="inmobiliaria Puerto Varas", max_results=30)
    for p in result.prospects:
        print(p.empresa, p.sitio_web, p.telefonos)
"""

from __future__ import annotations

import re
import time
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect, FuenteProspect
from prospector.scrapers.base import BaseScraper, ScraperResult

log = get_logger(__name__)


class GoogleMapsScraper(BaseScraper):
    """Scraper de Google Maps vía Playwright — extrae desde el feed."""

    def __init__(
        self,
        delay: float = 2.0,
        dry_run: bool = False,
        resume: bool = False,
    ):
        super().__init__(name="google_maps", delay=delay, dry_run=dry_run, resume=resume)
        self._pw = None
        self._browser = None
        self._page = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def _ensure_browser(self):
        if self._browser is not None:
            return
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            log.error("Playwright no instalado. Ejecuta: uv add playwright && uv run playwright install chromium")
            raise

        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
        )
        ctx = self._browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="es-CL",
        )
        self._page = ctx.new_page()

    def close(self) -> None:
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()
        super().close()

    # ------------------------------------------------------------------
    # Scrape
    # ------------------------------------------------------------------

    def scrape(self, **kwargs) -> ScraperResult:
        """Scrapea Google Maps extrayendo datos desde el feed.

        Args:
            query: Búsqueda (ej: "inmobiliaria Puerto Varas").
            max_results: Máximo de resultados (default: 30).

        Returns:
            ScraperResult con prospectos.
        """
        query: str = kwargs.get("query", "")
        max_results: int = kwargs.get("max_results", 30)

        if not query:
            log.error("Query requerida")
            return ScraperResult(errores=1)

        log.info("Google Maps: {q} (max={m})", q=query, m=max_results)

        if self.dry_run:
            self._log_dry_run("Scrapearía: {q}", q=query)
            return ScraperResult()

        self._ensure_browser()
        page = self._page

        # Navegar
        search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}/"
        log.debug("Navegando a: {url}", url=search_url)
        try:
            page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        except Exception as e:
            log.error("Error cargando Google Maps: {e}", e=str(e)[:120])
            return ScraperResult(errores=1)

        # Esperar feed
        try:
            page.wait_for_selector('div[role="feed"]', timeout=15000)
        except Exception:
            log.warning("No se encontró feed. Esperando...")
            page.wait_for_timeout(3000)

        time.sleep(2)

        # Scroll para cargar resultados
        self._scroll_results(page, max_results)

        # Extraer desde el feed
        items = page.query_selector_all('div[role="article"]')
        log.info("Items encontrados: {n}", n=len(items))

        prospects = []
        for i, item in enumerate(items):
            if i >= max_results:
                break
            try:
                data = self._extract_feed_item(item)
                if data and data.get("nombre"):
                    p = self._to_prospect(data)
                    if p:
                        prospects.append(p)
                        web_str = f"🌐{p.sitio_web}" if p.sitio_web else (f"📞{p.telefonos[0]}" if p.telefonos else "")
                        log.info("  [{i}/{m}] {name} {extra}",
                                 i=i + 1, m=min(max_results, len(items)), name=p.empresa, extra=web_str)
            except Exception as e:
                log.trace("Error item {i}: {e}", i=i, e=str(e)[:80])
                continue

        log.info("Extraídos {n} prospectos", n=len(prospects))
        return ScraperResult(nuevos=len(prospects), total=len(prospects), prospects=prospects)

    # ------------------------------------------------------------------
    # Scroll
    # ------------------------------------------------------------------

    def _scroll_results(self, page, max_results: int):
        feed = page.query_selector('[role="feed"]')
        if not feed:
            log.warning("No se encontró feed para scroll")
            return
        prev_count = 0
        for _ in range(50):
            feed.evaluate("el => el.scrollBy(0, 3000)")
            time.sleep(0.5)
            items = page.query_selector_all('div[role="article"]')
            count = len(items)
            if count >= max_results + 5:
                break
            if count == prev_count and prev_count > 5:
                break
            prev_count = count

    # ------------------------------------------------------------------
    # Extracción desde feed item (sin click)
    # ------------------------------------------------------------------

    def _extract_feed_item(self, item) -> dict:
        """Extrae nombre, rating, teléfono, website, categoría desde el feed.

        Estructura actual de GMaps (julio 2026):
          <div role="article">
            <a class="hfpxzc" aria-label="Nombre">
            <div class="qBF1Pd fontHeadlineSmall">Nombre</div>
            <span aria-label="5.0 estrellas"><span class="MW4etd">5.0</span></span>
            <span>Categoría</span>
            <span class="UsdlK">9 1234 5678</span>  <!-- teléfono -->
            <a class="lcr4fd S9kvJb" href="https://sitio.cl/">Sitio web</a>
          </div>
        """
        data = {"nombre": "", "rating": None, "reviews": 0, "categoria": "",
                "telefono": "", "website": ""}

        # --- Nombre ---
        nombre_el = item.query_selector(".fontHeadlineSmall")
        if nombre_el:
            data["nombre"] = nombre_el.inner_text().strip()
        if not data["nombre"]:
            # Fallback: aria-label del overlay link
            overlay = item.query_selector("a.hfpxzc")
            if overlay:
                data["nombre"] = (overlay.get_attribute("aria-label") or "").strip()
        if not data["nombre"]:
            return data

        # --- Rating (aria-label con "estrella") ---
        rating_el = item.query_selector('[aria-label*="estrella"]')
        if rating_el:
            aria = rating_el.get_attribute("aria-label") or ""
            nums = re.findall(r"(\d+[.,]?\d*)", aria)
            if len(nums) >= 2:
                data["rating"] = float(nums[0].replace(",", "."))
                data["reviews"] = int(nums[1].replace(".", ""))

        # --- Categoría (primer span de texto después del rating) ---
        # Buscar spans con texto de categoría
        spans = item.query_selector_all("div.W4Efsd span span")
        for span in spans:
            txt = span.inner_text().strip()
            if txt and len(txt) < 50 and txt not in ("·",):
                if not any(kw in txt for kw in ["estrella", "abierto", "cerrado", "horas", "·", "24"]):
                    data["categoria"] = txt
                    break

        # --- Teléfono (span.UsdlK) ---
        phone_span = item.query_selector("span.UsdlK")
        if phone_span:
            data["telefono"] = phone_span.inner_text().strip()

        # --- Sitio web (a.lcr4fd.S9kvJb con href) ---
        web_link = item.query_selector("a.lcr4fd.S9kvJb")
        if web_link:
            href = web_link.get_attribute("href") or ""
            if href and href not in ("#", "") and "google.com" not in href and "aclk" not in href:
                data["website"] = href

        return data

    # ------------------------------------------------------------------
    # Conversión a Prospect
    # ------------------------------------------------------------------

    def _to_prospect(self, item: dict) -> Optional[Prospect]:
        nombre = item.get("nombre", "").strip()
        if not nombre:
            return None

        from prospector.validators.phone import normalizar_telefono

        telefonos = []
        tel_raw = item.get("telefono", "")
        if tel_raw:
            tel = normalizar_telefono(tel_raw)
            if tel:
                telefonos.append(tel)

        rubro = self._inferir_rubro(nombre + " " + item.get("categoria", ""))

        return Prospect.create(
            empresa=nombre,
            rubro=rubro,
            telefonos=telefonos,
            sitio_web=item.get("website", ""),
            google_maps_url=f"https://www.google.com/maps/search/{nombre.replace(' ', '+')}/",
            google_rating=item.get("rating"),
            google_reviews=item.get("reviews", 0),
            fuente=FuenteProspect.GOOGLE_MAPS.value,
        )

    # ------------------------------------------------------------------
    # Inferencia de rubro
    # ------------------------------------------------------------------

    RUBRO_KEYWORDS = {
        "inmobiliaria": ["inmobiliaria", "corredora", "propiedades", "bienes raíces", "real estate"],
        "abogado": ["abogado", "jurídico", "estudio jurídico", "bufete", "notaria", "notaría"],
        "dentista": ["dentista", "dental", "odontologia", "odontología", "clinica dental"],
        "restaurante": ["restaurant", "restaurante", "comida", "cafetería", "sushi", "pizza", "bar"],
        "hoteleria": ["hotel", "hostal", "cabaña", "cabañas", "lodge", "alojamiento", "hospedaje"],
        "constructora": ["constructora", "construcción", "ingeniería", "obra"],
        "automotriz": ["taller", "automotriz", "mecánico", "auto", "neumático", "lubricentro"],
        "gimnasio": ["gimnasio", "fit", "crossfit", "yoga", "pilates", "entrenamiento"],
        "spa": ["spa", "masajes", "belleza", "estética", "peluqueria", "salón"],
        "turismo": ["turismo", "tour", "aventura", "viajes", "excursión", "transporte turístico"],
        "contador": ["contador", "contabilidad", "auditoría"],
        "tienda": ["tienda", "almacén", "minimarket", "supermercado", "comercio"],
    }

    def _inferir_rubro(self, texto: str) -> str:
        texto_lower = texto.lower()
        for rubro, keywords in self.RUBRO_KEYWORDS.items():
            for kw in keywords:
                if kw in texto_lower:
                    return rubro
        return "otro"
