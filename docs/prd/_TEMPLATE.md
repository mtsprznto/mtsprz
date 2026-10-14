# PRD — <Título corto>

- **Slug**: `<slug>`
- **Fecha**: `<YYYY-MM-DD>`
- **Autor**: <nombre / agente>
- **Estado**: `borrador` | `en revisión` | `aprobado` | `implementado`
- **Regla**: este PRD es obligatorio ANTES de tocar código (ver `AGENTS.md` REGLA #2).

## 1. Contexto / Problema

¿Qué problema existe hoy? ¿Por qué es relevante? Evidencia (logs, métricas, queja del usuario, deuda técnica).

## 2. Objetivo

Resultado medible que se quiere lograr. Formato: "Lograr X para que Y".

## 3. Alcance

**In scope**
- ...

**Out of scope**
- ...

## 4. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | ... | alta/media/baja |

## 5. Requisitos no funcionales

- Rendimiento, seguridad, accesibilidad, SEO, compatibilidad, etc.

## 6. Diseño técnico

- **Módulos/archivos afectados**: `src/...`
- **Cambios en DB**: migración `NNN_*.sql` (sí/no) — detalle
- **Nuevas dependencias**: (recordar: instalación SOLO la ejecuta el usuario, ver REGLA #1)
- **Flujo**: pasos del comportamiento nuevo
- **Alternativas consideradas** y por qué se descartan

## 7. Plan de migración de datos

Si aplica: cómo migrar datos existentes, rollback, idempotencia.

## 8. Criterios de aceptación

- [ ] CA-1: ...
- [ ] CA-2: ...

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| ... | baja/media/alta | baja/media/alta | ... |

## 10. Verificación (comandos que ejecuta el usuario en Windows)

```bash
pnpm check     # tipos
pnpm build     # compilación
pnpm dev       # ver en vivo
# otros: pnpm migrate / pnpm seed / pnpm test:emails
```

> El agente NO ejecuta estos comandos (REGLA #1). El usuario los corre y comparte el output.
