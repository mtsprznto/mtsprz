# PRD — SEO Ronda 3: GEO/AEO, Entidad y Medición

- **Slug**: `seo-ronda3`
- **Fecha**: `2026-10-16`
- **Autor**: agente (Atlas/SEO) — a partir de `docs/marketing/SEO-PROGRESO-2026-10-16.md` v2, `PRD-seo-ronda2` (cerrado), `seo-test-results/ronda3-2026-08-01/` y práctica SEO/GEO 2026 verificada hoy por búsqueda web.
- **Estado**: `propuesto — pendiente de aprobación` (Regla #2: no se implementa sin aprobación).
- **Regla**: este PRD es obligatorio ANTES de tocar código (ver `AGENTS.md` REGLA #2).

> **Alcance**: SOLO lo ejecutable desde el repo (código/contenido/docs). Lo off-site (directorios, GBP, subdominios, reseñas) se ejecuta por el usuario con los playbooks; este PRD entrega **tracker + instrucciones exactas** y no edita esos proyectos.
>
> **Documentos rectores** (local, gitignored): `docs/marketing/SEO-PROGRESO-2026-10-16.md` · `SEO-AUDIT-MTSPRZ-2026.md` · plan J1–J7 (`estrategia-marketing-2026-*.md`) · playbooks `scripts/seo-directorios-chile.md` + `scripts/seo-bing-webmaster-tools.md` · runs previos en `seo-test-results/`.

---

## 1. Contexto / Problema

**Estado tras Ronda 2 + Fase 2.5** (cerrada; build ✅; commit Fase 2.5 pendiente del usuario):

- Técnico on-site resuelto: titles ≤63, schema `@graph` profundo, FAQPage en 25+ páginas, OG PNG canónicas (55 posts + 10 páginas), `llms.txt`/`llms-full.txt`, GSAP async, security headers.
- ✅ **Elegibilidad AI ya lograda**: `robots.txt` permite 10 bots (GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, CCBot, ClaudeBot, PerplexityBot, FacebookBot, Applebot, Bytespider) — verificado 16-oct.

**Cuellos de botella reales (evidencia):**

| # | Problema | Evidencia |
|---|----------|-----------|
| P1 | Cero presencia orgánica en keywords de servicio/informacionales (2/20, solo marca) | `seo-test-results/RESUMEN-EJECUTIVO.md` (28-jul) + `websearch-tool/` (1-ago): ausente en todas las de servicio |
| P2 | Entidad local incoherente en citaciones third-party: EmpresaChile (categoría "Comunicaciones y medios" ✗, ciudad "Puerto Montt" ✗); ChilePymes (categoría "artes" ✗, dirección mixta ✗) | `ronda3-2026-08-01/03-websearch-tool.md`; quick-wins **sin ejecutar** a la fecha |
| P3 | SERP de marca contaminada por 5 subdominios sin `noindex` (`dept`, `lllit`, `autcv`, `td`, `portafolio`) | SEO-PROGRESO §5.6 — verificación HTTP 16-oct |
| P4 | **Sin baseline de citas en motores AI** — no se sabe si ChatGPT/Perplexity/Gemini/AIO citan mtsprz.org | no existe corrida; elegibilidad técnica ya lista |
| P5 | Medición AI incompleta: GA4 operativo (consent-gated ✓) pero sin exploración AI-referrals; GSC sin revisión post-core-update | `src/lib/analytics.ts`; SEO-PROGRESO §7 |
| P6 | Páginas clave sin bloque de respuesta directa extractable ("answer-first") — FAQ existe, pero al fondo | inspección de páginas clave 16-oct |

**Práctica 2026 verificada (búsqueda web, 16-oct-2026):**

- ✅ **Google, guía oficial de optimización para AI (Search Central, may-2026)**: GEO/AEO ≈ SEO; palanca #1 = **contenido original no-commoditizado**; `llms.txt` **no** es palanca; structured data **no** es requisito para AI search.
- ✅ **Ahrefs (may-2026, 1.885 páginas)**: añadir JSON-LD no aumentó (cayó 4.6%) aparición en AI Overviews → schema = **desambiguación**, no palanca de citas.
- ✅ **Experimento de campo (abr-2026)**: AIO reduce ~38% clics salientes en queries activadas; zero-click 54% → 72%.
- ✅ **Genαi GEO playbook (2026)**: "**76% de páginas citadas están fuera del top 10**" → palancas: crawlable, legible sin JS, **chunkable/answer-first**, freshness, datos citables.
- ✅ **arXiv survey (jul-2026)**: sin efecto causal estable demostrado cross-plataforma; **relevancia + posición dominan la primera cita** → medir, no asumir.
- ✅ **BrightEdge (inicios 2026; citado en SEO-PROGRESO §7)**: AIO ≈48% búsquedas desktop; overlap Top-10 ↔ citas AI Mode 17–36% → hueco real para citabilidad propia aunque no se rankee top-10.

**Interpretación**: la elegibilidad técnica está lista; lo que falta es (a) **citabilidad** (bloques extraíbles arriba), (b) **medición** (baseline citas AI + GA4), (c) **coherencia de entidad** (off-site que el usuario ejecuta) — sin prometer magia: la evidencia 2026 dice que la palanca es contenido original + relevancia, no trucos.

## 2. Objetivo

Convertir la elegibilidad técnica ya lograda en **visibilidad AI medible y entidad local coherente**: bloques de respuesta citable en páginas clave + baseline de citas AI repetible + medición GA4/GSC + kit off-site ejecutable.

**Métricas de éxito** (30–60 días post-deploy):

- ≥1 baseline R4 publicado: **% de citas de mtsprz.org por motor** (ChatGPT/Perplexity/Gemini/AIO) sobre 20 prompts locales.
- `QuickAnswer` presente en 10 páginas clave, cada uno con ≥2 datos duros reales (sin inventar).
- GA4: exploración "AI referrals" documentada + env IDs verificados.
- Off-site: tracker O1/O2/O9 con estados; ≥10 directorios con NAP canónico corregido (meta vigente del plan).
- Sin regresión: `pnpm build` ✅ + CWV estables.

## 3. Alcance

**In scope**
- **G1** — `QuickAnswer` (componente Astro, sin JS) + inserción en 10 páginas clave.
- **G2** — Protocolo + corrida baseline citas AI (`seo-test-results/ronda4-2026-10-16/`).
- **G3** — Playbook medición (GA4 AI-referrals + checklist GSC) + verificación env vars (usuario).
- **G4** — Tracker off-site ejecutable (O1/O2/O9) con re-verificación 16-oct + instrucciones exactas.
- **G5** — (bajo) `sameAs`: auditar nodos Organization/Person y extender SOLO con perfiles verificados existentes.

**Out of scope**
- ❌ Contenido masivo nuevo (guías informacionales ES) → candidato R4 (requiere datos del negocio).
- ❌ Edición de subdominios (off-repo): solo instrucciones en el tracker.
- ❌ F6b poster (sin asset) y O8 Early Hints — siguen pospuestos.
- ❌ Paid media; reseñas/ratings (bloqueado por datos reales: mín. 3 testimonios / 5+ reseñas).

## 4. Requisitos funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-1 | Componente `QuickAnswer.astro`: pregunta (h2/h3), respuesta directa 40–60 palabras, 2–4 hechos con cifras; sin JS | alta |
| RF-2 | Insertar en: `/`, `/servicios`, `/desarrollo-web`, `/seo-local`, `/automatizacion`, `/whatsapp-api`, `/regiones/puerto-varas`, `/regiones/osorno`, `/regiones/puerto-montt`, `/regiones/valdivia` | alta |
| RF-3 | Datos duros: SOLO datos ya publicados/verificables (precios CLP del sitio, plazos, +50 proyectos, zona Los Lagos); si falta dato → omitir hecho (prohibido inventar) | alta |
| RF-4 | Protocolo R4: `METODO.md` (procedimiento + limitaciones), `prompts.md` (20 prompts; reutiliza banco `websearch-tool`) y `RESULTADOS.md` (baseline % citas por motor) | alta |
| RF-5 | Playbook medición: exploración GA4 "AI Referrals" (chatgpt.com, chat.openai.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai) + checklist GSC; verificar `PUBLIC_GA_ID`/`PUBLIC_CLARITY_ID` en Vercel | media |
| RF-6 | Tracker off-site: O1 directorios (10+), O2 GBP + Bing WMT, O9 subdominios (5) — pasos exactos, NAP canónico, estado por ítem, verificación | media |
| RF-7 | `sameAs`: auditar `BaseLayout.astro` (Organization/Person); añadir solo URLs que respondan 200 (EmpresaChile id=41, ChilePymes, GBP/Maps) | baja |

## 5. Requisitos no funcionales

- **Sin JavaScript nuevo** (QuickAnswer = HTML/CSS estático). Sin CLS.
- **Accesibilidad**: WCAG AA (contraste, jerarquía h2/h3, texto real).
- **Privacidad**: sin trackers nuevos; GA4 sigue consent-gated (Ley 21.719, plena vigencia 1-dic-2026).
- **Honestidad**: cero datos inventados en hechos/FAQ; sin ratings falsos; los claims se sostienen contra fuentes internas del sitio.
- **SEO**: no duplicar contenido de FAQ; el bloque es extractable (chunkable) y no canibaliza.

## 6. Diseño técnico

### 6.1 Módulos / archivos afectados

- **Nuevo**: `src/components/QuickAnswer.astro` (props: `question`, `answer`, `facts[]`).
- **Editar** (inserción): `src/pages/index.astro`, `src/pages/servicios/index.astro`, `src/pages/desarrollo-web.astro`, `src/pages/seo-local.astro`, `src/pages/automatizacion.astro`, `src/pages/whatsapp-api.astro`, `src/pages/regiones/{puerto-varas,osorno,puerto-montt,valdivia}.astro`.
- **Nuevo**: `seo-test-results/ronda4-2026-10-16/` (`METODO.md`, `prompts.md`, `RESULTADOS.md`).
- **Nuevo** (gitignored, docs/marketing): `medicion-ai-2026-10-16.md`, `offsite-tracker-2026-10-16.md`.
- **Editar**: `src/layouts/BaseLayout.astro` (sameAs — RF-7).

### 6.2 Cambios en DB

No.

### 6.3 Nuevas dependencias

Ninguna (todo con lo ya presente).

### 6.4 Flujo (comportamientos nuevos)

1. `QuickAnswer`: bloque superior de página con pregunta h2 + respuesta directa + lista de hechos; estilos consistentes (liquid-glass), 100% estático.
2. R4: ejecutar prompts → registrar citas por motor (asistido/manual donde no hay API) → publicar `RESULTADOS.md` con % y notas.
3. Medición: usuario crea exploración GA4 según playbook y confirma env IDs; GSC checklist.
4. Off-site: usuario ejecuta tracker (directorios/GBP/subdominios) y marca estados.

### 6.5 Alternativas consideradas

- **(a) Reutilizar el FAQPage existente** → descartada: el FAQ está al fondo de la página; answer-first exige extracción inmediata. El FAQ se mantiene (valioso para AEO).
- **(b) Añadir schema nuevo (FAQPage/QAPage extra)** → descartada: ya existe; la evidencia 2026 dice que schema no es palanca de citas (desambiguación). No duplicar.
- **(c) Automatizar consultas a motores AI** → descartada: sin API pública estable; registro manual asistido + corrida proxy con la tool `websearch`.

## 7. Plan de migración de datos

No aplica (contenido estático). Rollback: `git revert` de los archivos tocados.

## 8. Criterios de aceptación

- [ ] CA-1: `QuickAnswer` en las 10 páginas, sin JS, con ≥2 hechos reales (o menos si no hay dato — documentado).
- [ ] CA-2: `pnpm check` + `pnpm build` OK; sin errores básicos de a11y (contraste/estructura).
- [ ] CA-3: R4 baseline publicada con % citas por motor (20 prompts).
- [ ] CA-4: playbook medición entregado + vars verificadas (usuario confirma en Vercel).
- [ ] CA-5: tracker off-site con estados + pasos exactos + verificación.
- [ ] CA-6: `sameAs` solo con URLs que respondan 200.

## 9. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Citas AI no cambian (efecto causal no demostrado) | media | media | KPIs honestos; foco en relevancia/posición; R4 mide antes/después, no promete |
| Datos del negocio insuficientes para hechos | media | baja | omitir hecho; usar solo cifras ya públicas del sitio |
| Motores AI no automatizables | alta | baja | protocolo manual asistido + limitaciones documentadas en `METODO.md` |
| Core update/spam update en curso distorsiona medición | media | baja | anotar fechas; comparar tendencia, no snapshot |
| Duplicación QuickAnswer ↔ FAQ (canibalización interna) | baja | baja | respuestas distintas: arriba = directa; FAQ = detalle |

## 10. Verificación (comandos que ejecuta el usuario en Windows)

```bash
pnpm check     # tipos
pnpm build     # compilación (verifica schema y sitemaps)
pnpm dev       # opcional: revisar QuickAnswer renderizado en las 10 páginas
```

Post-deploy (manual, navegador):
- Rich Results Test en 1 página con QuickAnswer (verificar que FAQ/Service siguen válidos).
- PageSpeed Insights (CWV sin regresión) en `/` y 1 región.
- Tracker off-site: `curl.exe -sI https://X.mtsprz.org/robots.txt` por subdominio + `site:X.mtsprz.org` en DDG.

> El agente NO ejecuta estos comandos (REGLA #1). El usuario los corre y comparte el output.

## 11. Bitácora de ejecución

_(se completará durante la ejecución, por hito — como en Ronda 2)_

## 12. Decisiones

_(pendientes; el usuario delegó criterio en Ronda 2 — se registrarán aquí las resoluciones: alcance G1–G5, método R4, orden de ejecución)_
