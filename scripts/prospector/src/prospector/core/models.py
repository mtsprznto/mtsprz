"""Models — Dataclasses inmutables con validación para Prospectos.

Usa Pydantic v2 para validación automática en tiempo de construcción.

Uso:
    p = Prospect(empresa="Inmo Vista Lagos", rubro="inmobiliaria", comuna="Puerto Varas")
    p.digital_score  # 0 (por defecto)
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums de dominio
# ---------------------------------------------------------------------------

class Rubro(str, Enum):
    """Rubros de negocio objetivo en la Región de Los Lagos."""
    INMOBILIARIA = "inmobiliaria"
    ABOGADO = "abogado"
    DENTISTA = "dentista"
    SALUD = "salud"
    TURISMO = "turismo"
    HOTELERIA = "hoteleria"
    RESTAURANTE = "restaurante"
    CONSTRUCTORA = "constructora"
    ARQUITECTO = "arquitecto"
    AUTOMOTRIZ = "automotriz"
    GIMNASIO = "gimnasio"
    SPA = "spa"
    CONTADOR = "contador"
    DISENO = "diseno"
    TIENDA = "tienda"
    OTRO = "otro"

    @classmethod
    def from_str(cls, s: str) -> "Rubro":
        """Mapeo flexible de string a Rubro."""
        s = s.lower().strip()
        mapping = {
            "inmobiliaria": cls.INMOBILIARIA,
            "inmobiliarias": cls.INMOBILIARIA,
            "corredora": cls.INMOBILIARIA,
            "abogado": cls.ABOGADO,
            "abogados": cls.ABOGADO,
            "bufete": cls.ABOGADO,
            "dentista": cls.DENTISTA,
            "dentistas": cls.DENTISTA,
            "clinica dental": cls.DENTISTA,
            "clinica": cls.SALUD,
            "salud": cls.SALUD,
            "hotel": cls.HOTELERIA,
            "hoteles": cls.HOTELERIA,
            "cabañas": cls.TURISMO,
            "cabanas": cls.TURISMO,
            "turismo": cls.TURISMO,
            "restaurant": cls.RESTAURANTE,
            "restaurante": cls.RESTAURANTE,
            "constructora": cls.CONSTRUCTORA,
            "construccion": cls.CONSTRUCTORA,
            "arquitecto": cls.ARQUITECTO,
            "taller": cls.AUTOMOTRIZ,
            "automotriz": cls.AUTOMOTRIZ,
            "mecanico": cls.AUTOMOTRIZ,
            "gimnasio": cls.GIMNASIO,
            "spa": cls.SPA,
            "contador": cls.CONTADOR,
            "contabilidad": cls.CONTADOR,
            "diseno": cls.DISENO,
            "tienda": cls.TIENDA,
            "ecommerce": cls.TIENDA,
        }
        return mapping.get(s, cls.OTRO)


class EstadoProspect(str, Enum):
    """Estados del pipeline de venta."""
    NUEVO = "nuevo"
    CONTACTADO = "contactado"
    INTERESADO = "interesado"
    COTIZACION = "cotizacion"
    NEGOCIACION = "negociacion"
    CERRADO = "cerrado"
    NO_INTERESADO = "no_interesado"
    INVALIDO = "invalido"


class CanalContacto(str, Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    LLAMADA = "llamada"
    LINKEDIN = "linkedin"
    FORMULARIO = "formulario"
    PRESENCIAL = "presencial"


class FuenteProspect(str, Enum):
    GOOGLE_MAPS = "google_maps"
    CHILE_RUT = "chile_rut"
    AMARILLAS = "amarillas"
    IMPORTACION = "importacion"
    MANUAL = "manual"
    REFERIDO = "referido"
    REDES = "redes"


# ---------------------------------------------------------------------------
# Modelo principal
# ---------------------------------------------------------------------------

class SenalesDigitales(BaseModel):
    """Indicadores de presencia digital del negocio."""
    has_website: bool = False
    has_gmb: bool = False
    has_facebook: bool = False
    has_instagram: bool = False
    site_speed_ms: Optional[int] = None
    score: int = 0  # 0-100


class OutreachLog(BaseModel):
    """Registro individual de contacto con un prospecto."""
    id: str = ""
    canal: CanalContacto
    estado: str = "pendiente"
    mensaje: str = ""
    fecha_contacto: Optional[str] = None
    fecha_seguimiento: Optional[str] = None
    notas: str = ""
    created_at: str = ""


class Prospect(BaseModel):
    """Modelo principal de un prospecto/cliente potencial."""

    # --- Identificación ---
    id: str = ""
    empresa: str
    rut: str = ""
    rubro: str = ""
    sub_rubro: str = ""

    # --- Ubicación ---
    direccion: str = ""
    comuna: str = ""
    provincia: str = ""
    region: str = "Los Lagos"

    # --- Contacto ---
    telefonos: list[str] = Field(default_factory=list)
    emails: list[str] = Field(default_factory=list)
    sitio_web: str = ""

    # --- Google Maps ---
    google_maps_url: str = ""
    google_rating: Optional[float] = None
    google_reviews: int = 0

    # --- Redes ---
    redes: dict[str, str] = Field(default_factory=dict)

    # --- Análisis digital ---
    senales_digitales: SenalesDigitales = Field(default_factory=SenalesDigitales)

    @property
    def digital_score(self) -> int:
        return self.senales_digitales.score

    # --- Meta ---
    fuente: str = ""
    estado: str = EstadoProspect.NUEVO.value
    notas: str = ""
    outreach: list[OutreachLog] = Field(default_factory=list)

    # --- Timestamps ---
    created_at: str = ""
    updated_at: str = ""

    # ------------------------------------------------------------------
    # Validación
    # ------------------------------------------------------------------

    @field_validator("empresa")
    @classmethod
    def empresa_no_vacia(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre de la empresa no puede estar vacío")
        return v

    @field_validator("comuna")
    @classmethod
    def comuna_normalize(cls, v: str) -> str:
        return v.strip().title() if v else v

    # ------------------------------------------------------------------
    # Factory method
    # ------------------------------------------------------------------

    @classmethod
    def create(cls, **kwargs) -> "Prospect":
        """Crea un Prospect generando id y timestamps automáticamente."""
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if "id" not in kwargs or not kwargs["id"]:
            # ID secuencial basado en timestamp + hash corto
            ts = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
            kwargs["id"] = f"PRO-{ts}-{hash(kwargs.get('empresa', '')) % 10000:04d}"
        if not kwargs.get("created_at"):
            kwargs["created_at"] = now
        if not kwargs.get("updated_at"):
            kwargs["updated_at"] = now
        if "rubro" in kwargs and isinstance(kwargs["rubro"], str):
            kwargs["rubro"] = kwargs["rubro"].lower().strip()
        return cls(**kwargs)
