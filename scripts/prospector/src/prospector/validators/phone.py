"""Validador y normalizador de teléfonos chilenos.

Formatos aceptados:
  - +56 9 1234 5678
  - 56912345678
  - 09 1234 5678
  - 9 1234 5678
  - 12345678 (asume 9 + código de área)

Salida normalizada: +56 9 XXXX XXXX
"""

from __future__ import annotations

import re

_PHONE_RE = re.compile(
    r"^(?:(?:\+?56)?\s?0?)?(\d{1,2})\s*(\d{4})\s*(\d{4})$"
)


def clean_phone(phone: str) -> str:
    """Elimina todo excepto dígitos y +."""
    return re.sub(r"[^\d+]", "", phone.strip())


def es_telefono_valido(phone: str) -> bool:
    """Valida que sea un teléfono chileno móvil válido.

    Args:
        phone: Número en cualquier formato.

    Returns:
        True si parece un número móvil chileno válido.
    """
    try:
        cleaned = clean_phone(phone)
        # Debe tener entre 9 y 12 dígitos
        digits = re.sub(r"\D", "", cleaned)
        # Móvil chileno: +56 9 XXXX XXXX = 11 dígitos
        if len(digits) == 9:
            return True  # solo número local
        elif len(digits) == 11 and digits.startswith("569"):
            return True
        elif len(digits) == 12 and digits.startswith("569"):
            return True
        return False
    except (ValueError, AttributeError):
        return False


def normalizar_telefono(phone: str) -> str:
    """Normaliza un teléfono al formato +56 9 XXXX XXXX.

    Args:
        phone: Número en cualquier formato.

    Returns:
        Teléfono normalizado, o string vacío si no se puede.
    """
    try:
        cleaned = clean_phone(phone)
        digits = re.sub(r"\D", "", cleaned)

        if len(digits) == 9:
            # Asume 9XXXXXXXX
            return f"+56 {digits[0]} {digits[1:5]} {digits[5:]}"
        elif len(digits) == 11 and digits.startswith("569"):
            # 569XXXXXXXX
            return f"+56 {digits[2]} {digits[3:7]} {digits[7:]}"
        elif len(digits) == 12 and digits.startswith("569"):
            # +569XXXXXXXX
            return f"+56 {digits[2]} {digits[3:7]} {digits[7:]}"
        return ""
    except (ValueError, AttributeError):
        return ""
