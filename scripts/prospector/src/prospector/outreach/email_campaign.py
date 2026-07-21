"""EmailCampaign — Envío automatizado de campañas vía Resend API.

Uso desde CLI (después de registrar en main.py):
    prospector send-campaign --rubro inmobiliaria --dry-run
    prospector send-campaign --limit 5
    prospector send-campaign --rubro abogado --limit 3 --send

Arquitectura:
    EmailCampaign   → maneja la API de Resend (HTTP POST)
    TEMPLATES       → dict de templates HTML por rubro
    campaign_log    → evita re-envíos (archivo JSON)
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from prospector.core.logger import get_logger
from prospector.core.models import Prospect


# ---------------------------------------------------------------------------
# Auto-load .env from project root (busca hacia arriba desde cwd)
# ---------------------------------------------------------------------------

def _load_env_file() -> None:
    """Busca .env en cwd y directorios padres, carga vars en os.environ."""
    cwd = Path.cwd()
    for parent in [cwd] + list(cwd.parents):
        env_file = parent / ".env"
        if env_file.exists():
            try:
                with open(env_file, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, _, val = line.partition("=")
                        key = key.strip()
                        val = val.strip().strip("\"'")
                        if key and key not in os.environ:
                            os.environ[key] = val
            except OSError:
                pass
            break  # solo el primer .env encontrado


_load_env_file()

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Campaign log — tracking de prospectos contactados
# ---------------------------------------------------------------------------

CAMPAIGN_LOG = Path("data/campaign_log.json")


def _load_campaign_log() -> dict:
    if CAMPAIGN_LOG.exists():
        try:
            with open(CAMPAIGN_LOG) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_campaign_log(log_data: dict) -> None:
    CAMPAIGN_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(CAMPAIGN_LOG, "w") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)


def _already_sent(prospect_id: str) -> bool:
    """Check if prospect already received email from us."""
    log_data = _load_campaign_log()
    return prospect_id in log_data


def _mark_sent(prospect_id: str, rubro: str, to_email: str, subject: str) -> None:
    log_data = _load_campaign_log()
    log_data[prospect_id] = {
        "to": to_email,
        "rubro": rubro,
        "subject": subject,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_campaign_log(log_data)


# ---------------------------------------------------------------------------
# Templates HTML por rubro
# ---------------------------------------------------------------------------

# Mtsprz brand colors — Gmail-safe (light bg, dark text)
# Gmail strips dark backgrounds, so we use white bg with dark text
BRAND = {
    "accent": "#6366f1",
    "text": "#1a1a1a",
    "muted": "#666666",
    "border": "#e5e5e5",
    "bg": "#ffffff",
    "header_bg": "#f8f8ff",
}


def _base_html(body: str) -> str:
    """Wraps body content in Gmail-compatible email template.

    Rules:
    - bgcolor on tables (not CSS background)
    - Dark text on white bg
    - All styles inline
    """
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:{BRAND['text']}">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5">
<tr><td style="padding:24px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px">
<tr><td style="padding:32px 32px 0;text-align:center;border-bottom:1px solid {BRAND['border']}">
<div style="width:40px;height:40px;margin:0 auto 4px;background-color:{BRAND['header_bg']};border-radius:10px;line-height:40px;text-align:center">
<span style="color:{BRAND['accent']};font-size:20px;font-weight:700">M</span>
</div>
</td></tr>
<tr><td style="padding:24px 32px 0;color:{BRAND['text']};font-size:14px;line-height:1.6">
{body}
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid {BRAND['border']};text-align:center">
<p style="margin:0;font-size:11px;color:{BRAND['muted']}">Mtsprz &mdash; <a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def _build_email(prospect: Prospect, subject: str, body_text: str) -> tuple[str, str]:
    """Generate (subject, html) for a prospect."""
    html = _base_html(body_text)
    return subject, html


# Templates keyed by rubro. Each is a function(prospect) -> (subject, body_html)
TEMPLATES: dict[str, callable] = {}


def _template_inmobiliaria(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"propuesta para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Vi que <strong style="color:{BRAND['text']}">{p.empresa}</strong> está en {ciudad} trabajando con propiedades.
Hoy el 94% de las búsquedas de inmuebles parten en Google Maps o Google Search &mdash; tener presencia digital
bien optimizada marca la diferencia entre aparecer o quedar invisible.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
En <strong style="color:{BRAND['text']}">Mtsprz</strong> ayudamos a corredoras e inmobiliarias de la zona a captar
más leads con landing pages, SEO local y automatización por WhatsApp.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para mostrarte algunos casos de clientes similares?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


def _template_abogado(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"presencia digital para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Revisé el perfil digital de <strong style="color:{BRAND['text']}">{p.empresa}</strong> en {ciudad}.
Para estudios jurídicos, aparecer en Google Maps y tener un sitio web profesional es clave:
la mayoría de las personas busca abogado cerca de su ubicación.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
En <strong style="color:{BRAND['text']}">Mtsprz</strong> ayudamos a abogados de la zona a optimizar su presencia
en Google Maps + tener una web que convierta visitas en consultas.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para conversar?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


def _template_constructora(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"propuesta para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Vi que <strong style="color:{BRAND['text']}">{p.empresa}</strong> opera en {ciudad}.
Las constructoras que más proyectos cierran hoy tienen dos cosas: un sitio web con portafolio
de obras y un proceso automatizado de cotizaciones.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
En <strong style="color:{BRAND['text']}">Mtsprz</strong> ayudamos a constructoras a mostrar sus proyectos online
y a automatizar la respuesta a cotizaciones vía WhatsApp.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para mostrarte lo que hacemos?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


def _template_contador(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"automatización para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Sé que en <strong style="color:{BRAND['text']}">{p.empresa}</strong> tienen experiencia en
contabilidad y asesorías en {ciudad}. Muchos contadores pasan horas en tareas repetitivas
que podrían automatizar: Excel, conciliaciones, recordatorios SII.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
En <strong style="color:{BRAND['text']}">Mtsprz</strong> ayudamos a contadores a automatizar
procesos y tener presencia digital para captar nuevos clientes.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para conversar?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


def _template_hoteleria(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"propuesta para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Vi que <strong style="color:{BRAND['text']}">{p.empresa}</strong> está en {ciudad}.
Para hoteles y cabañas, tener web con booking directo + SEO local es lo que marca la diferencia
entre una reserva directa y una pérdida de comisión en Booking.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
En <strong style="color:{BRAND['text']}">Mtsprz</strong> ayudamos a hoteles de la zona
a captar reservas directas con landing pages optimizadas y automatización de respuestas.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para mostrarte algunos casos?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


def _template_restaurante(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"presencia digital para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Revisé el perfil de <strong style="color:{BRAND['text']}">{p.empresa}</strong> en {ciudad}.
Hoy los restaurantes que crecen tienen menú online, pedidos por WhatsApp y presencia en Google Maps.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
En <strong style="color:{BRAND['text']}">Mtsprz</strong> ayudamos a restaurantes a tener
menú digital + pedidos automatizados por WhatsApp.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para conversar?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


def _template_generico(p: Prospect) -> tuple[str, str]:
    ciudad = p.comuna or "tu zona"
    subject = f"propuesta para {p.empresa}"
    body = f"""
