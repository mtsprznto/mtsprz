"""Logger — Logging estructurado con formato {key=value} y rotación.

Uso:
    from prospector.core.logger import get_logger
    log = get_logger(__name__)
    log.info("Scrapeando", provincia="Llanquihue", query="inmobiliaria")
    log.error("Error HTTP: {msg}", msg=str(e))
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Optional

from prospector.core.config import load_config

# Nivel TRACE (entre DEBUG y NOTSET)
TRACE_LEVEL = 5
logging.addLevelName(TRACE_LEVEL, "TRACE")


# ---------------------------------------------------------------------------
# Structured Logger — envuelve logging.Logger con soporte kwargs
# ---------------------------------------------------------------------------

class StructuredLogger:
    """Wrapper que permite log estructurado estilo {key} + kwargs."""

    def __init__(self, logger: logging.Logger):
        self._logger = logger

    def _fmt(self, msg: str, args: tuple, kwargs: dict) -> str:
        """Formatea mensaje con kwargs interpolados + args posicionales.

        Soporta:
          - log.info("Procesando {n} items", n=10)  → "Procesando 10 items"
          - log.info("Error: %s", str(e))             → "Error: timeout"
          - log.info("Hecho", duracion="2s")           → "Hecho | duracion=2s"
        """
        if args:
            try:
                msg = msg % args
            except TypeError:
                pass
        if kwargs:
            # Intentar interpolación con .format()
            try:
                msg = msg.format(**kwargs)
            except (KeyError, ValueError, IndexError):
                # Si falla, append como contexto key=value
                context = " ".join(f"{k}={v}" for k, v in kwargs.items())
                msg = f"{msg} | {context}"
        return msg

    def trace(self, msg: str, *args, **kwargs) -> None:
        if self._logger.isEnabledFor(TRACE_LEVEL):
            self._logger._log(TRACE_LEVEL, self._fmt(msg, args, kwargs), ())

    def debug(self, msg: str, *args, **kwargs) -> None:
        if self._logger.isEnabledFor(logging.DEBUG):
            self._logger._log(logging.DEBUG, self._fmt(msg, args, kwargs), ())

    def info(self, msg: str, *args, **kwargs) -> None:
        if self._logger.isEnabledFor(logging.INFO):
            self._logger._log(logging.INFO, self._fmt(msg, args, kwargs), ())

    def warning(self, msg: str, *args, **kwargs) -> None:
        if self._logger.isEnabledFor(logging.WARNING):
            self._logger._log(logging.WARNING, self._fmt(msg, args, kwargs), ())

    def error(self, msg: str, *args, **kwargs) -> None:
        if self._logger.isEnabledFor(logging.ERROR):
            self._logger._log(logging.ERROR, self._fmt(msg, args, kwargs), ())

    def critical(self, msg: str, *args, **kwargs) -> None:
        if self._logger.isEnabledFor(logging.CRITICAL):
            self._logger._log(logging.CRITICAL, self._fmt(msg, args, kwargs), ())

    def exception(self, msg: str, *args, exc_info=True, **kwargs) -> None:
        self._logger.exception(self._fmt(msg, args, kwargs), exc_info=exc_info)


# ---------------------------------------------------------------------------
# Formato consola coloreado
# ---------------------------------------------------------------------------

class ColoredFormatter(logging.Formatter):
    """Formatter con colores ANSI para consola."""

    COLORS = {
        "TRACE": "\033[90m",
        "DEBUG": "\033[94m",
        "INFO": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
        "CRITICAL": "\033[91m\033[1m",
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        ts = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(5)
        name = record.name.ljust(28)
        c = self.COLORS.get(record.levelname, "")
        return f"{c}{ts} [{level}] {name} | {record.getMessage()}{self.RESET}"


class PlainFormatter(logging.Formatter):
    """Formatter simple para archivo."""

    def format(self, record: logging.LogRecord) -> str:
        ts = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(5)
        name = record.name.ljust(28)
        return f"{ts} [{level}] {name} | {record.getMessage()}"


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

_loggers: dict[str, StructuredLogger] = {}


def setup_logger(
    name: str = "prospector",
    level: Optional[str] = None,
    log_file: Optional[Path] = None,
    error_log_file: Optional[Path] = None,
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 5,
    console: bool = True,
) -> StructuredLogger:
    """Configura el logger raíz del sistema."""
    cfg = load_config()
    level = level or cfg.logging.level

    logger = logging.getLogger(name)
    logger.setLevel(TRACE_LEVEL)
    logger.handlers.clear()

    plain_fmt = PlainFormatter()
    color_fmt = ColoredFormatter()

    # Archivo rotativo
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        fh = RotatingFileHandler(str(log_file), maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8")
        fh.setLevel(getattr(logging, level.upper(), logging.INFO))
        fh.setFormatter(plain_fmt)
        logger.addHandler(fh)

    # Archivo solo errores
    if error_log_file:
        error_log_file.parent.mkdir(parents=True, exist_ok=True)
        eh = RotatingFileHandler(str(error_log_file), maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8")
        eh.setLevel(logging.ERROR)
        eh.setFormatter(plain_fmt)
        logger.addHandler(eh)

    # Consola
    if console:
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(getattr(logging, level.upper(), logging.INFO))
        ch.setFormatter(color_fmt)
        logger.addHandler(ch)

    logger.propagate = False

    wrapped = StructuredLogger(logger)
    _loggers[name] = wrapped
    return wrapped


def get_logger(name: str = "prospector") -> StructuredLogger:
    """Obtiene un logger estructurado."""
    if name in _loggers:
        return _loggers[name]
    base = logging.getLogger(f"prospector.{name}")
    base.setLevel(TRACE_LEVEL)
    wrapped = StructuredLogger(base)
    _loggers[name] = wrapped
    return wrapped
