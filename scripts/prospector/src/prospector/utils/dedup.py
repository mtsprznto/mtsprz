"""Deduplicator — Detecta y fusiona prospectos duplicados.

Usa múltiples estrategias:
  1. RUT exacto
  2. Teléfono exacto (cualquier coincidencia)
  3. Nombre fuzzy (thefuzz) + misma comuna
"""

from __future__ import annotations

from typing import Optional

from thefuzz import fuzz

from prospector.core.logger import get_logger
from prospector.core.models import Prospect

log = get_logger(__name__)

# Umbral fuzzy para considerar duplicado (0-100)
FUZZY_THRESHOLD = 85


class DuplicateGroup:
    """Grupo de prospectos que son el mismo negocio."""

    def __init__(self, prospects: list[Prospect]):
        self.prospects = prospects

    @property
    def mejor(self) -> Prospect:
        """Retorna el prospecto con más datos (no necesariamente el más nuevo)."""
        return max(self.prospects, key=self._data_quality_score)

    @staticmethod
    def _data_quality_score(p: Prospect) -> int:
        score = 0
        if p.rut:
            score += 20
        if p.telefonos:
            score += 15
        if p.emails:
            score += 15
        if p.sitio_web:
            score += 15
        if p.google_maps_url:
            score += 10
        if p.direccion:
            score += 10
        if p.redes:
            score += 10
        score += p.digital_score
        return score


class Deduplicator:
    """Analiza y resuelve duplicados en la base de datos."""

    def find_duplicates(self, prospects: list[Prospect]) -> list[DuplicateGroup]:
        """Encuentra grupos de prospectos duplicados.

        Returns:
            Lista de grupos de duplicados.
        """
        groups: list[DuplicateGroup] = []
        visited = set()

        for i, p1 in enumerate(prospects):
            if i in visited:
                continue
            group = [i]
            for j, p2 in enumerate(prospects):
                if j <= i or j in visited:
                    continue
                if self._is_duplicate(p1, p2):
                    group.append(j)
                    visited.add(j)
            if len(group) > 1:
                visited.add(i)
                groups.append(DuplicateGroup([prospects[idx] for idx in group]))

        return groups

    def _is_duplicate(self, a: Prospect, b: Prospect) -> bool:
        """Determina si dos prospectos son el mismo negocio."""

        # 1. RUT exacto
        if a.rut and b.rut and a.rut == b.rut:
            return True

        # 2. Teléfono en común
        if a.telefonos and b.telefonos:
            if any(t in b.telefonos for t in a.telefonos):
                return True

        # 3. Email en común
        if a.emails and b.emails:
            if any(e in b.emails for e in a.emails):
                return True

        # 4. Nombre fuzzy + misma comuna
        if a.comuna and b.comuna and a.comuna.lower() == b.comuna.lower():
            ratio = fuzz.token_sort_ratio(a.empresa.lower(), b.empresa.lower())
            if ratio >= FUZZY_THRESHOLD:
                log.trace(
                    "Fuzzy match ({r}%): {a} ↔ {b} en {c}",
                    r=ratio, a=a.empresa, b=b.empresa, c=a.comuna,
                )
                return True

        return False

    def merge_duplicates(
        self, prospects: list[Prospect], auto_remove: bool = False
    ) -> list[Prospect]:
        """Fusiona duplicados, dejando el mejor de cada grupo.

        Args:
            prospects: Lista completa de prospectos.
            auto_remove: Si True, elimina los duplicados (merge automático).

        Returns:
            Lista sin duplicados (si auto_remove=True).
        """
        groups = self.find_duplicates(prospects)
        if not groups:
            return prospects

        keep_ids = set()
        remove_ids = set()

        for group in groups:
            best = group.mejor
            keep_ids.add(best.id)
            for p in group.prospects:
                if p.id != best.id:
                    remove_ids.add(p.id)
            log.info(
                "Duplicado: {best} (id={id}) absorbe a {n} otros",
                best=best.empresa, id=best.id, n=len(group.prospects) - 1,
            )

        if auto_remove:
            result = [p for p in prospects if p.id not in remove_ids]
            log.info(
                "Fusionados {n} grupos, eliminados {r} duplicados",
                n=len(groups), r=len(remove_ids),
            )
            return result

        # Solo reportar
        log.info(
            "Encontrados {n} grupos de duplicados ({r} registros)",
            n=len(groups), r=sum(len(g.prospects) for g in groups),
        )
        return prospects
