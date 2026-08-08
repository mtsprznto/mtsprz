"""FeriasLosLagosScrapers — Prospección de ferias libres y artesanales de la Región de Los Lagos.

Dos scrapers complementarios que ENRIQUECEN una semilla verificada manualmente
(data/ferias_target.json) — no re-descubren ferias:

  1. FeriasRegistrosScraper — consulta registros19862.gob.cl (RUT → ficha):
     razón social, representante legal, personalidad jurídica, fecha de constitución.

  2. FeriasPrensaScraper — busca teléfonos y correos de cada feria en Google,
     priorizando prensa local (soychile.cl, elrepuertero.cl, ...) donde las ferias
     publican convocatorias y contactos. Con --registros precarga RUTs de ferias
     sociales (contacto de representante).

Flujo recomendado:
    uv run prospector scrape ferias --seed data/ferias_target.json --registros --prensa
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Optional
from urllib.parse import quote, unquote, urlparse

from bs4 import BeautifulSoup

from prospector.core.logger import get_logger
from prospector.core.models import FuenteProspect, Prospect, Rubro
from prospector.scrapers.base import BaseScraper, ScraperResult
from prospector.validators.phone import es_telefono_valido, normalizar_telefono

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers compartidos
# ---------------------------------------------------------------------------

RUT_RE = re.compile(r"\b\d{1,2}\.\d{3}\.\d{3}[-–—]\s?[0-9kK]\b")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# Patrones de teléfono chileno (móvil y fijo)
TEL_MOVIL_RE = re.compile(r"(?:\+?56\s?)?9\s?\d{4}\s?\d{4}")
TEL_FIJO_RE = re.compile(r"(?:\+?56\s?)?\d{2,3}\s?\d{4}\s?\d{4}")

# Pool de User-Agents para rotar (misma técnica que google_search)
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
]
_ua_index = 0


def _next_user_agent() -> str:
    """Retorna el siguiente User-Agent del pool (round-robin)."""
    global _ua_index
    ua = _USER_AGENTS[_ua_index % len(_USER_AGENTS)]
    _ua_index += 1
    return ua


def _normalizar_rut(rut: str) -> str:
    """Normaliza un RUT a formato registros19862: '76.144.204-8' → '76144204-8'."""
    r = rut.strip().upper().replace(".", "").replace(" ", "").replace("/", "-")
    if "-" not in r and len(r) > 1:
        r = r[:-1] + "-" + r[-1]
    return r


def _normalizar_nombre(nombre: str) -> str:
    """Nombre a clave de comparación: 'Feria de las Pulgas' → 'feria de las pulgas'."""
    n = unicodedata.normalize("NFKD", nombre.lower())
    n = "".join(c for c in n if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", n).strip()


def _es_feria(nombre: str) -> bool:
    """True si el nombre parece de feria (usa clave normalizada)."""
    n = _normalizar_nombre(nombre)
    if not n:
        return False
    claves = ["feria", "pueblito artesanal", "fabricantes", "artesanos"]
    return any(k in n for k in claves)


# ---------------------------------------------------------------------------
# 1. FeriasRegistrosScraper — RUT → ficha en registros19862.gob.cl
# ---------------------------------------------------------------------------

class FeriasRegistrosScraper(BaseScraper):
    """Enriquece ferias desde registros19862.gob.cl (Ley 19.862, SII).

    Consulta la ficha pública por RUT y extrae razón social, representante
    legal, personalidad jurídica y fecha de constitución.
    """

    BASE_URL = "https://registros19862.gob.cl/institucion"

    def __init__(
        self,
        seed_file: Optional[Path] = None,
        delay: float = 1.5,
        dry_run: bool = False,
        resume: bool = False,
    ):
        super().__init__(name="ferias_registros", delay=delay, dry_run=dry_run, resume=resume)
        self._seed_file = seed_file or self._resolver_seed()
        self._procesados: set[str] = set()
        self._init_checkpoint(self.name)

    # ------------------------------------------------------------------
    # Semilla
    # ------------------------------------------------------------------

    def _resolver_seed(self) -> Path:
        """Resuelve la semilla: --seed > data/ferias_target.json (cwd) > default del paquete."""
        candidatos = [
            Path("data/ferias_target.json"),
            Path(__file__).resolve().parent.parent.parent.parent / "data" / "ferias_target.json",
        ]
        for c in candidatos:
            if c.exists():
                return c
        raise FileNotFoundError(
            "Semilla de ferias no encontrada — usa --seed data/ferias_target.json"
        )

    def _cargar_semilla(self) -> list[dict]:
        with open(self._seed_file, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            data = data.get("ferias", [])
        log.info("Semilla cargada: {n} ferias desde {f}", n=len(data), f=self._seed_file)
        return data

    def _resume_from(self, data: dict) -> None:
        super()._resume_from(data)
        if "procesados" in data:
            self._procesados = set(data["procesados"])

    # ------------------------------------------------------------------
    # Scraping principal
    # ------------------------------------------------------------------

    def scrape(self, solo_sociales: bool = False, **kwargs) -> ScraperResult:
        """Consulta la ficha de cada feria de la semilla en registros19862.

        Args:
            solo_sociales: filtra la semilla a ferias tipo 'social'.
        """
        semilla = self._cargar_semilla()
        if solo_sociales:
            semilla = [f for f in semilla if f.get("tipo") == "social"]
        log.info("FeriasRegistros — {n} ferias (solo_sociales={s})", n=len(semilla), s=solo_sociales)

        if self.dry_run:
            self._log_dry_run("Consultaría ficha de {n} ferias en registros19862.gob.cl", n=len(semilla))
            return ScraperResult(prospects=[])

        pendientes = [f for f in semilla if _normalizar_rut(f["rut"]) not in self._procesados]
        if self._procesados:
            log.info("Reanudando: {n} ferias ya procesadas", n=len(self._procesados))

        prospects: list[Prospect] = []
        for i, feria in enumerate(pendientes, 1):
            nombre = feria["nombre"]
            rut = _normalizar_rut(feria["rut"])
            log.info("[{i}/{n}] {feria} — {rut}", i=i, n=len(pendientes), feria=nombre, rut=rut)
            self._rate_limit()

            ficha = self._consultar_ficha(rut)

            self._procesados.add(rut)
            self._checkpoint_hit({"procesados": sorted(self._procesados)})

            if not ficha:
                log.info("  Sin ficha en registros — skip")
                continue

            prospects.append(self._build_prospect(feria, rut, ficha))
            self._stats["nuevos"] += 1
            log.info("  Ficha: {rs} | rep={rep}",
                     rs=ficha.get("razon_social", ""), rep=ficha.get("representante_nombre", ""))

        self._clear_checkpoint()
        return ScraperResult(
            nuevos=self._stats["nuevos"],
            duplicados=self._stats["duplicados"],
            errores=self._stats["errores"],
            total=len(prospects),
            prospects=prospects,
        )

    def _build_prospect(self, feria: dict, rut: str, ficha: dict) -> Prospect:
        nombre = ficha.get("razon_social", "") or feria["nombre"]
        return Prospect.create(
            empresa=nombre,
            rut=rut,
            rubro=Rubro.FERIA_LIBRE.value,
            comuna=feria["comuna"],
            provincia=feria.get("provincia", ""),
            region="Los Lagos",
            sitio_web=feria.get("web", ""),
            dirigente=ficha.get("representante_nombre", ""),
            cargo_dirigente="Representante legal",
            rut_org=rut,
            personalidad_juridica=ficha.get("tipo", ""),
            fecha_constitucion=ficha.get("fecha_constitucion", ""),
            contexto=f"Feria {feria['nombre']} — {feria['comuna']} ({feria.get('tipo', '')})",
            notas=ficha.get("titular", ""),
            fuente=FuenteProspect.FERIAS_REGISTROS.value,
        )

    # ------------------------------------------------------------------
    # Ficha registros19862
    # ------------------------------------------------------------------

    def _rotar_user_agent(self) -> str:
        return _next_user_agent()

    def _consultar_ficha(self, rut: str) -> Optional[dict]:
        """GET ficha pública por RUT y parsea los campos de interés."""
        url = f"{self.BASE_URL}/{rut}"
        try:
            resp = self._fetch(
                url,
                headers={"User-Agent": self._rotar_user_agent()},
                retry_on=[429, 500, 502, 503, 504],
            )
        except Exception as e:
            log.trace("Error ficha {rut}: {e}", rut=rut, e=str(e)[:80])
            return None
        if resp is None:
            return None
        return self._parsear_ficha(resp.text)

    def _parsear_ficha(self, html: str) -> Optional[dict]:
        """Extrae razón social, representante, personalidad jurídica y fecha."""
        soup = BeautifulSoup(html, "lxml")
        texto = soup.get_text(" ", strip=True)

        ficha: dict = {}

        # Razón social: primer H1/H2, o <title> como fallback
        h1 = soup.find("h1") or soup.find("h2")
        if h1 and h1.get_text(strip=True):
            ficha["razon_social"] = h1.get_text(strip=True)
        if not ficha.get("razon_social") and soup.title:
            ficha["razon_social"] = soup.title.get_text(strip=True).split("|")[0].split(" - ")[0].strip()

        # Representante legal + RUT
        rep = self._buscar_campo(soup, "representante")
        if rep:
            ficha["representante_nombre"] = rep
            m = RUT_RE.search(texto)
            if m:
                ficha["representante_rut"] = _normalizar_rut(m.group(0))

        # Personalidad jurídica / tipo de institución
        tipo = self._buscar_campo(soup, "personalidad jurídica") or self._buscar_campo(soup, "tipo")
        if tipo:
            ficha["tipo"] = tipo

        # Fecha de constitución
        fecha = self._buscar_campo(soup, "constitución") or self._buscar_campo(soup, "constitucion")
        if fecha:
            ficha["fecha_constitucion"] = fecha

        # Titular (quién registró la institución)
        titular = self._buscar_campo(soup, "titular")
        if titular:
            ficha["titular"] = titular

        return ficha if ficha.get("razon_social") else None

    def _buscar_campo(self, soup: BeautifulSoup, label: str) -> str:
        """Busca un label en tabla/ficha y retorna el valor siguiente."""
        for tag in soup.find_all(["td", "th", "dt", "div", "h3", "span"]):
            t = tag.get_text(strip=True)
            if t and t.lower().startswith(label):
                nxt = tag.find_next(["td", "dd", "div", "span", "p"])
                if nxt:
                    val = nxt.get_text(" ", strip=True)
                    if val and val.lower() != t.lower():
                        return val
        return ""


# ---------------------------------------------------------------------------
# 2. FeriasPrensaScraper — Google + prensa local → teléfonos y correos
# ---------------------------------------------------------------------------

PRENSA_DOMAINS = {
    "soychile.cl",
    "elsurdigital.cl",
    "elrepuertero.cl",
    "australosorno.cl",
    "soyvaldivia.cl",
}


class FeriasPrensaScraper(BaseScraper):
    """Busca teléfonos y correos de cada feria en Google + prensa local.

    Las ferias sociales publican convocatorias con contactos en prensa local;
    con --registros se precargan sus RUTs para enriquecer con el representante.
    """

    QUERIES_BASE = [
        '"{feria}" {comuna} telefono contacto',
        '"{feria}" {comuna} correo',
        "feria libre {comuna}",
        "pueblito artesanal {comuna}",
        "feria de las pulgas {comuna}",
    ]

    def __init__(
        self,
        seed_file: Optional[Path] = None,
        delay: float = 0.6,
        dry_run: bool = False,
        resume: bool = False,
    ):
        super().__init__(name="ferias_prensa", delay=delay, dry_run=dry_run, resume=resume)
        self._seed_file = seed_file or self._resolver_seed()
        self._procesados: set[str] = set()
        self._rut_conocidos: dict[str, dict] = {}  # rut → datos de registros19862
        self._prensa_domains = set(PRENSA_DOMAINS)
        self._init_checkpoint(self.name)
        self._semilla = self._cargar_semilla()

    # ------------------------------------------------------------------
    # Semilla
    # ------------------------------------------------------------------

    def _resolver_seed(self) -> Path:
        candidatos = [
            Path("data/ferias_target.json"),
            Path(__file__).resolve().parent.parent.parent.parent / "data" / "ferias_target.json",
        ]
        for c in candidatos:
            if c.exists():
                return c
        raise FileNotFoundError(
            "Semilla de ferias no encontrada — usa --seed data/ferias_target.json"
        )

    def _cargar_semilla(self) -> list[dict]:
        with open(self._seed_file, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            data = data.get("ferias", [])
        log.info("Semilla cargada: {n} ferias desde {f}", n=len(data), f=self._seed_file)
        return data

    def _resume_from(self, data: dict) -> None:
        super()._resume_from(data)
        if "procesados" in data:
            self._procesados = set(data["procesados"])

    # ------------------------------------------------------------------
    # Pre-carga de registros
    # ------------------------------------------------------------------

    def _ferias_sociales(self) -> dict[str, dict]:
        """RUTs de ferias tipo social → {rut: {nombre, web}}."""
        sociales: dict[str, dict] = {}
        for f in self._semilla:
            if f.get("tipo") == "social" and f.get("rut"):
                sociales[_normalizar_rut(f["rut"])] = {"nombre": f["nombre"], "web": f.get("web", "")}
        return sociales

    def _precargar_registros(self) -> None:
        """Pre-carga RUTs de ferias sociales desde registros19862 → contacto representante."""
        registros = FeriasRegistrosScraper(seed_file=self._seed_file, dry_run=self.dry_run)
        try:
            result = registros.scrape(solo_sociales=True)
        finally:
            registros.close()
        for p in result.prospects:
            if not p.rut:
                continue
            self._rut_conocidos[p.rut] = {
                "razon_social": p.empresa,
                "representante": p.dirigente,
                "tipo": p.personalidad_juridica,
                "fecha_constitucion": p.fecha_constitucion,
            }
        log.info("Registros pre-cargados: {n} RUTs de ferias sociales", n=len(self._rut_conocidos))

    def _autoincluir_dominios_sociales(self) -> None:
        """Suma los dominios web de ferias sociales a la lista de prensa."""
        for info in self._ferias_sociales().values():
            web = info.get("web", "")
            if not web:
                continue
            try:
                dominio = urlparse(web).netloc or web
                dominio = dominio.lower()
                if dominio.startswith("www."):
                    dominio = dominio[4:]
                if dominio:
                    self._prensa_domains.add(dominio)
            except ValueError:
                continue
        log.debug("Dominios prensa: {d}", d=sorted(self._prensa_domains))

    # ------------------------------------------------------------------
    # Scraping principal
    # ------------------------------------------------------------------

    def scrape(self, limit: int = 0, con_prensa: bool = False, con_registros: bool = False) -> ScraperResult:
        """Busca contactos (teléfono/email) de cada feria en Google.

        Args:
            limit: máx ferias a procesar (0 = todas).
            con_prensa: filtra resultados a dominios de prensa local (y ferias sociales).
            con_registros: pre-carga RUTs de ferias sociales desde registros19862.
        """
        if con_registros:
            self._precargar_registros()
        if con_prensa:
            self._autoincluir_dominios_sociales()

        if self.dry_run:
            self._log_dry_run(
                "Buscaría contactos de {n} ferias (prensa={p}, registros={r})",
                n=len(self._semilla), p=con_prensa, r=con_registros,
            )
            return ScraperResult(prospects=[])

        pendientes = [
            f for f in self._semilla
            if _normalizar_nombre(f["nombre"]) not in self._procesados
        ]
        if limit > 0:
            pendientes = pendientes[:limit]
        log.info("FeriasPrensa — {n} ferias a procesar (limit={l}, prensa={p})",
                 n=len(pendientes), l=limit or "∞", p=con_prensa)
        if self._procesados:
            log.info("Reanudando: {n} ferias ya procesadas", n=len(self._procesados))

        prospects: list[Prospect] = []
        for i, feria in enumerate(pendientes, 1):
            nombre = feria["nombre"]
            comuna = feria["comuna"]
            log.info("[{i}/{n}] {feria} — {comuna}", i=i, n=len(pendientes), feria=nombre, comuna=comuna)

            contacto = self._buscar_contacto_feria(nombre, comuna, con_prensa, feria.get("web", ""))

            self._procesados.add(_normalizar_nombre(nombre))
            self._checkpoint_hit({"procesados": sorted(self._procesados)})

            if not contacto["telefonos"] and not contacto["emails"]:
                log.info("  Sin contactos — skip")
                self._stats["duplicados"] += 1
                continue

            prospects.append(self._build_prospect(feria, contacto))
            self._stats["nuevos"] += 1
            log.info("  Contactos: {t} tel, {e} email, {u} urls",
                     t=len(contacto["telefonos"]), e=len(contacto["emails"]), u=len(contacto["urls"]))

        self._clear_checkpoint()
        return ScraperResult(
            nuevos=self._stats["nuevos"],
            duplicados=self._stats["duplicados"],
            errores=self._stats["errores"],
            total=len(prospects),
            prospects=prospects,
        )

    def _build_prospect(self, feria: dict, contacto: dict) -> Prospect:
        nombre = feria["nombre"]
        prospect = Prospect.create(
            empresa=nombre,
            comuna=feria["comuna"],
            provincia=feria.get("provincia", ""),
            region="Los Lagos",
            telefonos=sorted(set(contacto["telefonos"]))[:3],
            emails=sorted(set(contacto["emails"]))[:3],
            sitio_web=contacto["urls"][0] if contacto["urls"] else feria.get("web", ""),
            contexto=f"Feria {nombre} — {feria['comuna']} ({feria.get('tipo', '')})",
            url_noticia=contacto["urls"][0] if contacto["urls"] else "",
            fuente=FuenteProspect.FERIAS_PRENSA.value,
        )
        # Enriquecimiento desde registros19862 (si --registros): RUT + representante
        rut = feria.get("rut", "")
        if rut:
            rut_norm = _normalizar_rut(rut)
            reg = self._rut_conocidos.get(rut_norm)
            if reg:
                prospect.empresa = reg["razon_social"]
                prospect.rut = rut_norm
                prospect.rut_org = rut_norm
                prospect.dirigente = reg["representante"]
                prospect.personalidad_juridica = reg["tipo"]
                prospect.fecha_constitucion = reg["fecha_constitucion"]
        return prospect

    # ------------------------------------------------------------------
    # Búsqueda en Google + extracción de contactos
    # ------------------------------------------------------------------

    def _construir_queries(self, nombre: str, comuna: str) -> list[str]:
        return [q.format(feria=nombre, comuna=comuna) for q in self.QUERIES_BASE]

    def _buscar_contacto_feria(self, nombre: str, comuna: str, con_prensa: bool,
                               web_conocida: str = "") -> dict:
        """Busca teléfonos/correos de una feria: web conocida primero, luego buscador.

        Fast-path: si la semilla trae `web`, se usa como fuente directa (sin
        depender del buscador). Luego Google → DDG para prensa/contactos extra.
        """
        contacto: dict = {"telefonos": [], "emails": [], "urls": []}

        if web_conocida:
            self._rate_limit()
            log.debug("  Web conocida: {u}", u=web_conocida)
            datos = self._buscar_contactos(web_conocida)
            contacto["urls"].append(web_conocida)
            contacto["telefonos"].extend(datos["telefonos"])
            contacto["emails"].extend(datos["emails"])
            # La web oficial ya dio contactos → no hace falta el buscador
            if contacto["telefonos"] or contacto["emails"]:
                log.info("  Contactos desde web conocida ({n} tel, {m} email)",
                         n=len(contacto["telefonos"]), m=len(contacto["emails"]))
                return contacto

        for query in self._construir_queries(nombre, comuna):
            self._rate_limit()
            sitio = self._buscar_sitio(query)
            if not sitio:
                continue
            if con_prensa and not self._es_prensa(sitio):
                log.debug("  Skip no-prensa: {u}", u=sitio)
                continue
            if sitio in contacto["urls"]:
                continue
            contacto["urls"].append(sitio)
            datos = self._buscar_contactos(sitio)
            for tel in datos["telefonos"]:
                if tel not in contacto["telefonos"]:
                    contacto["telefonos"].append(tel)
            for em in datos["emails"]:
                if em not in contacto["emails"]:
                    contacto["emails"].append(em)
        return contacto

    def _rotar_user_agent(self) -> str:
        return _next_user_agent()

    def _buscar_sitio(self, query: str) -> Optional[str]:
        """Google Search → primera URL relevante (misma lógica que google_search).

        Google moderno sirve página JS-only sin enlaces estáticos; si no se
        extrae nada, cae a DuckDuckGo HTML (estático, parseable sin JS).
        """
        url = f"https://www.google.com/search?q={quote(query)}&hl=es&lr=lang_es&num=10"
        try:
            resp = self._fetch(
                url,
                headers={
                    "User-Agent": self._rotar_user_agent(),
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                },
                # No reintentar 429 — Google no lo levanta en segundos
                retry_on=[],
            )
        except Exception as e:
            log.trace("Error buscando {q}: {e}", q=query, e=str(e)[:80])
            resp = None
        if resp is not None:
            sitio = self._extraer_primera_url(resp.text)
            if sitio:
                return sitio
            log.debug("Google sin resultados estáticos ({q}) — fallback DDG", q=query)
        return self._buscar_ddg(query)

    def _buscar_ddg(self, query: str) -> Optional[str]:
        """DuckDuckGo HTML (html.duckduckgo.com) — fallback estático a Google."""
        url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
        try:
            resp = self._fetch(
                url,
                headers={
                    "User-Agent": self._rotar_user_agent(),
                    "Accept": "text/html",
                    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                },
                retry_on=[429, 500, 502, 503, 504],
            )
        except Exception as e:
            log.trace("Error DDG {q}: {e}", q=query, e=str(e)[:80])
            return None
        if resp is None:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        for a in soup.select("a.result__a"):
            real = self._extraer_ddg_real(a.get("href", ""))
            if real and self._es_url_valida(real):
                return real
        return None

    @staticmethod
    def _extraer_ddg_real(href: str) -> Optional[str]:
        """Decodifica la URL real del redirect de DDG (//duckduckgo.com/l/?uddg=...)."""
        if "/l/?uddg=" in href:
            uddg = href.split("uddg=")[1].split("&")[0]
            return unquote(uddg)
        if href.startswith("http"):
            return href
        return None

    def _extraer_primera_url(self, html: str) -> Optional[str]:
        """Extrae la primera URL relevante de resultados de Google."""
        soup = BeautifulSoup(html, "lxml")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if any(skip in href for skip in [
                "google.com", "support.google", "youtube.com", "facebook.com",
                "instagram.com", "twitter.com", "linkedin.com", "maps.google",
            ]):
                continue
            if href.startswith("/url?q="):
                real_url = href.split("/url?q=")[1].split("&")[0]
                real_url = unquote(real_url)
                if self._es_url_valida(real_url):
                    return real_url
            if href.startswith("http") and not href.startswith("https://www.google"):
                if self._es_url_valida(href):
                    return href
        urls = re.findall(r'https?://(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/\S*)?', html)
        for u in urls:
            if self._es_url_valida(u):
                return u
        return None

    def _es_url_valida(self, url: str) -> bool:
        """Filtra URLs no deseadas (redes sociales, directorios, etc.)."""
        url_lower = url.lower()
        if any(skip in url_lower for skip in [
            "google.com", "support.google", "youtube.com", "facebook.com",
            "instagram.com", "twitter.com", "linkedin.com", "maps.google",
            "mercadolibre", "yapo.cl", "clasificados", "todo.cl", "dondepago",
        ]):
            return False
        if not url_lower.startswith("http"):
            return False
        if not re.match(r'https?://[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', url_lower):
            return False
        return True

    def _es_prensa(self, url: str) -> bool:
        """True si el dominio de la URL es prensa local (o feria social)."""
        try:
            dominio = urlparse(url).netloc.lower()
            if dominio.startswith("www."):
                dominio = dominio[4:]
            return any(dominio == d or dominio.endswith("." + d) for d in self._prensa_domains)
        except ValueError:
            return False

    def _buscar_contactos(self, url: str) -> dict:
        """Extrae teléfonos y correos del HTML de una página."""
        datos: dict = {"telefonos": [], "emails": []}
        try:
            resp = self._fetch(
                url,
                headers={"User-Agent": self._rotar_user_agent()},
                retry_on=[429, 500, 502, 503, 504],
            )
        except Exception as e:
            log.trace("Error visitando {url}: {e}", url=url, e=str(e)[:80])
            return datos
        if resp is None:
            return datos

        texto = resp.text
        try:
            soup = BeautifulSoup(texto, "lxml")
            for tag in soup(["script", "style"]):
                tag.decompose()
            texto = soup.get_text(" ", strip=True)
        except Exception:
            pass

        # Teléfonos (validados con el validator de la app — solo móvil chileno)
        for tel in TEL_MOVIL_RE.findall(texto) + TEL_FIJO_RE.findall(texto):
            tel_limpio = re.sub(r"\s+", "", tel)
            if es_telefono_valido(tel_limpio):
                norm = normalizar_telefono(tel_limpio)
                if norm and norm not in datos["telefonos"]:
                    datos["telefonos"].append(norm)

        # Emails (filtra ruido: imágenes, placeholders, trackers)
        for email in EMAIL_RE.findall(resp.text):
            email = email.strip(".").lower()
            if self._email_util(email) and email not in datos["emails"]:
                datos["emails"].append(email)

        return datos

    @staticmethod
    def _email_util(email: str) -> bool:
        """Filtra emails de ruido (imágenes, trackers, placeholders)."""
        if any(x in email for x in (
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", "@2x",
            "example", "sentry", "wixpress", "wordpress.com", "domain.com",
        )):
            return False
        return True
