"""MtsprzSync — Sincroniza prospects → leads en NeonDB vía API.

Push de prospects desde la DB JSON del prospector a la tabla `leads`
del sistema Mtsprz para centralizar todo en el panel admin.

Uso:
    from prospector.outreach.mtsprz_sync import MtsprzSync
    sync = MtsprzSync(api_url="http://localhost:4321", api_token="...")
    sync.push_prospects(prospects, limit=10)
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect

log = get_logger(__name__)

SYNC_LOG = Path("data/mtsprz_sync_log.json")

RUBRO_TO_SERVICE = {
    "inmobiliaria": "web",
    "abogado": "web",
    "constructora": "web",
    "arquitecto": "web",
    "contador": "seo",
    "dentista": "seo",
    "salud": "seo",
    "hoteleria": "web",
    "restaurante": "marketing",
    "tienda": "web",
    "automotriz": "marketing",
    "gimnasio": "marketing",
    "spa": "marketing",
    "turismo": "web",
    "diseno": "web",
    "otro": None,
}


def _load_log() -> dict:
    if SYNC_LOG.exists():
        try:
            with open(SYNC_LOG) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_log(log_data: dict) -> None:
    SYNC_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(SYNC_LOG, "w") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)


def _already_pushed(prospect_id: str) -> bool:
    return prospect_id in _load_log()


def _mark_pushed(prospect_id: str, lead_id: int, empresa: str) -> None:
    log_data = _load_log()
    log_data[prospect_id] = {
        "lead_id": lead_id,
        "empresa": empresa,
        "pushed_at": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat(),
    }
    _save_log(log_data)


class MtsprzSync:
    """Sincroniza prospects desde prospector a leads Mtsprz.

    Args:
        api_url: URL del sitio Mtsprz (ej: http://localhost:4321)
        api_token: Bearer token JWT de admin
    """

    def __init__(self, api_url: str = "http://localhost:4321",
                 api_token: Optional[str] = None):
        self.api_url = api_url.rstrip("/")
        self.api_token = api_token or os.environ.get("MTSPRZ_API_TOKEN", "")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_token}",
        }

    def health(self) -> bool:
        """Check if Mtsprz API responds."""
        try:
            req = urllib.request.Request(
                f"{self.api_url}/api/whatsapp/send",
                headers=self.headers,
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except urllib.error.HTTPError as e:
            return e.code in (200, 401, 403)  # API exists, auth may differ
        except Exception:
            return False

    def push_prospect(self, p: Prospect, dry_run: bool = False,
                      _retries: int = 0) -> Optional[int]:
        """Push a single prospect to Mtsprz leads.

        Returns:
            lead_id if successful, None otherwise
        """
        if not p.telefonos and not p.emails:
            log.debug("  ↦ {empresa}: sin telefono ni email, skip",
                      empresa=p.empresa)
            return None

        phone = p.telefonos[0] if p.telefonos else None
        email = p.emails[0] if p.emails else None
        service = RUBRO_TO_SERVICE.get(p.rubro)

        # Build lead payload
        payload = {
            "name": p.empresa,
            "phone": phone,
            "email": email,
            "source": p.fuente or "web",
            "service_interest": service or p.rubro,
            "message": (
                f"Prospecto desde {p.fuente or 'prospector'} | "
                f"Rubro: {p.rubro} | Comuna: {p.comuna} | "
                f"Score digital: {p.digital_score}/100 | "
                f"Web: {p.sitio_web or 'sin web'}"
            ),
            "metadata": {
                "prospect_id": p.id,
                "rubro": p.rubro,
                "comuna": p.comuna,
                "digital_score": p.digital_score,
                "fuente": p.fuente,
                "sitio_web": p.sitio_web,
                "google_rating": p.google_rating,
                "google_reviews": p.google_reviews,
            },
        }

        if dry_run:
            log.info("  ↦ [DRY-RUN] {empresa} → {phone} ({rubro}, score={score})",
                     empresa=p.empresa, phone=phone or email,
                     rubro=p.rubro, score=p.digital_score)
            return 999  # Fake ID

        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.api_url}/api/leads",
            data=body,
            headers=self.headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                lead_id = data.get("lead", {}).get("id")
                if lead_id:
                    log.info("  ✓ {empresa} → lead #{id}",
                             empresa=p.empresa, id=lead_id)
                    _mark_pushed(p.id or p.empresa, lead_id, p.empresa)
                    return lead_id
                log.warning("  ? {empresa}: respuesta sin id: {data}",
                            empresa=p.empresa, data=data)
                return None
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            if e.code == 429 and _retries < 3:
                log.warning("  ⏳ Rate limited, esperando 30s (reintento {r}/3)...",
                            r=_retries + 1)
                time.sleep(30)
                return self.push_prospect(p, dry_run=False, _retries=_retries + 1)
            if e.code == 429:
                log.error("  ✗ {empresa}: rate limit persistente (3 intentos), skip",
                          empresa=p.empresa)
                return None
            log.error("  ✗ {empresa}: HTTP {code} - {body}",
                      empresa=p.empresa, code=e.code, body=body[:120])
            return None
        except Exception as e:
            log.error("  ✗ {empresa}: {e}", empresa=p.empresa, e=e)
            return None

    def push_prospects(self, prospects: list[Prospect],
                       rubro: Optional[str] = None,
                       limit: int = 0,
                       min_score: int = 0,
                       dry_run: bool = False,
                       delay: float = 1.0) -> dict:
        """Push multiple prospects to Mtsprz leads.

        Args:
            prospects: Lista de prospects
            rubro: Filtrar por rubro
            limit: Max a enviar (0 = todos)
            min_score: Score digital mínimo (0-100)
            dry_run: Solo previsualizar
            delay: Delay entre requests (segundos)
        """
        # Filter
        candidates = list(prospects)
        if rubro:
            candidates = [p for p in candidates if p.rubro == rubro]
        if min_score > 0:
            candidates = [p for p in candidates if p.digital_score >= min_score]
        candidates = [p for p in candidates if p.telefonos or p.emails]

        if not dry_run:
            antes = len(candidates)
            candidates = [p for p in candidates
                          if not _already_pushed(p.id or p.empresa)]
            log.info("  Filtrados {n} ya sincronizados", n=antes - len(candidates))

        if limit > 0:
            candidates = candidates[:limit]

        if not candidates:
            log.info("  No hay prospects para sincronizar")
            return {"pushed": 0, "total": 0}

        log.info("")
        log.info("═══ SINCRONIZAR PROSPECTS → LEADS ═══")
        if rubro:
            log.info("Rubro: {r}", r=rubro)
        log.info("Score mínimo: {s}", s=min_score)
        log.info("A sincronizar: {n} prospects", n=len(candidates))
        if dry_run:
            log.info("Modo: DRY-RUN")
        log.info("")

        pushed = 0
        errors = 0

        for i, p in enumerate(candidates):
            log.info("  [{i}/{n}] {empresa} ({rubro}, score={score})",
                     i=i + 1, n=len(candidates), empresa=p.empresa,
                     rubro=p.rubro, score=p.digital_score)

            result = self.push_prospect(p, dry_run=dry_run)
            if result:
                pushed += 1
            else:
                errors += 1

            if i < len(candidates) - 1 and delay > 0 and not dry_run:
                time.sleep(delay)

        log.info("")
        log.info("═══ RESUMEN ═══")
        log.info("Sincronizados: {p}/{t}", p=pushed, t=len(candidates))
        if errors:
            log.info("Errores: {e}", e=errors)
        log.info("")

        return {"pushed": pushed, "total": len(candidates), "errors": errors}
