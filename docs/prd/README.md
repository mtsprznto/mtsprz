# PRDs — mtsprz

Documentos de Requisitos de Producto (Product Requirements Document).

**Regla #2 de `AGENTS.md`:** ninguna implementación (feature, refactor grande, migración, endpoint, cambio de arquitectura) empieza sin un PRD aprobado aquí. El código no se toca hasta que el PRD exista y el usuario lo apruebe.

## Convención de nombres

```
PRD-<slug-corto>-<YYYY-MM-DD>.md
```

Ejemplo: `PRD-recaptcha-firma-2026-10-14.md`

## Flujo

1. Copiar `_TEMPLATE.md` → `PRD-<slug>-<fecha>.md`.
2. Completar todas las secciones.
3. Pedir aprobación explícita al usuario.
4. Implementar referenciando el PRD.
5. Actualizar `Estado:` al cerrar.

## Excepciones

No requieren PRD: typos, fixes de 1 línea, ajustes de copy/texto, cambios triviales de estilo sin cambio de comportamiento. Ante la duda → PRD primero.

Los PRDs de marketing viven en `docs/marketing/`.
