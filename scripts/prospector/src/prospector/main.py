"""Prospector — CLI principal.

Punto de entrada único para todo el sistema de prospección.

Uso:
    prospector scrape chilerut --provincias Llanquihue,Osorno
    prospector scrape gmaps --query "inmobiliaria Puerto Varas" --max 50
    prospector enrich all
    prospector validate
    prospector dedup
    prospector stats
    prospector export --rubro inmobiliaria --min-score 40

Modo debug:
    prospector --verbose scrape gmaps --query "..."      # INFO
    prospector -vv scrape gmaps --query "..."              # DEBUG
    prospector -vvv scrape gmaps --query "..."             # TRACE

Modo dry-run (sin modificar datos):
    prospector --dry-run scrape gmaps --query "inmobiliaria PV"
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import click

from prospector import __version__
from prospector.core.config import load_config
from prospector.core.database import JSONDatabase
from prospector.core.logger import setup_logger, get_logger
from prospector.core.models import Prospect, EstadoProspect

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Global context
# ---------------------------------------------------------------------------

class Context:
    """Estado global compartido entre comandos."""

    def __init__(self, verbose: int = 0, dry_run: bool = False, data_dir: Optional[str] = None):
        self.verbose = verbose
        self.dry_run = dry_run
        self.data_dir = data_dir

        # Cargar config
        cfg = load_config()
        if data_dir:
            cfg.data_dir = data_dir

        # Setup logging
        level = {0: "INFO", 1: "DEBUG", 2: "TRACE"}.get(verbose, "TRACE")
        setup_logger(
            level=level,
            log_file=cfg.log_file,
            error_log_file=cfg.error_log_file,
            max_bytes=cfg.logging.max_size_mb * 1024 * 1024,
            backup_count=cfg.logging.backup_count,
        )

        # Inicializar DB
        self.db = JSONDatabase()

    def log_dry_run(self, msg: str, **kwargs) -> None:
        if self.dry_run:
            log.info(f"[DRY-RUN] {msg}", **kwargs)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

@click.group()
@click.version_option(version=__version__, prog_name="prospector")
@click.option("-v", "--verbose", count=True, help="-v INFO, -vv DEBUG, -vvv TRACE")
@click.option("-n", "--dry-run", is_flag=True, help="Simular sin modificar datos")
@click.option("--data-dir", default=None, help="Directorio de datos (default: data/)")
@click.pass_context
def cli(ctx, verbose, dry_run, data_dir):
    """Prospector — Sistema de prospección de clientes para Mtsprz.

    Construye y gestiona la base de datos de prospectos de la Región de Los Lagos.
    """
    ctx.obj = Context(verbose=verbose, dry_run=dry_run, data_dir=data_dir)

    if dry_run:
        log.warning("🔸 MODO DRY-RUN: no se modificarán datos")


# ===================================================================
# SCRAPE
# ===================================================================

@cli.group()
def scrape():
    """Extrae prospectos desde fuentes públicas."""


@scrape.command()
@click.option("--provincias", default="Llanquihue,Osorno",
              help="Provincias separadas por coma")
@click.option("--max", "max_por_provincia", default=0, type=int,
              help="Máx por provincia (0 = todas)")
@click.option("--resume", is_flag=True, help="Reanudar desde checkpoint")
@click.pass_obj
def chilerut(ctx: Context, provincias: str, max_por_provincia: int, resume: bool):
    """Scrapea ChileRutEmpresa.cl (datos SII públicos)."""
    from prospector.scrapers.chilerut import ChileRutScraper

    provincias_list = [p.strip() for p in provincias.split(",")]
    log.info("Scrapeando ChileRut — provincias: {p}", p=provincias_list)

    if ctx.dry_run:
        ctx.log_dry_run("Scrapearía {n} provincias", n=len(provincias_list))
        return

    scraper = ChileRutScraper(
        provincias=provincias_list,
        dry_run=ctx.dry_run,
        resume=resume,
    )

    try:
        result = scraper.scrape(max_por_provincia=max_por_provincia)
        log.info("Resultado: {r}", r=result.resumen)
        if result.prospects:
            guardados = ctx.db.add_batch(result.prospects)
            log.info("Guardados {n} prospectos en DB", n=guardados)
    finally:
        scraper.close()


@scrape.command()
@click.option("--query", required=True, help="Búsqueda (ej: 'inmobiliaria Puerto Varas')")
@click.option("--max", "max_results", default=50, type=int, help="Máximo de resultados")
@click.option("--resume", is_flag=True, help="Reanudar desde checkpoint")
@click.pass_obj
def gmaps(ctx: Context, query: str, max_results: int, resume: bool):
    """Scrapea Google Maps con Playwright."""
    from prospector.scrapers.google_maps import GoogleMapsScraper

    log.info("Scrapeando Google Maps: {q} (max={m})", q=query, m=max_results)

    if ctx.dry_run:
        ctx.log_dry_run("Scrapearía: {q}", q=query)
        return

    scraper = GoogleMapsScraper(
        dry_run=ctx.dry_run,
        resume=resume,
    )

    try:
        result = scraper.scrape(
            query=query,
            max_results=max_results,
        )
        log.info("Resultado: {r}", r=result.resumen)
        if result.prospects:
            guardados = ctx.db.add_batch(result.prospects)
            log.info("Guardados {n} prospectos en DB", n=guardados)
    finally:
        scraper.close()


@scrape.command()
@click.option("--ciudades",
              default="puerto_varas,puerto_montt,osorno,valdivia,frutillar",
              help="Ciudades separadas por coma (ver códigos en yelu.py)")
@click.option("--categoria", default="", help="Categoría (inmobiliaria, abogado, etc)")
@click.option("--max", "max_por_ciudad", default=0, type=int,
              help="Máx por ciudad (0 = todas)")
@click.option("--resume", is_flag=True)
@click.pass_obj
def yelu(ctx: Context, ciudades: str, categoria: str, max_por_ciudad: int, resume: bool):
    """Scrapea Yelu.cl (directorio chileno con teléfonos reales)."""
    from prospector.scrapers.yelu import YeluScraper

    ciudades_list = [c.strip() for c in ciudades.split(",")]
    log.info("Scrapeando Yelu — {n} ciudades, categoría={c}",
             n=len(ciudades_list), c=categoria or "todas")

    if ctx.dry_run:
        ctx.log_dry_run("Scrapearía {n} ciudades", n=len(ciudades_list))
        return

    scraper = YeluScraper(dry_run=ctx.dry_run, resume=resume)
    try:
        result = scraper.scrape(
            ciudades=ciudades_list,
            categoria=categoria,
            max_por_ciudad=max_por_ciudad,
        )
        log.info("Resultado: {r}", r=result.resumen)
        if result.prospects:
            guardados = ctx.db.add_batch(result.prospects)
            log.info("Guardados {n} prospectos en DB", n=guardados)
    finally:
        scraper.close()


# ===================================================================
# IMPORT
# ===================================================================

@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
@click.option("--fuente", default="importacion", help="Nombre de la fuente")
@click.option("--save", is_flag=True, help="Guardar en base de datos")
@click.pass_obj
def import_csv(ctx: Context, file: Path, fuente: str, save: bool):
    """Importa prospectos desde un archivo CSV."""
    from prospector.importers.csv_importer import CSVImporter

    log.info("Importando: {f} (fuente={src})", f=file, src=fuente)
    importer = CSVImporter()
    prospects = importer.import_file(file, fuente=fuente)

    if not prospects:
        log.warning("No se importaron prospectos")
        return

    log.info("Importados {n} prospectos", n=len(prospects))

    if save and not ctx.dry_run:
        added = ctx.db.add_batch(prospects)
        log.info("Guardados {n} prospectos en DB", n=added)


# ------------------------------------------------------------------
# Rubros + Ciudades objetivo para GMaps batch
# ------------------------------------------------------------------

# Las combinaciones más productivas para encontrar PYMES con sitio web
GMAPS_BATCH = [
    # Puerto Varas (zona turística + inmobiliaria)
    "inmobiliaria Puerto Varas",
    "hotel Puerto Varas",
    "restaurante Puerto Varas",
    "cabañas Puerto Varas",
    "inmobiliaria Frutillar",
    "hotel Frutillar",
    # Puerto Montt (capital regional)
    "inmobiliaria Puerto Montt",
    "abogado Puerto Montt",
    "contador Puerto Montt",
    "constructora Puerto Montt",
    "restaurante Puerto Montt",
    "hotel Puerto Montt",
    "taller mecanico Puerto Montt",
    "clinica dental Puerto Montt",
    # Osorno
    "inmobiliaria Osorno",
    "abogado Osorno",
    "constructora Osorno",
    "restaurante Osorno",
    "hotel Osorno",
    # Valdivia
    "inmobiliaria Valdivia",
    "restaurante Valdivia",
    "hotel Valdivia",
    "abogado Valdivia",
    # Castro + Ancud (Chiloé)
    "inmobiliaria Castro",
    "hotel Castro",
    "restaurante Castro",
    "hotel Ancud",
    "restaurante Ancud",
    # Otras ciudades
    "inmobiliaria Llanquihue",
    "constructora La Union",
    "inmobiliaria Rio Bueno",
]


@scrape.command()
@click.option("--rubros", default="inmobiliaria,abogado,restaurante,hotel,constructora",
              help="Rubros separados por coma para buscar en GMaps")
@click.option("--ciudades", default="Puerto Varas,Puerto Montt,Osorno,Valdivia,Frutillar",
              help="Ciudades separadas por coma (en español)")
@click.option("--max", "max_results", default=20, type=int, help="Máx resultados por query")
@click.pass_obj
def gmaps_batch(ctx: Context, rubros: str, ciudades: str, max_results: int):
    """Scrapea Google Maps para múltiples rubros × ciudades.

    Ejemplo:
        prospector scrape gmaps-batch \\
            --rubros "inmobiliaria,abogado,restaurante" \\
            --ciudades "Puerto Varas,Puerto Montt,Osorno"

    Esto busca "inmobiliaria Puerto Varas", "abogado Puerto Varas",
    "restaurante Puerto Varas", etc. combinando cada rubro con cada ciudad.
    """
    from prospector.scrapers.google_maps import GoogleMapsScraper

    rubros_list = [r.strip() for r in rubros.split(",")]
    ciudades_list = [c.strip() for c in ciudades.split(",")]
    queries = [f"{r} {c}" for r in rubros_list for c in ciudades_list]

    log.info("GMaps batch: {n} queries ({r} × {c})",
             n=len(queries), r=len(rubros_list), c=len(ciudades_list))

    if ctx.dry_run:
        for q in queries:
            ctx.log_dry_run("  Buscaría: {q}", q=q)
        return

    total = 0
    for q in queries:
        log.info("")
        log.info("═══ [{i}/{n}] {q} ═══", i=queries.index(q) + 1, n=len(queries), q=q)
        scraper = GoogleMapsScraper(dry_run=ctx.dry_run)
        try:
            result = scraper.scrape(query=q, max_results=max_results)
            if result.prospects:
                guardados = ctx.db.add_batch(result.prospects)
                total += guardados
        finally:
            scraper.close()

    log.info("")
    log.info("GMaps batch completado: {n} prospectos nuevos", n=total)


@scrape.command(name="all")
@click.option("--max-yelu", default=50, type=int, help="Máx por ciudad en Yelu")
@click.option("--max-gmaps", default=15, type=int, help="Máx por query en GMaps")
@click.option("--skip-gmaps", is_flag=True, help="Saltar GMaps (solo Yelu)")
@click.pass_obj
def scrape_all(ctx: Context, max_yelu: int, max_gmaps: int, skip_gmaps: bool):
    """Barrido COMPLETO de Los Lagos: Yelu 17 ciudades + GMaps batch por rubro.

    Ejecuta:
      1. Yelu: todas las 17 ciudades de Los Lagos + Los Ríos
      2. GMaps: combinaciones rubro × ciudad para PYMES con sitio web

    Después ejecuta:
      prospector find-websites --save   (buscar webs faltantes)
      prospector enrich web             (extraer emails)
      prospector export-emails          (generar CSV)
    """
    from prospector.scrapers.yelu import YeluScraper
    from prospector.scrapers.yelu import CIUDADES as YELU_CIUDADES

    # ---- FASE 1: Yelu ----
    log.info("")
    log.info("═══════════════════════════════════════════")
    log.info("FASE 1: Yelu — {n} ciudades", n=len(YELU_CIUDADES))
    log.info("═══════════════════════════════════════════")

    scraper = YeluScraper(dry_run=ctx.dry_run)
    try:
        result = scraper.scrape(max_por_ciudad=max_yelu)
        log.info("Yelu: {r}", r=result.resumen)
        if result.prospects:
            guardados = ctx.db.add_batch(result.prospects)
            log.info("Guardados {n} prospectos de Yelu", n=guardados)
    finally:
        scraper.close()

    # ---- FASE 2: GMaps batch ----
    if not skip_gmaps:
        from prospector.scrapers.google_maps import GoogleMapsScraper

        log.info("")
        log.info("═══════════════════════════════════════════")
        log.info("FASE 2: GMaps batch — {n} queries", n=len(GMAPS_BATCH))
        log.info("═══════════════════════════════════════════")

        for i, query in enumerate(GMAPS_BATCH):
            log.info("")
            log.info("  [{i}/{n}] {q}", i=i + 1, n=len(GMAPS_BATCH), q=query)
            if ctx.dry_run:
                ctx.log_dry_run("Scrapearía: {q}", q=query)
                continue
            scraper = GoogleMapsScraper(dry_run=ctx.dry_run)
            try:
                result = scraper.scrape(query=query, max_results=max_gmaps)
                if result.prospects:
                    ctx.db.add_batch(result.prospects)
                    log.info("  → {n} prospectos", n=len(result.prospects))
            finally:
                scraper.close()

    # ---- Resumen final ----
    log.info("")
    log.info("═══════════════════════════════════════════")
    log.info("BARRIDO COMPLETADO")
    log.info("═══════════════════════════════════════════")
    log.info("")
    log.info("Próximos pasos sugeridos:")
    log.info("  1. Buscar websites faltantes:")
    log.info("     uv run python -m prospector.main find-websites --limit 100 --save")
    log.info("")
    log.info("  2. Extraer emails de las websites:")
    log.info("     uv run python -m prospector.main enrich web --limit 200")
    log.info("")
    log.info("  3. Exportar campaña de email:")
    log.info("     uv run python -m prospector.main export-emails")
    log.info("")


@scrape.command()
@click.option("--query", required=True, help="Búsqueda en Google (ej: 'Sime Ltda Puerto Montt')")
@click.pass_obj
def googlesearch(ctx: Context, query: str):
    """Busca el sitio web de una empresa en Google.

    Útil para encontrar la web de prospectos de Yelu que no tienen sitio.
    """
    from prospector.scrapers.google_search import GoogleSearchScraper

    log.info("Buscando en Google: {q}", q=query)
    scraper = GoogleSearchScraper(dry_run=ctx.dry_run)
    sitio = scraper.buscar_sitio_web(query)
    if sitio:
        log.info("Sitio encontrado: {s}", s=sitio)
    else:
        log.info("No se encontró sitio web")
    scraper.close()


# ===================================================================
# FIND-WEBSITES — Buscar webs para prospectos sin sitio_web
# ===================================================================

@cli.command()
@click.option("--limit", default=10, type=int, help="Máx a procesar (0 = todos)")
@click.option("--save", is_flag=True, help="Guardar en DB")
@click.pass_obj
def find_websites(ctx: Context, limit: int, save: bool):
    """Busca sitios web de prospectos que no tienen web (vía Google Search).

    Útil después de scrape Yelu: busca la web de cada empresa en Google
    para luego poder extraer emails con 'enrich web'.
    """
    from prospector.scrapers.google_search import GoogleSearchScraper

    prospects = ctx.db.all()
    sin_web = [p for p in prospects if not p.sitio_web]

    if not sin_web:
        log.info("Todos los prospectos ya tienen sitio web")
        return

    log.info("Buscando webs para {n} prospectos sin web...", n=len(sin_web))

    scraper = GoogleSearchScraper(dry_run=ctx.dry_run)
    encontrados = 0

    for i, p in enumerate(sin_web):
        if limit and i >= limit:
            break
        if ctx.dry_run:
            ctx.log_dry_run("Buscaría web de: {e} ({c})", e=p.empresa, c=p.comuna)
            continue
        encontrado, sitio = scraper.enrichen_prospect(p)
        if encontrado and sitio:
            encontrados += 1
            log.info("  ✓ {empresa} → {sitio}", empresa=p.empresa, sitio=sitio)
            if save:
                ctx.db.update(p.id, sitio_web=sitio)

    log.info("Webs encontradas: {e}/{t}", e=encontrados, t=min(limit, len(sin_web)) if limit else len(sin_web))
    scraper.close()


# ===================================================================
# ENRICH
# ===================================================================

@cli.group()
def enrich():
    """Enriquece prospectos con análisis de presencia digital."""


@enrich.command("all")
@click.option("--limit", default=0, type=int, help="Máx a enriquecer (0 = todos)")
@click.pass_obj
def enrich_all(ctx: Context, limit: int):
    """Analiza la presencia digital de todos los prospectos."""
    from prospector.enrichers.digital_presence import DigitalPresenceEnricher

    prospects = ctx.db.all()
    if not prospects:
        log.warning("No hay prospectos para enriquecer")
        return

    if limit > 0:
        prospects = prospects[:limit]

    log.info("Enriqueciendo {n} prospectos...", n=len(prospects))
    enricher = DigitalPresenceEnricher()

    try:
        for i, p in enumerate(prospects):
            if ctx.dry_run:
                ctx.log_dry_run("Enriquecería: {e}", e=p.empresa)
                continue
            enriched = enricher.enrichen(p)
            ctx.db.update(
                p.id,
                senales_digitales=enriched.senales_digitales.model_dump(),
            )
            if (i + 1) % 10 == 0:
                log.info("Progreso: {i}/{n}", i=i + 1, n=len(prospects))

        if not ctx.dry_run:
            log.info("Enriquecimiento completado")
    finally:
        enricher.close()


@enrich.command("web")
@click.option("--limit", default=0, type=int, help="Máx a procesar (0 = todos)")
@click.option("--solo-sin-email", is_flag=True, help="Solo prospectos sin email")
@click.pass_obj
def enrich_web(ctx: Context, limit: int, solo_sin_email: bool):
    """Extrae emails reales desde los sitios web de los prospectos."""
    from prospector.scrapers.web_scraper import WebScraper

    prospects = ctx.db.all()
    if solo_sin_email:
        prospects = [p for p in prospects if not p.emails]

    if not prospects:
        log.warning("No hay prospectos para procesar")
        return

    if limit > 0:
        prospects = prospects[:limit]

    log.info("Extrayendo emails de {n} sitios web...", n=len(prospects))
    scraper = WebScraper(dry_run=ctx.dry_run)

    try:
        for i, p in enumerate(prospects):
            if ctx.dry_run:
                ctx.log_dry_run("Visitaría: {url} ({e})", url=p.sitio_web, e=p.empresa)
                continue
            if not p.sitio_web:
                continue
            enriched = scraper.enrichen_prospect(p)
            if enriched != p:
                ctx.db.update(p.id,
                    emails=list(set(enriched.emails)),
                    telefonos=list(set(enriched.telefonos)),
                    redes=enriched.redes,
                )
            if (i + 1) % 5 == 0:
                log.info("Progreso: {i}/{n}", i=i + 1, n=len(prospects))

        if not ctx.dry_run:
            log.info("Extracción de emails completada")
    finally:
        scraper.close()


# ===================================================================
# EXPORT
# ===================================================================

@cli.command()
@click.option("--rubro", default=None, help="Filtrar por rubro")
@click.option("--min-score", default=0, type=int, help="Score mínimo (0-100)")
@click.option("--comuna", default=None, help="Filtrar por comuna")
@click.option("--solo-telefono", is_flag=True, help="Solo con teléfono")
@click.option("--solo-email", is_flag=True, help="Solo con email")
@click.option("--estado", default=None, help="Filtrar por estado")
@click.option("--formato", type=click.Choice(["csv", "json"]), default="csv")
@click.option("--output", default=None, help="Archivo de salida")
@click.pass_obj
def export(ctx: Context, rubro, min_score, comuna, solo_telefono, solo_email, estado, formato, output):
    """Exporta prospectos filtrados."""
    from prospector.exporters.csv_exporter import CSVExporter

    prospects = ctx.db.all()
    log.info("Exportando desde {n} prospectos totales", n=len(prospects))

    if ctx.dry_run:
        ctx.log_dry_run(
            "Exportaría: rubro={r} score≥{s} comuna={c}",
            r=rubro or "*", s=min_score, c=comuna or "*",
        )
        return

    exporter = CSVExporter()
    path = exporter.export(
        prospects,
        filename=output,
        rubro=rubro,
        min_score=min_score,
        comuna=comuna,
        solo_con_telefono=solo_telefono,
        solo_con_email=solo_email,
        estado=estado,
    )
    log.info("Exportado a: {f}", f=path)


# ===================================================================
# VALIDATE
# ===================================================================

@cli.command()
@click.option("--fix", is_flag=True, help="Corregir datos automáticamente")
@click.pass_obj
def validate(ctx: Context, fix: bool):
    """Valida y normaliza datos de todos los prospectos."""
    from prospector.validators.rut import validar_rut, formatear_rut
    from prospector.validators.phone import normalizar_telefono, es_telefono_valido
    from prospector.validators.email import es_email_valido

    prospects = ctx.db.all()
    stats = {"total": len(prospects), "ruts_invalidos": 0, "telefonos_invalidos": 0,
             "emails_invalidos": 0, "corregidos": 0}

    for p in prospects:
        updates = {}

        # RUT
        if p.rut and not validar_rut(p.rut):
            stats["ruts_invalidos"] += 1
            log.warning("RUT inválido: {r} ({e})", r=p.rut, e=p.empresa)

        # Teléfonos
        telefonos_validos = [t for t in p.telefonos if es_telefono_valido(t)]
        if len(telefonos_validos) != len(p.telefonos):
            stats["telefonos_invalidos"] += len(p.telefonos) - len(telefonos_validos)
            if fix:
                updates["telefonos"] = telefonos_validos

        # Emails
        emails_validos = [e for e in p.emails if es_email_valido(e)]
        if len(emails_validos) != len(p.emails):
            stats["emails_invalidos"] += len(p.emails) - len(emails_validos)
            if fix:
                updates["emails"] = emails_validos

        if fix and updates:
            stats["corregidos"] += 1
            ctx.db.update(p.id, **updates)

    log.info("Validación completada:")
    log.info("  Total: {t}", t=stats["total"])
    log.info("  RUTs inválidos: {r}", r=stats["ruts_invalidos"])
    log.info("  Teléfonos inválidos: {t}", t=stats["telefonos_invalidos"])
    log.info("  Emails inválidos: {e}", e=stats["emails_invalidos"])
    if fix:
        log.info("  Corregidos: {c}", c=stats["corregidos"])


# ===================================================================
# DEDUP
# ===================================================================

@cli.command()
@click.option("--auto-remove", is_flag=True, help="Eliminar duplicados automáticamente")
@click.pass_obj
def dedup(ctx: Context, auto_remove: bool):
    """Detecta y fusiona prospectos duplicados."""
    from prospector.utils.dedup import Deduplicator

    prospects = ctx.db.all()
    log.info("Analizando {n} prospectos...", n=len(prospects))

    deduper = Deduplicator()
    groups = deduper.find_duplicates(prospects)

    if not groups:
        log.info("✅ Sin duplicados encontrados")
        return

    log.info("Encontrados {g} grupos de duplicados", g=len(groups))
    for grupo in groups:
        best = grupo.mejor
        others = [p for p in grupo.prospects if p.id != best.id]
        log.info("  → {best} absorbe a: {others}",
                 best=best.empresa,
                 others=", ".join(p.empresa for p in others))

    if auto_remove and not ctx.dry_run:
        # IDs a eliminar (todo excepto el mejor de cada grupo)
        remove_ids: set[str] = set()
        for grupo in groups:
            for p in grupo.prospects:
                if p.id != grupo.mejor.id:
                    remove_ids.add(p.id)

        if remove_ids:
            # Eliminar en batch (un solo flush al final)
            ctx.db._prospects = [p for p in ctx.db._prospects if p.id not in remove_ids]
            ctx.db.flush()
            log.info("Eliminados {n} duplicados", n=len(remove_ids))


# ===================================================================
# STATS
# ===================================================================

@cli.command()
@click.option("--export", "export_path", default=None, type=click.Path(path_type=Path),
              help="Exportar reporte a JSON")
@click.pass_obj
def stats(ctx: Context, export_path: Optional[Path]):
    """Muestra estadísticas de la base de prospectos."""
    from prospector.utils.stats import StatsReporter

    prospects = ctx.db.all()
    reporter = StatsReporter(prospects)
    reporter.print_report()

    if export_path:
        reporter.export_report(export_path)


# ===================================================================
# LIST
# ===================================================================

@cli.command()
@click.option("--rubro", default=None, help="Filtrar por rubro")
@click.option("--comuna", default=None, help="Filtrar por comuna")
@click.option("--limit", default=20, type=int, help="Máximo a mostrar")
@click.pass_obj
def list_prospects(ctx: Context, rubro: Optional[str], comuna: Optional[str], limit: int):
    """Lista prospectos en consola."""
    prospects = ctx.db.all()

    if rubro:
        prospects = [p for p in prospects if p.rubro == rubro]
    if comuna:
        prospects = [p for p in prospects if p.comuna.lower() == comuna.lower()]

    log.info("Mostrando {n} de {t} prospectos:", n=min(limit, len(prospects)), t=len(prospects))
    for p in prospects[:limit]:
        score_str = f" [{p.digital_score} pts]" if p.digital_score else ""
        tel_str = f" 📞{p.telefonos[0]}" if p.telefonos else ""
        log.info(f"  {p.id} | {p.empresa} ({p.rubro}) — {p.comuna}{score_str}{tel_str}")


@cli.command()
@click.option("--rubro", default=None, help="Filtrar por rubro")
@click.option("--comuna", default=None, help="Filtrar por comuna")
@click.option("--min-score", default=0, type=int, help="Score mínimo digital")
@click.option("--output", default="prospectos_email.csv", help="Archivo CSV de salida")
@click.pass_obj
def export_emails(ctx: Context, rubro: Optional[str], comuna: Optional[str], min_score: int, output: str):
    """Exporta prospectos con email para campañas de email marketing."""
    from prospector.exporters.csv_exporter import CSVExporter

    prospects = ctx.db.all()
    # Filtrar solo los que tienen email
    con_email = [p for p in prospects if p.emails]

    if rubro:
        con_email = [p for p in con_email if p.rubro == rubro]
    if comuna:
        con_email = [p for p in con_email if p.comuna.lower() == comuna.lower()]
    if min_score:
        con_email = [p for p in con_email if (p.digital_score or 0) >= min_score]

    if not con_email:
        log.warning("No hay prospectos con email para exportar")
        log.info("Consejo: ejecuta 'enrich web' primero para extraer emails de sitios web")
        return

    exporter = CSVExporter()
    path = exporter.export(
        con_email,
        filename=output,
        fields=CSVExporter.EMAIL_FIELDS,
    )
    log.info("Exportados {n} prospectos con email a {f}", n=len(con_email), f=path)

    # Resumen
    log.info("")
    log.info("📧 RESUMEN PARA CAMPAÑA EMAIL")
    log.info("  Total con email: {n}", n=len(con_email))
    log.info("  Rubros: {r}", r=", ".join(sorted(set(p.rubro for p in con_email))))
    log.info("  Archivo: {f}", f=path)
    log.info("")
    log.info("Sugerencia: abre el CSV con Google Sheets o Excel para revisar antes de enviar.")


# ===================================================================
# SEND-CAMPAIGN — Envío automatizado de emails vía Resend
# ===================================================================

@cli.command()
@click.option("--rubro", default=None, help="Filtrar por rubro")
@click.option("--comuna", default=None, help="Filtrar por comuna")
@click.option("--limit", default=10, type=int, help="Máx a enviar (0 = todos)")
@click.option("--dry-run", "dry_run", is_flag=True, help="Previsualizar sin enviar")
@click.option("--api-key", default=None, help="Resend API key (default: RESEND_API_KEY env)")
@click.pass_obj
def send_campaign(ctx: Context, rubro: Optional[str], comuna: Optional[str],
                   limit: int, dry_run: bool, api_key: Optional[str]):
    """Envía campaña de email a prospectos usando Resend API.

    Ejemplos:
        prospector send-campaign --dry-run                           # previsualizar 10
        prospector send-campaign --rubro inmobiliaria --dry-run       # solo inmobiliarias
        prospector send-campaign --limit 5 --send                     # enviar 5 reales
        prospector send-campaign --rubro abogado --comuna "Puerto Varas" --limit 3
    """
    from prospector.outreach.email_campaign import EmailCampaign

    prospects = ctx.db.all()

    # Filtros
    if rubro:
        prospects = [p for p in prospects if p.rubro == rubro]
    if comuna:
        prospects = [p for p in prospects if p.comuna.lower() == comuna.lower()]

    if dry_run:
        log.info("🔸 MODO DRY-RUN: no se enviarán correos reales")
    else:
        log.info("⚠️  MODO REAL: se enviarán correos")
        if not dry_run:
            log.info("   Pulsa Ctrl+C para cancelar en los próximos 5 segundos...")
            import time
            time.sleep(5)

    campaign = EmailCampaign(api_key=api_key)
    result = campaign.run(prospects, rubro=rubro, limit=limit, dry_run=dry_run)

    if dry_run:
        log.info("Ejecuta sin --dry-run para enviar los correos mostrados.")


# ===================================================================
# MAIN
# ===================================================================

if __name__ == "__main__":
    cli()