<p style="margin:0 0 16px;color:{BRAND['text']}">Hola,</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Vi que <strong style="color:{BRAND['text']}">{p.empresa}</strong> está en {ciudad}.
En Mtsprz ayudamos a negocios locales a tener presencia digital profesional &mdash;
sitio web, SEO, automatización con WhatsApp y marketing digital.
</p>
<p style="margin:0 0 16px;color:{BRAND['muted']}">
Nos especializamos en PYMES de la Región de Los Lagos.
</p>
<p style="margin:0 0 24px;color:{BRAND['muted']}">
¿Te parece si agendamos 15 min para mostrarte lo que hacemos?
</p>
<p style="margin:0;color:{BRAND['muted']}">Saludos,<br><strong style="color:{BRAND['text']}">Equipo Mtsprz</strong><br>
<a href="https://mtsprz.org" style="color:{BRAND['accent']};text-decoration:none">mtsprz.org</a></p>
"""
    return subject, body


# Register templates
TEMPLATES["inmobiliaria"] = _template_inmobiliaria
TEMPLATES["abogado"] = _template_abogado
TEMPLATES["constructora"] = _template_constructora
TEMPLATES["contador"] = _template_contador
TEMPLATES["hoteleria"] = _template_hoteleria
TEMPLATES["restaurante"] = _template_restaurante
TEMPLATES["spa"] = _template_generico
TEMPLATES["automotriz"] = _template_generico
TEMPLATES["dentista"] = _template_generico
TEMPLATES["gimnasio"] = _template_generico
TEMPLATES["otro"] = _template_generico
TEMPLATES["default"] = _template_generico

RUBRO_TEMPLATES = TEMPLATES  # public export


def get_template(rubro: str) -> callable:
    """Get template function for rubro, falling back to generic."""
    return TEMPLATES.get(rubro, TEMPLATES["default"])


# ---------------------------------------------------------------------------
# EmailSender — Resend API wrapper
# ---------------------------------------------------------------------------


class EmailSender:
    """Low-level email sender via Resend REST API.

    Usage:
        sender = EmailSender(api_key="re_...")
        ok = sender.send(to="x@y.cl", subject="Hola", html="<p>...</p>")
    """

    BASE_URL = "https://api.resend.com/emails"

    def __init__(self, api_key: str, from_email: str = "contacto@mtsprz.org",
                 from_name: str = "Mtsprz"):
        self.api_key = api_key
        self.from_addr = f"{from_name} <{from_email}>"

    def send(self, to: str, subject: str, html: str) -> bool:
        """Send one email via Resend API. Returns True on success."""
        if not self.api_key:
            log.error("No RESEND_API_KEY — set env var or pass --api-key")
            return False

        payload = json.dumps({
            "from": self.from_addr,
            "to": [to],
            "subject": subject,
            "html": html,
        }).encode("utf-8")

        req = urllib.request.Request(
            self.BASE_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MtsprzProspector/0.1",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode()
                if 200 <= resp.status < 300:
                    log.info("  ✓ Enviado a {to}: {subj}", to=to, subj=subject)
                    return True
                else:
                    log.error("  ✗ Error enviando a {to}: {code} {body}",
                              to=to, code=resp.status, body=body)
                    return False
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            log.error("  ✗ HTTP {code} enviando a {to}: {body}",
                      code=e.code, to=to, body=body)
            return False
        except Exception as e:
            log.error("  ✗ Excepción enviando a {to}: {e}", to=to, e=e)
            return False


# ---------------------------------------------------------------------------
# CampaignManager — orquesta envíos con tracking
# ---------------------------------------------------------------------------


class EmailCampaign:
    """Orquesta una campaña de email: filtra prospects, genera templates, envía.

    Usage:
        camp = EmailCampaign(api_key="re_...")
        camp.run(prospects, rubro="inmobiliaria", limit=5, dry_run=True)
    """

    def __init__(self, api_key: Optional[str] = None,
                 from_email: str = "contacto@mtsprz.org",
                 from_name: str = "Mtsprz"):
        self.api_key = api_key or os.environ.get("RESEND_API_KEY") or ""
        self.sender = EmailSender(self.api_key, from_email, from_name)

    # ------------------------------------------------------------------
    # Envío individual
    # ------------------------------------------------------------------

    def send_prospect(self, prospect: Prospect, dry_run: bool = False) -> bool:
        """Generate template and send to first email of prospect."""
        if not prospect.emails:
            log.warning("  ~ {empresa}: sin email, saltando", empresa=prospect.empresa)
            return False

        to_email = prospect.emails[0]
        prospect_id = prospect.id or prospect.empresa

        # Skip if already sent
        if _already_sent(prospect_id):
            return False

        # Generate template
        template_fn = get_template(prospect.rubro)
        subject, body_html = template_fn(prospect)

        # Wrap in full email template (Gmail-compatible)
        full_html = _base_html(body_html)

        if dry_run:
            log.info("  [DRY-RUN] A: {email} | {empresa} ({rubro}, {ciudad}) | Asunto: {subj}",
                     email=to_email, empresa=prospect.empresa,
                     rubro=prospect.rubro, ciudad=prospect.comuna or "?", subj=subject)
            log.info("  " + body_html[:120].replace("\n", " ") + "...")
            return True

        # Send
        ok = self.sender.send(to=to_email, subject=subject, html=full_html)
        if ok:
            _mark_sent(prospect_id, prospect.rubro, to_email, subject)
            # Small delay to avoid rate limits (Resend: ~5/sec)
            time.sleep(0.3)
        return ok

    # ------------------------------------------------------------------
    # Envío batch
    # ------------------------------------------------------------------

    def run(self, prospects: list[Prospect], rubro: Optional[str] = None,
            limit: int = 10, dry_run: bool = False) -> dict:
        """Run campaign. Returns stats dict.

        Args:
            prospects: List of prospects from DB
            rubro: Optional rubro filter
            limit: Max emails to send (0 = all)
            dry_run: Preview without sending
        """
        # Filter
        candidates = prospects
        if rubro:
            candidates = [p for p in candidates if p.rubro == rubro]

        # Only those with email
        candidates = [p for p in candidates if p.emails]

        # Remove already sent (unless dry-run)
        if not dry_run:
            antes = len(candidates)
            candidates = [p for p in candidates if not _already_sent(p.id or p.empresa)]
            log.info("  Filtrados {n} ya enviados previamente", n=antes - len(candidates))

        # Apply limit
        if limit > 0:
            candidates = candidates[:limit]

        if not candidates:
            log.info("  No hay prospectos para enviar")
            return {"sent": 0, "total": 0, "errors": 0}

        log.info("")
        log.info("═══ CAMPAÑA EMAIL ═══")
        if rubro:
            log.info("Rubro: {r}", r=rubro)
        log.info("A enviar: {n} prospectos", n=len(candidates))
        if dry_run:
            log.info("Modo: DRY-RUN (no se enviará nada)")
        log.info("")

        sent = 0
        errors = 0
        for p in candidates:
            ok = self.send_prospect(p, dry_run=dry_run)
            if ok:
                sent += 1
            else:
                errors += 1

        log.info("")
        log.info("═══ RESUMEN ═══")
        log.info("Enviados: {s}/{t}", s=sent, t=len(candidates))
        if errors:
            log.info("Errores: {e}", e=errors)
        log.info("Archivo de tracking: {f}", f=CAMPAIGN_LOG)
        log.info("")

        return {"sent": sent, "total": len(candidates), "errors": errors}
