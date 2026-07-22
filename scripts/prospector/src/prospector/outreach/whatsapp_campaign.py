"""WhatsAppCampaign — Envío de WhatsApp vía Evolution API.

Requiere Evolution API corriendo (local o VPS).

Uso:
    from prospector.outreach.whatsapp_campaign import WhatsAppCampaign
    camp = WhatsAppCampaign(
        base_url="http://localhost:8080",
        api_key="mtsprz-evolution-key-2026",
        instance="mtsprz-bot"
    )
    camp.run(prospects, limit=5)
"""

from __future__ import annotations

import json
import os
import random
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Tracking log (mismo formato que email_campaign)
# ---------------------------------------------------------------------------

WHATSAPP_LOG = Path("data/whatsapp_log.json")


def _load_log() -> dict:
    if WHATSAPP_LOG.exists():
        try:
            with open(WHATSAPP_LOG) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_log(log_data: dict) -> None:
    WHATSAPP_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(WHATSAPP_LOG, "w") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)


def _already_sent(prospect_id: str) -> bool:
    return prospect_id in _load_log()


def _mark_sent(prospect_id: str, rubro: str, to_number: str, message_preview: str) -> None:
    log_data = _load_log()
    log_data[prospect_id] = {
        "to": to_number,
        "rubro": rubro,
        "message": message_preview[:80],
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_log(log_data)


# ---------------------------------------------------------------------------
# Templates WhatsApp por rubro (texto plano)
# ---------------------------------------------------------------------------

def _wa_template_inmobiliaria(p: Prospect) -> str:
    ciudad = p.comuna or "tu zona"
    return (
        f"Hola, vi que {p.empresa} está en {ciudad} trabajando con propiedades. "
        f"💻 En Mtsprz ayudamos a corredoras a tener landing pages que conviertan "
        f"y automatización de leads por WhatsApp. "
        f"¿Te parece si te mando un par de ejemplos?"
    )


def _wa_template_abogado(p: Prospect) -> str:
    ciudad = p.comuna or "tu zona"
    return (
        f"Hola, revisé el perfil digital de {p.empresa} en {ciudad}. "
        f"Para estudios jurídicos, tener presencia en Google Maps + web profesional "
        f"es clave hoy. ¿Te interesaría ver cómo optimizarlo?"
    )


def _wa_template_constructora(p: Prospect) -> str:
    ciudad = p.comuna or "tu zona"
    return (
        f"Hola, vi que {p.empresa} opera en {ciudad}. "
        f"Las constructoras que más cierran proyectos hoy tienen portafolio web "
        f"y cotizaciones automatizadas. En Mtsprz hacemos eso. "
        f"¿Te parece si te muestro?"
    )


def _wa_template_contador(p: Prospect) -> str:
    ciudad = p.comuna or "tu zona"
    return (
        f"Hola, sé que en {p.empresa} tienen experiencia en contabilidad "
        f"en {ciudad}. Muchos contadores están automatizando procesos con nosotros "
        f"(Excel, recordatorios SII). ¿Te interesaría conversar?"
    )


def _wa_template_generico(p: Prospect) -> str:
    ciudad = p.comuna or "tu zona"
    return (
        f"Hola, vi que {p.empresa} está en {ciudad}. "
        f"En Mtsprz ayudamos a negocios locales con presencia digital, "
        f"automatización y marketing. ¿Tienes 5 min para que te cuente?"
    )


WA_TEMPLATES = {
    "inmobiliaria": _wa_template_inmobiliaria,
    "abogado": _wa_template_abogado,
    "constructora": _wa_template_constructora,
    "contador": _wa_template_contador,
    "hoteleria": _wa_template_generico,
    "restaurante": _wa_template_generico,
    "spa": _wa_template_generico,
    "automotriz": _wa_template_generico,
    "dentista": _wa_template_generico,
    "gimnasio": _wa_template_generico,
    "otro": _wa_template_generico,
}


def _get_wa_template(rubro: str):
    return WA_TEMPLATES.get(rubro, _wa_template_generico)


# ---------------------------------------------------------------------------
# WhatsApp Campaign
# ---------------------------------------------------------------------------


class WhatsAppCampaign:
    """Envía WhatsApp a prospects vía Evolution API.

    Args:
        base_url: URL de Evolution API (ej: http://localhost:8080)
        api_key: API key configurada en AUTHENTICATION_API_KEY
        instance: Nombre de la instancia (ej: mtsprz-bot)
    """

    def __init__(self, base_url: str = "http://localhost:8080",
                 api_key: Optional[str] = None,
                 instance: str = "mtsprz-bot"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or os.environ.get("EVOLUTION_API_KEY", "mtsprz-evolution-key-2026")
        self.instance = instance
        self.headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    def health(self) -> bool:
        """Check if Evolution API is running."""
        try:
            req = urllib.request.Request(f"{self.base_url}/", headers=self.headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Instance management
    # ------------------------------------------------------------------

    def instance_exists(self) -> bool:
        """Check if instance is created."""
        req = urllib.request.Request(
            f"{self.base_url}/instance/fetchInstances",
            headers=self.headers,
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                instances = data if isinstance(data, list) else []
                return any(i.get("instance", {}).get("instanceName") == self.instance for i in instances)
        except Exception:
            return False

    def create_instance(self) -> bool:
        """Create instance in Evolution API."""
        payload = json.dumps({
            "instanceName": self.instance,
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}/instance/create",
            data=payload,
            headers=self.headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status in (200, 201)
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            log.error("Error creando instancia: {code} {body}", code=e.code, body=body)
            return False

    def get_qr_url(self) -> str:
        """URL para ver/descargar QR."""
        return f"{self.base_url}/instance/qrcode/{self.instance}?apikey={self.api_key}"

    def is_connected(self) -> bool:
        """Check if WhatsApp is connected."""
        req = urllib.request.Request(
            f"{self.base_url}/instance/connectionState/{self.instance}",
            headers=self.headers,
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                state = data.get("state", "") if isinstance(data, dict) else ""
                return state == "open"
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Send message
    # ------------------------------------------------------------------

    def send_message(self, phone: str, text: str) -> bool:
        """Send a WhatsApp text message via Evolution API.

        Args:
            phone: Chilean number (e.g. 56912345678 — without + or spaces)
            text: Message text
        """
        # Normalize phone: remove +, spaces, dashes
        phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        # Ensure it starts with 56 (Chile)
        if not phone.startswith("56"):
            if phone.startswith("9"):
                phone = f"56{phone}"
            elif phone.startswith("0"):
                phone = f"56{phone[1:]}"
            else:
                phone = f"56{phone}"

        payload = json.dumps({
            "number": phone,
            "textMessage": {
                "text": text,
            },
            # Simular typing y delay realista
            "options": {
                "delay": random.randint(1000, 3000),
                "presence": "composing",
            },
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self.base_url}/message/sendText/{self.instance}",
            data=payload,
            headers=self.headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status in (200, 201):
                    log.info("  ✓ WhatsApp a {phone}: {preview}",
                             phone=phone, preview=text[:60])
                    return True
                return False
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            log.error("  ✗ Error WhatsApp a {phone}: {code} {body}",
                      phone=phone, code=e.code, body=body[:150])
            return False
        except Exception as e:
            log.error("  ✗ Excepción enviando a {phone}: {e}", phone=phone, e=e)
            return False

    # ------------------------------------------------------------------
    # Run campaign
    # ------------------------------------------------------------------

    def run(self, prospects: list[Prospect], rubro: Optional[str] = None,
            limit: int = 10, dry_run: bool = False, delay_range: tuple = (30, 90)) -> dict:
        """Run WhatsApp campaign.

        Args:
            prospects: Lista de prospects
            rubro: Filtrar por rubro
            limit: Máx a enviar (0 = todos)
            dry_run: Solo previsualizar
            delay_range: Delay aleatorio entre mensajes (segundos)
        """
        # Filter
        candidates = prospects
        if rubro:
            candidates = [p for p in candidates if p.rubro == rubro]
        candidates = [p for p in candidates if p.telefonos]

        if not dry_run:
            antes = len(candidates)
            candidates = [p for p in candidates if not _already_sent(p.id or p.empresa)]
            log.info("  Filtrados {n} ya enviados", n=antes - len(candidates))

        if limit > 0:
            candidates = candidates[:limit]

        if not candidates:
            log.info("  No hay prospectos para enviar")
            return {"sent": 0, "total": 0}

        log.info("")
        log.info("═══ CAMPAÑA WHATSAPP ═══")
        if rubro:
            log.info("Rubro: {r}", r=rubro)
        log.info("A enviar: {n} prospectos", n=len(candidates))
        log.info("Delay: {min}-{max}s aleatorio", min=delay_range[0], max=delay_range[1])
        if dry_run:
            log.info("Modo: DRY-RUN")
        log.info("")

        sent = 0
        errors = 0

        for i, p in enumerate(candidates):
            phone = p.telefonos[0]
            template_fn = _get_wa_template(p.rubro)
            text = template_fn(p)
            prospect_id = p.id or p.empresa

            if not dry_run and _already_sent(prospect_id):
                continue

            log.info("  [{i}/{n}] {empresa} → {phone} ({rubro}, {ciudad})",
                     i=i + 1, n=len(candidates), empresa=p.empresa,
                     phone=phone, rubro=p.rubro, ciudad=p.comuna or "?")

            if dry_run:
                log.info("    MSG: {text}", text=text[:80])
                sent += 1
                continue

            ok = self.send_message(phone, text)
            if ok:
                _mark_sent(prospect_id, p.rubro, phone, text)
                sent += 1
            else:
                errors += 1

            # Delay entre mensajes (simular humano)
            if i < len(candidates) - 1:
                delay = random.randint(delay_range[0], delay_range[1])
                log.info("    ⏳ esperando {d}s...", d=delay)
                if not dry_run:
                    time.sleep(delay)

        log.info("")
        log.info("═══ RESUMEN ═══")
        log.info("Enviados: {s}/{t}", s=sent, t=len(candidates))
        if errors:
            log.info("Errores: {e}", e=errors)
        log.info("")

        return {"sent": sent, "total": len(candidates), "errors": errors}

    # ------------------------------------------------------------------
    # Set up instance (full flow)
    # ------------------------------------------------------------------

    def setup(self) -> bool:
        """Full setup: create instance and show QR URL."""
        log.info("Verificando Evolution API...")
        if not self.health():
            log.error("Evolution API no responde en {url}", url=self.base_url)
            log.error("¿Está corriendo? docker compose up -d")
            return False

        log.info("✓ API responde")

        if not self.instance_exists():
            log.info("Creando instancia '{inst}'...", inst=self.instance)
            if not self.create_instance():
                log.error("No se pudo crear la instancia")
                return False
            log.info("✓ Instancia creada")
        else:
            log.info("✓ Instancia ya existe")

        log.info("")
        log.info("══════════════ ESCANEA EL QR ══════════════")
        log.info("Abre esta URL en tu navegador:")
        log.info("")
        log.info("  {url}", url=self.get_qr_url())
        log.info("")
        log.info("Escanea el QR con WhatsApp (como WhatsApp Web)")
        log.info("============================================")
        log.info("")

        # Esperar conexión
        log.info("Esperando conexión...")
        for i in range(60):
            if self.is_connected():
                log.info("✓ WhatsApp conectado!")
                return True
            time.sleep(2)
            if i % 5 == 0 and i > 0:
                log.info("  Esperando... ({i}s)", i=i * 2)

        log.error("Tiempo de espera agotado. Revisa el QR")
        return False
