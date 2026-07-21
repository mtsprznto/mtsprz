"""Database — JSON store con escritura atómica, backups y desduplicación.

La base de datos es un archivo JSON con la siguiente estructura:

    {
        "version": 1,
        "last_updated": "2026-07-20T14:30:00Z",
        "prospects": [ ... ]
    }

Escritura atómica: escribe a un .tmp y hace rename (POSIX atomic).
Backup automático: antes de cada escritura copia el archivo actual a backups/.
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Optional

from prospector.core.config import load_config
from prospector.core.logger import get_logger
from prospector.core.models import Prospect

log = get_logger(__name__)


class JSONDatabase:
    """Almacenamiento JSON con protección ante corrupción."""

    def __init__(self, file_path: Optional[Path] = None):
        cfg = load_config()
        self._file = file_path or cfg.prospects_file
        self._backups_dir = cfg.backups_dir
        self._lock = Lock()

        # Asegurar directorios
        self._file.parent.mkdir(parents=True, exist_ok=True)
        self._backups_dir.mkdir(parents=True, exist_ok=True)

        # Cache en memoria para búsquedas rápidas
        self._prospects: list[Prospect] = []
        self._loaded = False

    # ------------------------------------------------------------------
    # Carga / Guardado atómico
    # ------------------------------------------------------------------

    def _load_raw(self) -> dict:
        """Carga el JSON crudo desde disco."""
        if not self._file.exists():
            return {"version": 1, "last_updated": "", "prospects": []}
        try:
            with open(self._file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            log.error("Error leyendo {file}: {err}", file=self._file, err=e)
            # Intentar cargar backup más reciente
            backup = self._latest_backup()
            if backup:
                log.warning("Recuperando desde backup: {b}", b=backup)
                with open(backup, "r", encoding="utf-8") as f:
                    return json.load(f)
            return {"version": 1, "last_updated": "", "prospects": []}

    def load(self) -> list[Prospect]:
        """Carga todos los prospectos en memoria (cacheados)."""
        if self._loaded:
            return self._prospects
        data = self._load_raw()
        self._prospects = [Prospect(**p) for p in data.get("prospects", [])]
        self._loaded = True
        log.debug("Cargados {n} prospectos desde {f}", n=len(self._prospects), f=self._file)
        return self._prospects

    def _save_atomic(self, data: dict) -> None:
        """Guarda con escritura atómica: tmp → rename."""
        tmp = self._file.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        tmp.replace(self._file)  # POSIX atomic rename
        log.debug("Guardados {n} prospectos en {f}", n=len(data["prospects"]), f=self._file)

    def _backup(self) -> None:
        """Copia de seguridad antes de modificar."""
        if not self._file.exists():
            return
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_path = self._backups_dir / f"prospects_{ts}.json"
        shutil.copy2(self._file, backup_path)
        # Limpiar backups viejos (mantener últimos 20)
        backups = sorted(self._backups_dir.glob("prospects_*.json"))
        for old in backups[:-20]:
            old.unlink(missing_ok=True)

    def _latest_backup(self) -> Optional[Path]:
        backups = sorted(self._backups_dir.glob("prospects_*.json"))
        return backups[-1] if backups else None

    def flush(self) -> int:
        """Escribe los cambios a disco. Retorna cantidad de prospectos guardados."""
        with self._lock:
            self._backup()
            data = {
                "version": 1,
                "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "prospects": [p.model_dump() for p in self._prospects],
            }
            self._save_atomic(data)
        return len(self._prospects)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def all(self) -> list[Prospect]:
        """Retorna todos los prospectos (cargados)."""
        return self.load()

    def get_by_id(self, pid: str) -> Optional[Prospect]:
        for p in self.load():
            if p.id == pid:
                return p
        return None

    def add(self, prospect: Prospect, auto_flush: bool = True) -> Prospect:
        """Agrega un prospecto (desduplicado por empresa+comuna+teléfono)."""
        existing = self._find_duplicate(prospect)
        if existing:
            log.debug("Duplicado encontrado: {e} en {c} — fusionando", e=prospect.empresa, c=prospect.comuna)
            return self._merge(existing, prospect)

        self._prospects.append(prospect)
        log.info("Agregado: {e} ({r}) en {c}", e=prospect.empresa, r=prospect.rubro, c=prospect.comuna)
        if auto_flush:
            self.flush()
        return prospect

    def add_batch(self, prospects: list[Prospect], auto_flush: bool = True) -> int:
        """Agrega múltiples prospectos en lote. Retorna cantidad de nuevos."""
        count = 0
        for p in prospects:
            if not self._find_duplicate(p):
                self._prospects.append(p)
                count += 1
        if auto_flush and count > 0:
            self.flush()
        return count

    def update(self, pid: str, **updates) -> Optional[Prospect]:
        """Actualiza campos de un prospecto por ID."""
        for i, p in enumerate(self._prospects):
            if p.id == pid:
                updated = p.model_copy(update={**updates, "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")})
                self._prospects[i] = updated
                self.flush()
                log.info("Actualizado: {e} ({id})", e=updated.empresa, id=pid)
                return updated
        return None

    def delete(self, pid: str) -> bool:
        """Elimina un prospecto por ID."""
        before = len(self._prospects)
        self._prospects = [p for p in self._prospects if p.id != pid]
        if len(self._prospects) < before:
            self.flush()
            return True
        return False

    def count(self) -> int:
        return len(self.load())

    # ------------------------------------------------------------------
    # Desduplicación interna
    # ------------------------------------------------------------------

    def _find_duplicate(self, prospect: Prospect) -> Optional[Prospect]:
        """Busca duplicados por: RUT > teléfono > nombre+fuzzy."""
        for existing in self._prospects:
            # Por RUT
            if prospect.rut and existing.rut and prospect.rut == existing.rut:
                return existing
            # Por teléfono (cualquier coincidencia)
            if prospect.telefonos and existing.telefonos:
                if any(t in existing.telefonos for t in prospect.telefonos):
                    return existing
            # Por nombre exacto + misma comuna
            if (prospect.empresa.lower().strip() == existing.empresa.lower().strip()
                    and prospect.comuna.lower() == existing.comuna.lower()):
                return existing
        return None

    def _merge(self, existing: Prospect, nuevo: Prospect) -> Prospect:
        """Fusiona datos del nuevo prospecto en el existente (sin perder datos)."""
        updates = {}
        if not existing.rut and nuevo.rut:
            updates["rut"] = nuevo.rut
        if not existing.sitio_web and nuevo.sitio_web:
            updates["sitio_web"] = nuevo.sitio_web
        if not existing.google_maps_url and nuevo.google_maps_url:
            updates["google_maps_url"] = nuevo.google_maps_url

        # Fusionar teléfonos
        existing_phones = set(existing.telefonos)
        new_phones = [t for t in nuevo.telefonos if t not in existing_phones]
        if new_phones:
            updates["telefonos"] = existing.telefonos + new_phones

        # Fusionar emails
        existing_emails = set(existing.emails)
        new_emails = [e for e in nuevo.emails if e not in existing_emails]
        if new_emails:
            updates["emails"] = existing.emails + new_emails

        # Mejor rating
        if nuevo.google_rating is not None:
            if existing.google_rating is None or nuevo.google_rating > existing.google_rating:
                updates["google_rating"] = nuevo.google_rating

        if nuevo.google_reviews > existing.google_reviews:
            updates["google_reviews"] = nuevo.google_reviews

        # Fuente combinada
        if nuevo.fuente and nuevo.fuente not in existing.fuente:
            updates["fuente"] = f"{existing.fuente}+{nuevo.fuente}"

        if updates:
            return self.update(existing.id, **updates) or existing
        return existing
