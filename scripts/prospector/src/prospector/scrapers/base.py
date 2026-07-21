"""BaseScraper — Clase base abstracta para todos los scrapers.

Provee:
  - Rate limiting con delays configurables
  - Retry con backoff exponencial (3 intentos)
  - Checkpoint/resume (cada N registros guarda progreso)
  - Dry-run mode
  - Logging estructurado
"""

from __future__ import annotations

import json
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

from prospector.core.config import load_config
from prospector.core.logger import get_logger

log = get_logger(__name__)


class ScraperResult:
    """Resultado de una operación de scraping."""

    def __init__(
        self,
        nuevos: int = 0,
        duplicados: int = 0,
        errores: int = 0,
        total: int = 0,
        checkpoint: Optional[str] = None,
        prospects: Optional[list] = None,
    ):
        self.nuevos = nuevos
        self.duplicados = duplicados
        self.errores = errores
        self.total = total
        self.checkpoint = checkpoint
        self.prospects: list = prospects or []

    @property
    def resumen(self) -> str:
        return (
            f"✓ {self.nuevos} nuevos | "
            f"{self.duplicados} duplicados | "
            f"{self.errores} errores | "
            f"{self.total} total"
        )

    def __add__(self, other: "ScraperResult") -> "ScraperResult":
        return ScraperResult(
            nuevos=self.nuevos + other.nuevos,
            duplicados=self.duplicados + other.duplicados,
            errores=self.errores + other.errores,
            total=self.total + other.total,
            prospects=self.prospects + other.prospects,
        )


class BaseScraper(ABC):
    """Scraper base con rate limiting, retry y checkpoint."""

    def __init__(
        self,
        name: str = "base",
        delay: Optional[float] = None,
        max_retries: Optional[int] = None,
        timeout: Optional[int] = None,
        dry_run: bool = False,
        resume: bool = False,
    ):
        cfg = load_config()
        self.name = name
        self.delay = delay if delay is not None else cfg.scraping.delay
        self.max_retries = max_retries if max_retries is not None else cfg.scraping.max_retries
        self.timeout = timeout if timeout is not None else cfg.scraping.timeout
        self.dry_run = dry_run
        self.resume = resume

        # HTTP client compartido
        self._client = httpx.Client(
            timeout=httpx.Timeout(self.timeout),
            headers={"User-Agent": cfg.scraping.user_agent},
            follow_redirects=True,
        )

        # Checkpoint
        self._checkpoint_file: Optional[Path] = None
        self._checkpoint_interval = 10  # guardar cada N registros
        self._since_checkpoint = 0

        # Estadísticas internas
        self._stats = {"nuevos": 0, "duplicados": 0, "errores": 0}

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    @abstractmethod
    def scrape(self, **kwargs) -> ScraperResult:
        """Método principal que cada scraper implementa."""
        ...

    # ------------------------------------------------------------------
    # Rate limiting
    # ------------------------------------------------------------------

    def _rate_limit(self) -> None:
        """Espera el delay configurado entre requests."""
        if self.delay > 0:
            time.sleep(self.delay)

    # ------------------------------------------------------------------
    # HTTP con retry
    # ------------------------------------------------------------------

    def _fetch(
        self, url: str, retry_on: Optional[list[int]] = None, **kwargs
    ) -> Optional[httpx.Response]:
        """GET con retry + backoff exponencial.

        NO reintenta errores 4xx (excepto 429 rate-limit) — son permanentes.
        """
        retry_on = retry_on or [429, 500, 502, 503, 504]
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self._client.get(url, **kwargs)
                if resp.status_code in retry_on:
                    wait = 2 ** attempt * self.delay
                    log.warning(
                        "HTTP {code} en {url} — reintento {a}/{m} en {w}s",
                        code=resp.status_code, url=url, a=attempt, m=self.max_retries, w=wait,
                    )
                    time.sleep(wait)
                    continue
                # No reintentar 4xx (excepto 429 ya manejado arriba)
                if 400 <= resp.status_code < 500:
                    log.warning("Error {code} en {url} — saltando (error cliente)", code=resp.status_code, url=url)
                    self._stats["errores"] += 1
                    return None
                resp.raise_for_status()
                return resp
            except (httpx.HTTPError, httpx.TimeoutException) as e:
                last_error = e
                # No reintentar si es error 4xx (el raise_for_status lo convierte)
                if isinstance(e, httpx.HTTPStatusError):
                    status = e.response.status_code
                    if 400 <= status < 500 and status != 429:
                        log.warning("Error {code} en {url} — saltando (error cliente)", code=status, url=url)
                        self._stats["errores"] += 1
                        return None
                wait = 2 ** attempt * self.delay
                log.warning(
                    "Error en {url} (intento {a}/{m}): {e} — espera {w}s",
                    url=url, a=attempt, m=self.max_retries, e=str(e)[:80], w=wait,
                )
                time.sleep(wait)

        log.error("Fallo tras {m} intentos para {url}: {e}", m=self.max_retries, url=url, e=last_error)
        self._stats["errores"] += 1
        return None

    # ------------------------------------------------------------------
    # Checkpoint system
    # ------------------------------------------------------------------

    def _init_checkpoint(self, name: str, **context) -> None:
        """Inicializa el archivo de checkpoint para este scraper."""
        cfg = load_config()
        self._checkpoint_file = cfg.checkpoints_dir / f"{name}.json"
        self._checkpoint_file.parent.mkdir(parents=True, exist_ok=True)

        if self.resume and self._checkpoint_file.exists():
            try:
                with open(self._checkpoint_file, "r") as f:
                    data = json.load(f)
                log.info("Reanudando desde checkpoint: {f}", f=self._checkpoint_file)
                self._resume_from(data)
            except (json.JSONDecodeError, FileNotFoundError):
                log.warning("Checkpoint corrupto, empezando fresco")

    def _save_checkpoint(self, data: dict) -> None:
        """Guarda checkpoint actual."""
        if self._checkpoint_file is None:
            return
        data["_timestamp"] = datetime.now(timezone.utc).isoformat()
        data["_stats"] = self._stats
        with open(self._checkpoint_file, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _resume_from(self, data: dict) -> None:
        """Override en subclases para restaurar estado desde checkpoint."""
        if "_stats" in data:
            self._stats = data["_stats"]

    def _checkpoint_hit(self, data: dict) -> None:
        """Llámese cada N registros para guardar progreso."""
        self._since_checkpoint += 1
        if self._since_checkpoint >= self._checkpoint_interval:
            self._save_checkpoint(data)
            self._since_checkpoint = 0

    def _clear_checkpoint(self) -> None:
        """Limpia checkpoint al completar exitosamente."""
        if self._checkpoint_file and self._checkpoint_file.exists():
            self._checkpoint_file.unlink()

    # ------------------------------------------------------------------
    # Dry-run
    # ------------------------------------------------------------------

    def _log_dry_run(self, msg: str, **kwargs) -> None:
        """Log en modo dry-run."""
        if self.dry_run:
            log.info("[DRY-RUN] " + msg, **kwargs)

    # ------------------------------------------------------------------
    # Limpieza
    # ------------------------------------------------------------------

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
