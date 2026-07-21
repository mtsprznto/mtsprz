"""Validador de emails con detección de emails temporales/desechables.

Usa regex + verificación de dominio contra lista conocida de
proveedores de email temporal.
"""

from __future__ import annotations

import re

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

# Dominios de email temporal/conocidos (parcial)
_TEMP_DOMAINS: set[str] = {
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "tempmail.com",
    "throwaway.email",
    "yopmail.com",
    "sharklasers.com",
    "temp-mail.org",
    "fakeinbox.com",
    "maildrop.cc",
    "getnada.com",
    "trashmail.com",
    "tempr.email",
}


def es_email_valido(email: str, check_temp: bool = False) -> bool:
    """Valida formato de email.

    Args:
        email: Dirección de email.
        check_temp: Si True, rechaza emails temporales/desechables.

    Returns:
        True si el email tiene formato válido.
    """
    if not email or not _EMAIL_RE.match(email.strip()):
        return False
    if check_temp:
        dominio = email.split("@")[1].lower()
        if dominio in _TEMP_DOMAINS:
            return False
    return True


def normalizar_email(email: str) -> str:
    """Normaliza un email: lowercase + strip.

    Args:
        email: Dirección de email.

    Returns:
        Email normalizado, o string vacío si es inválido.
    """
    email = email.strip().lower()
    return email if es_email_valido(email) else ""
