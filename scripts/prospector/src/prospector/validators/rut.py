"""Validador de RUT chileno (Rol Único Tributario).

Formato aceptado:
  - 12345678-5
  - 12.345.678-5
  - 123456785 (sin guión, último dígito es DV)
"""

from __future__ import annotations

import re

_RUT_RE = re.compile(r"^(\d{1,8})-?([\dkK])$")


def clean_rut(rut: str) -> str:
    """Elimina puntos, guiones y espacios."""
    return re.sub(r"[.\s]", "", rut.strip())


def validar_rut(rut: str) -> bool:
    """Valida un RUT chileno (incluye dígito verificador).

    Args:
        rut: RUT en cualquier formato (12.345.678-5, 12345678-5, etc.)

    Returns:
        True si el RUT es válido.
    """
    try:
        rut = clean_rut(rut)
        m = _RUT_RE.match(rut)
        if not m:
            return False
        cuerpo, dv = m.groups()
        return _calcular_dv(int(cuerpo)) == dv.upper()
    except (ValueError, AttributeError):
        return False


def formatear_rut(rut: str) -> str:
    """Formatea un RUT al estándar: 12.345.678-5.

    Args:
        rut: RUT en cualquier formato válido.

    Returns:
        RUT formateado, o string vacío si es inválido.
    """
    try:
        rut = clean_rut(rut)
        m = _RUT_RE.match(rut)
        if not m:
            return ""
        cuerpo, dv = m.groups()
        cuerpo_str = f"{int(cuerpo):,}".replace(",", ".")
        return f"{cuerpo_str}-{dv.upper()}"
    except (ValueError, AttributeError):
        return ""


def _calcular_dv(cuerpo: int) -> str:
    """Calcula el dígito verificador para un cuerpo de RUT."""
    suma = 0
    multiplo = 2
    for c in reversed(str(cuerpo)):
        suma += int(c) * multiplo
        multiplo = 9 if multiplo == 7 else multiplo + 1
    resto = suma % 11
    dv = 11 - resto
    if dv == 11:
        return "0"
    elif dv == 10:
        return "K"
    return str(dv)
