"""Config — Carga centralizada de configuración.

Jerarquía (menor a mayor prioridad):
  1. pyproject.toml (tool.prospector)
  2. prospector.toml en data_dir
  3. Variables de entorno PROSPECTOR_*

Uso:
    from prospector.core.config import load_config
    cfg = load_config()
    cfg.scraping.delay  # 2.0
"""

from __future__ import annotations

import os
import tomli
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Dataclasses de configuración
# ---------------------------------------------------------------------------

@dataclass
class ScrapingConfig:
    delay: float = 2.0
    timeout: int = 30
    max_retries: int = 3
    user_agent: str = (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        " (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )


@dataclass
class LoggingConfig:
    level: str = "INFO"
    max_size_mb: int = 10
    backup_count: int = 5


@dataclass
class Config:
    # Rutas
    data_dir: str = "data"
    log_dir: str = "logs"
    default_region: str = "Los Lagos"

    # Sub-configs
    scraping: ScrapingConfig = field(default_factory=ScrapingConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)

    # Interno: ruta absoluta del proyecto
    _project_root: Path = field(default_factory=lambda: Path.cwd())

    # ------------------------------------------------------------------
    # Propiedades derivadas
    # ------------------------------------------------------------------

    @property
    def project_root(self) -> Path:
        return self._project_root

    @property
    def data_path(self) -> Path:
        p = Path(self.data_dir)
        return p if p.is_absolute() else self._project_root / p

    @property
    def log_path(self) -> Path:
        p = Path(self.log_dir)
        return p if p.is_absolute() else self._project_root / p

    @property
    def prospects_file(self) -> Path:
        return self.data_path / "prospects.json"

    @property
    def backups_dir(self) -> Path:
        return self.data_path / "backups"

    @property
    def checkpoints_dir(self) -> Path:
        return self.data_path / "checkpoints"

    @property
    def log_file(self) -> Path:
        return self.log_path / "prospector.log"

    @property
    def error_log_file(self) -> Path:
        return self.log_path / "errors.log"

    # ------------------------------------------------------------------
    # Método helper para construir paths absolutos
    # ------------------------------------------------------------------

    def resolve(self, *parts: str) -> Path:
        return self.project_root.joinpath(*parts)


# ---------------------------------------------------------------------------
# Carga desde pyproject.toml
# ---------------------------------------------------------------------------

def _find_pyproject(start: Path) -> Optional[Path]:
    """Busca pyproject.toml hacia arriba desde *start*."""
    for parent in [start] + list(start.parents):
        candidate = parent / "pyproject.toml"
        if candidate.exists():
            return candidate
    return None


def _load_from_pyproject(cfg: Config) -> Config:
    pp = _find_pyproject(Path.cwd())
    if pp is None:
        return cfg

    with open(pp, "rb") as f:
        data = tomli.load(f)

    tool = data.get("tool", {}).get("prospector", {})
    cfg.data_dir = tool.get("data_dir", cfg.data_dir)
    cfg.log_dir = tool.get("log_dir", cfg.log_dir)
    cfg.default_region = tool.get("default_region", cfg.default_region)

    scrape_cfg = tool.get("scraping", {})
    cfg.scraping.delay = float(scrape_cfg.get("delay", cfg.scraping.delay))
    cfg.scraping.timeout = int(scrape_cfg.get("timeout", cfg.scraping.timeout))
    cfg.scraping.max_retries = int(scrape_cfg.get("max_retries", cfg.scraping.max_retries))

    log_cfg = tool.get("logging", {})
    cfg.logging.level = str(log_cfg.get("level", cfg.logging.level))
    cfg.logging.max_size_mb = int(log_cfg.get("max_size_mb", cfg.logging.max_size_mb))
    cfg.logging.backup_count = int(log_cfg.get("backup_count", cfg.logging.backup_count))

    return cfg


def _load_from_env(cfg: Config) -> Config:
    """Las vars de entorno PROSPECTOR_* sobreescriben."""
    env = os.environ.get
    if env("PROSPECTOR_DATA_DIR"):
        cfg.data_dir = env("PROSPECTOR_DATA_DIR")
    if env("PROSPECTOR_LOG_DIR"):
        cfg.log_dir = env("PROSPECTOR_LOG_DIR")
    if env("PROSPECTOR_LOG_LEVEL"):
        cfg.logging.level = env("PROSPECTOR_LOG_LEVEL")
    if env("PROSPECTOR_SCRAPE_DELAY"):
        cfg.scraping.delay = float(env("PROSPECTOR_SCRAPE_DELAY"))
    if env("PROSPECTOR_DEFAULT_REGION"):
        cfg.default_region = env("PROSPECTOR_DEFAULT_REGION")
    return cfg


# ---------------------------------------------------------------------------
# Singleton global
# ---------------------------------------------------------------------------

_config: Optional[Config] = None


def load_config(project_root: Optional[Path] = None) -> Config:
    """Carga/configuración global (singleton)."""
    global _config
    if _config is not None:
        return _config

    cfg = Config()
    if project_root:
        cfg._project_root = project_root

    cfg = _load_from_pyproject(cfg)
    cfg = _load_from_env(cfg)
    _config = cfg
    return _config
