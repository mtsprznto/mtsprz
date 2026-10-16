# PRD — SEO Ronda 2: fixes on-site residuales (F1–F6)

- **Slug**: `seo-ronda2`
- **Fecha**: `2026-10-16`
- **Autor**: agente (Atlas/SEO) — a partir de `docs/marketing/SEO-PROGRESO-2026-10-16.md` (registro de progreso v2) y `docs/marketing/SEO-AUDIT-MTSPRZ-2026.md` (auditoría base 87/100)
- **Estado**: `en revisión` — pendiente aprobación del usuario (§12) antes de tocar código
- **Regla**: este PRD es obligatorio ANTES de tocar código (ver `AGENTS.md` REGLA #2).

> **Documentos rectores** (redactados, **local y gitignored** — `.gitignore:32` → `docs/marketing/*`, no se versionan):
> - `docs/marketing/SEO-PROGRESO-2026-10-16.md` v2 — estado real de la Ronda 1 (13 DONE / 5 PARCIAL / 7 ABIERTO) + evidencia `file:line` de cada hallazgo.
> - `docs/marketing/SEO-AUDIT-MTSPRZ-2026.md` — auditoría base completa.
> - `docs/marketing/estrategia-marketing-2026-07-26.md` + `…-08-04.md` — plan J1–J7 (off-site: GBP, directorios, backlinks, Ley 21.719).
> - `docs/marketing/PRD-seo-ronda2-2026-10-16.md` — borrador previo de este mismo alcance (queda como anexo de marketing; **este PRD lo reemplaza como documento oficial**).
>
> **Alcance**: SOLO fixes on-site ejecutables desde el repo (código/contenido/assets). Lo off-site (GBP, directorios, backlinks, `noindex` de subdominios, reseñas) no se ejecuta desde el repo → vive en los playbooks de marketing y queda fuera de este PRD.

---

## 1. Contexto / Problema

La Ronda 1 de SEO quedó con 13 acciones DONE, 5 PARCIAL y 7 ABIERTO. De los pendientes, estos 6 son ejecutables en repo y siguen sin hacer — cada uno con evidencia verificada:

**F1 · `/casos` carga GSAP en modo bloqueante (única página del sitio).**
- `src/pages/casos.astro:241-242`: dos `<script is:inline src>` **síncronos** a jsdelivr (`gsap.min.js` + `ScrollTrigger.min.js` v3.13.0), en el body, sin `async`/`defer`.
- Verificado con grep `script is:inline src=` en `src/`: **solo `/casos`** lo hace; todo el resto usa el patrón asíncrono `inject()` (p. ej. `HeroSection.astro:98-144`, que además tiene fallback `.catch()`).
- Impacto: scripts de terceros en la ruta crítica de render (riesgo LCP/TBT) y punto único de falla (CDN lento/caído).
- La ruta **sin GSAP ya existe y es correcta**: el IIFE (`casos.astro:244+`) evalúa `hasGsap` con guard (`:252-253`) y `applyFilter` cae a la ruta plana cuando no hay GSAP o hay `prefers-reduced-motion` (`:251`, `:274`). El fix es de **estrategia de carga**, no de comportamiento.

**F2 · OG images genéricas en las páginas clave + generador limitado.**
- `BaseLayout.astro:50-52` ya convierte rutas relativas → absolutas (`site + image`) y emite `og:image` (`:131`), `og:image:width/height` 1200×630 (`:132-133`), `twitter:image` (`:140`) y `BlogPosting.image` (`:281`).
- Pero **ninguna de las 10 páginas clave pasa la prop `image`** → todas heredan `${site}/logo.jpg` (OG genérica, no informativa en shares).
- `scripts/generate-og-images.mjs` solo cubre posts del blog; para PNG depende de `@resvg/resvg-js` (líneas `:171-177`) que **NO está instalado** → hoy solo produce SVG. `sharp ^0.35.3` **sí está** en devDeps (`package.json:37`) y en `node_modules`.
- Estado de assets (verificado): `public/blog/` = **51 `.svg` + 13 `.png`** (los PNG están **huérfanos**: 0 referenciados); las **55 referencias `image:`** del frontmatter apuntan a `.svg`; además **2 OG compartidas por 3 posts cada una** (`og-automatizacion-ia-pymes.svg`, `og-agentes-ia-empresas.svg`) → previews duplicadas. `public/og/` no existe.

**F3 · Doble CTA flotante.**
- `src/components/StickyCTA.astro:14` (barra fija de contacto) convive con el `WhatsAppButton` global (`BaseLayout.astro:348`, con tracking GA) en **3 páginas**: `servicios/index.astro:409`, `regiones/osorno.astro:96`, `servicios/salmonicultura.astro:185` → dos elementos flotantes de WhatsApp simultáneos (ruido visual, solapamiento en móvil).

**F4 · `llms.txt` no referencia `llms-full.txt`.**
- `public/llms.txt` termina sin link a `public/llms-full.txt` (ambos existen y se sirven). La spec de llmstxt.org recomienda sección `## Optional` con links a recursos extendidos; es la vía estándar para que los motores descubran el contenido completo.

**F5 · El chip "Actualizado" es invisible en producción.**
- `blog.astro:227-231` (featured) y `:313` (tier 1) ya renderizan el chip condicionado a `modifiedTime`, pero **ninguno de los posts en esas posiciones tiene el campo** (verificado: `caso-blastup-email-ia.md`, `whatsapp-business-chile-guia-completa.md`, `como-crear-landing-page-que-venda.md` → sin `modifiedTime`; `content.config.ts:13`, campo opcional) → 0 badges en vivo (el `border-accent/40` detectado en el HTML vivo es el botón newsletter `:588`, falso positivo).
- Tiers 2–4 de la grilla **no tienen** el chip implementado.

**F6 · Mejoras menores (baja prioridad).**
- (a) Sin `SiteNavigationElement` en el `@graph` de `BaseLayout.astro:148+`.
- (b) El `<video>` del hero (`HeroSection.astro:25-35`; `preload="metadata"` en `:31`) no tiene `poster` → posible frame negro inicial en conexiones lentas.

---

## 2. Objetivo

**Cerrar los 6 fixes on-site** para que mtsprz.org: (a) no bloquee render por CDNs de terceros en ninguna página; (b) emita OG PNG 1200×630 propias en las 10 páginas clave (mejor CTR al compartir en WhatsApp/LinkedIn/X); (c) muestre **un solo** CTA flotante coherente por página; (d) enlace `llms-full.txt` desde `llms.txt` (descubribilidad GEO); y (e) muestre frescura real ("Actualizado") donde existan fechas reales verificables.

**Medible:**
- Scripts síncronos CDN en `src/`: **1 → 0** (grep).
- `public/og/`: **10 PNG** 1200×630 (≤300 KB c/u) referenciadas por sus páginas.
- CTAs flotantes por página afectada: **2 → 1**.
- `llms.txt` con link a `llms-full.txt` (ambos HTTP 200).
- Chips "Actualizado" visibles solo en posts con `modifiedTime` **real**.

---

## 3. Alcance

**In scope**
- F1: migrar `/casos` al patrón asíncrono `inject()` con guard dinámico.
- F2: modo `--pages` en `scripts/generate-og-images.mjs` (SVG → PNG vía **sharp**, ya presente) + prop `image` en las 10 páginas clave.
- F3: eliminar (opción A, recomendada) o reposicionar (opción B) `StickyCTA` en sus 3 usos.
- F4: link a `llms-full.txt` en `public/llms.txt` (sección `## Optional`).
- F5: `modifiedTime` en posts recientes con **fechas reales** (las provee el usuario) + chip "Actualizado" en tiers 2–4 de `blog.astro`.
- F6: `SiteNavigationElement` en el `@graph` + `poster` del video hero (requiere asset).

**Out of scope**
- `robots.txt` (ya correcto) y `sitemap` logic (no se toca).
- Fase 2.5 completa de OG de posts (regenerar los ~55, resolver las OG compartidas, repuntar frontmatter `.svg`→`.png`) → **decisión §12**; si se aprueba va como fase separada al final.
- Contenido nuevo / copy de negocio / reescrituras editoriales.
- Off-site: GBP, directorios (playbooks en `scripts/`), backlinks, reseñas/testimonios (datos de negocio), `noindex` de subdominios (hallazgo O9, off-repo).
- Panel admin, endpoints, DB, flujo de firma (`/firmar/*`).

---

## 4. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 (F1) | `/casos`: reemplazar los 2 scripts síncronos (`casos.astro:241-242`) por carga asíncrona con el patrón `inject()` de `HeroSection.astro:98-144` (promesas + `onerror` → `.catch()` silencioso). El guard `hasGsap` debe **evaluarse dinámicamente** (al iniciar y al interactuar) para que, al terminar la carga asíncrona, las animaciones se activen sin recargar. La ruta plana de filtros (sin GSAP / `prefers-reduced-motion`) y el estado inicial de la página (todas las cards visibles) quedan intactos. | alta |
| RF-2 (F2a) | `scripts/generate-og-images.mjs`: agregar modo `--pages` que genere OG para las 10 páginas clave con un manifiesto interno (`{slug, título, eyebrow, accent}`), reutilizando la plantilla SVG existente; rasterizar a PNG con **sharp** (`sharp(Buffer.from(svg)).png()`), output `public/og/<slug>.png` 1200×630 ≤300 KB. Si `sharp` no está disponible → escribe `.svg` y avisa (comportamiento dual actual, sin romper). `--dry-run` soportado. | alta |
| RF-3 (F2b) | Las 10 páginas clave pasan `image="/og/<slug>.png"` a `BaseLayout` (en `regiones/*` vía el wrapper thin que envuelve `BaseLayout`+`RegionPage`): `/`, `/servicios`, `/desarrollo-web`, `/seo-local`, `/automatizacion`, `/contacto`, `/casos`, `/regiones/puerto-varas`, `/regiones/osorno`, `/regiones/puerto-montt`. | alta |
| RF-4 (F3) | Dejar **un solo** CTA flotante por página: **Opción A (recomendada)**: eliminar `StickyCTA.astro` + retirar sus 3 usos (`servicios/index.astro:409`, `regiones/osorno.astro:96`, `servicios/salmonicultura.astro:185`), conservando el `WhatsAppButton` global. **Opción B**: reposicionar StickyCTA para no colisionar (requiere criterio de layout). `StickyCTA` no tiene tracking propio (verificado: el tracking GA vive en el `WhatsAppButton` global); sin migración de eventos. **→ Decisión §12.2**. | alta |
| RF-5 (F4) | `public/llms.txt`: añadir sección `## Optional` con link absoluto `https://mtsprz.org/llms-full.txt`. No tocar el resto del contenido. | media |
| RF-6 (F5a) | Añadir `modifiedTime: "YYYY-MM-DD"` (solo **fechas reales** provistas por el usuario) a los posts que se elijan (candidatos actuales: los 3 más recientes: `caso-blastup-email-ia`, `whatsapp-business-chile-guia-completa`, `como-crear-landing-page-que-venda`). Sin fechas → sin cambio. | media |
| RF-7 (F5b) | `blog.astro`: chip "Actualizado" en las cards de tiers 2–4 (mismo patrón visual del tier 1 `:313`/featured `:227-231`: `border-accent/40 bg-accent-subtle` mono), condicionado a `modifiedTime`. Sin fechas → chip invisible. | media |
| RF-8 (F6a) | `BaseLayout.astro` `@graph`: añadir `SiteNavigationElement` (`name` + `url` del menú principal real del Header). | baja |
| RF-9 (F6b) | `HeroSection.astro`: `poster` en el `<video>` del hero (`:25-35`) con asset real; si no hay asset disponible → se documenta y se pospone (no fabricar). | baja |

---

## 5. Requisitos no funcionales

- **REGLA #1**: el agente no ejecuta `pnpm`/`node`; deja comandos exactos para Windows (§10). El usuario los corre y comparte output.
- **Nuevas dependencias: NINGUNA.** `sharp` ya está en devDeps; GSAP ya se sirve por CDN. No tocar `package.json`.
- **Performance**: sin scripts bloqueantes nuevos; PNG ≤300 KB c/u; el generador no altera el build (`pnpm build` sigue igual; los PNG se generan a demanda y se commitean como assets).
- **Compatibilidad**: patrón `is:inline` sin `{id}` (`document.currentScript`); no romper el comportamiento no-JS de `/casos` (todas las cards visibles; filtros requieren JS pero no GSAP); respetar `prefers-reduced-motion`.
- **SEO**: no tocar `<title>`, H1, canonical, hreflang, JSON-LD existentes; OG absolutas (ya resuelto por `BaseLayout:50-52`); cero cloaking.
- **Honestidad**: `modifiedTime` solo con fechas reales; sin badges inventados; el chip refleja ediciones reales.

---

## 6. Diseño técnico

### 6.1 Módulos/archivos afectados
- **F1**: `src/pages/casos.astro` (scripts L240-242 → patrón `inject()`; ajuste del guard `hasGsap` L252-253 y su uso en `applyFilter` L274) — referencia: `src/components/home/HeroSection.astro:98-144`.
- **F2**: `scripts/generate-og-images.mjs` (modo `--pages` + manifiesto + rasterizado sharp) · assets nuevos `public/og/*.png` · páginas: `src/pages/index.astro`, `servicios/index.astro`, `desarrollo-web/*` (landing), `seo-local/*` (landing), `automatizacion.astro`, `contacto.astro`, `casos.astro`, `regiones/puerto-varas.astro`, `regiones/osorno.astro`, `regiones/puerto-montt.astro` (+ wrapper thin que pasa la prop a `BaseLayout`).
- **F3**: `src/components/StickyCTA.astro` (eliminar o reubicar) + 3 páginas consumidoras.
- **F4**: `public/llms.txt`.
- **F5**: `src/content/blog/<slug>.md` (frontmatter) + `src/pages/blog.astro` (chip tiers 2–4).
- **F6**: `src/layouts/BaseLayout.astro` (@graph) + `src/components/home/HeroSection.astro` (poster).

### 6.2 Cambios en DB
**No.** Sin migraciones SQL. No se tocan endpoints ni tablas.

### 6.3 Nuevas dependencias
**Ninguna.** `sharp` ya presente (devDep + node_modules). `@resvg/resvg-js` **no** se instala (su rol lo cubre sharp en el modo páginas; el comportamiento previo con resvg, si algún día se instala, sigue funcionando).

### 6.4 Flujo (comportamientos nuevos)

1. **`/casos` (F1)**: carga inicial → HTML estático con todas las cards visibles (sin cambios). El IIFE inline corre de inmediato: activa filtros con la ruta plana y, en paralelo, `inject()` carga GSAP + ScrollTrigger; al resolver, `init()` registra el plugin y las animaciones (filtros + reveals) pasan a la ruta GSAP **en caliente** (guard re-evaluado por llamada). CDN caído → `.catch()` silencioso; la página queda 100% funcional en ruta plana.
2. **OG páginas (F2)**: el usuario corre `node scripts/generate-og-images.mjs --pages` en Windows → el script renderiza el SVG por página (título + eyebrow + accent) → sharp → `public/og/<slug>.png`. `pnpm build` copia `public/` tal cual a la salida. `BaseLayout` recibe `image="/og/<slug>.png"` → absoluta en `og:image`/`twitter:image`.
3. **Share**: al compartir cualquier página clave, preview con imagen propia 1200×630 (validar en Facebook Sharing Debugger + WhatsApp; re-scrape si hay caché).
4. **`llms.txt` (F4)**: motores LLM descubren `llms-full.txt` desde la sección `## Optional`.
5. **Blog (F5)**: posts con `modifiedTime` real muestran chip "Actualizado" en featured/tier1 y (nuevo) tiers 2–4.

### 6.5 Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| Instalar `@resvg/resvg-js` para PNGs | Dep nueva + instalación la ejecuta el usuario; `sharp` ya está en devDeps y cubre el rasterizado SVG→PNG. |
| Mantener los scripts síncronos de `/casos` | Bloquean render y crean dependencia crítica de CDN; el patrón async ya es el estándar del resto del sitio. |
| `defer` simple en los 2 `<script>` de `/casos` | En Astro `is:inline` el orden/garantías cambian entre páginas; el patrón `inject()` del sitio ya está probado (HeroSection) y maneja error explícito. |
| Eliminar TODO GSAP de `/casos` | Fuera de alcance: las animaciones de filtros son funcionales y no bloquean; solo se cambia la estrategia de carga. |
| Opción B (reposicionar StickyCTA) | Duplica función (WhatsApp) con el botón global; mantener 2 CTAs flotantes sigue siendo ruido. Se prefiere A salvo decisión del usuario (§12.2). |
| Regenerar YA los 55 OG de posts (fase 2.5 completa) | Multiplica el riesgo de la ronda; se decide como fase separada (§12.4) tras validar el modo `--pages`. |

---

## 7. Plan de migración de datos

No hay DB. La "migración" es de **assets y frontmatter**:
- **Assets**: nuevos `public/og/*.png` (aditivo, sin borrar nada). Los 13 PNG huérfanos de `public/blog/` y los 51 SVG **no se tocan** en esta ronda (fase 2.5, §12.4).
- **Frontmatter (F5)**: se editan solo las líneas `modifiedTime:` de los posts elegidos, con fechas reales. Idempotente (re-ejecutar no cambia nada).
- **Generador**: mantiene la propiedad actual "no re-sobrescribe si existe" (agregar `--force` opcional para regenerar en el futuro).
- **Rollback**: `git revert` del commit correspondiente; assets y metas vuelven al estado previo. Sin efectos persistentes en datos.

---

## 8. Criterios de aceptación

- [ ] **CA-1 (F1)**: grep `script is:inline src=` en `src/` → 0 resultados síncronos; `/casos` con DevTools "block request domain: cdn.jsdelivr.net" → sin errores no capturados, filtros funcionan (ruta plana), todas las cards visibles; con CDN ok → filtros animados y reveals GSAP activos (sin recargar).
- [ ] **CA-2 (F2a)**: `node scripts/generate-og-images.mjs --pages --dry-run` lista 10 páginas; sin `--dry-run` genera 10 PNG 1200×630 ≤300 KB en `public/og/`; sin sharp → genera SVG y avisa (no falla).
- [ ] **CA-3 (F2b)**: en `pnpm dev`/preview, las 10 páginas emiten `<meta property="og:image">` absoluto a `/og/<slug>.png` (1200/630) y `twitter:image` equivalente; Facebook Sharing Debugger y preview de WhatsApp muestran la imagen propia.
- [ ] **CA-4 (F3)**: las 3 páginas afectadas muestran **un solo** elemento flotante de contacto; si Opción A: `StickyCTA.astro` sin referencias (grep 0) y tracking portado si existía.
- [ ] **CA-5 (F4)**: `https://mtsprz.org/llms.txt` incluye link a `llms-full.txt`; ambos responden 200.
- [ ] **CA-6 (F5)**: posts con `modifiedTime` real muestran chip "Actualizado" en featured/tier1 y tiers 2–4; posts sin fecha **no** muestran chip. Fechas = reales (provisión usuario).
- [ ] **CA-7 (F6)**: `@graph` del JSON-LD incluye `SiteNavigationElement` válido (Rich Results Test sin errores nuevos); video hero con `poster` si hay asset.
- [ ] **CA-8 (global)**: `pnpm check` y `pnpm build` limpios (usuario); sin cambios en títulos/H1/canonicals/JSON-LD preexistentes de las páginas tocadas (diff revisado).

---

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cambio de timing GSAP en `/casos` (guard estático detecta `hasGsap=false` al inicio y nunca activa animaciones) | media | medio | Guard **dinámico**: re-evaluar `window.gsap` dentro de `applyFilter`/`init`; probar con CDN ok y bloqueado. |
| `sharp` no renderiza igual el SVG que resvg (fuentes en textos de la OG) | media | bajo | Revisar 2-3 PNG visualmente; el diseño usa `system-ui` simple con tamaños grandes (legible aunque difiera la fuente). Fallback SVG intacto. |
| Caché de redes sociales muestra OG antigua | alta | bajo | Re-scrape en Facebook Sharing Debugger + link nuevo (query test en WhatsApp). |
| Eliminar StickyCTA quita captura/tracking específico | baja | bajo | Verificado: `StickyCTA` no tiene tracking propio; el `WhatsAppButton` global (con GA) queda como único CTA → sin pérdida de medición. |
| PNGs pesan de más (repo/build) | baja | bajo | Límite 300 KB c/u (sharp con compresión); 10 archivos. |
| Fechas `modifiedTime` incorrectas (inventadas) | baja | alto | Solo fechas provistas por el usuario; si no hay dato, no se agrega el campo (regla de honestidad). |
| Regresión SEO en páginas tocadas (F2 image prop / F3) | baja | alto | No tocar contenido/meta existente fuera de lo especificado; diff `<head>` antes/después; CA-8. |
| F6b sin asset de poster → bloqueo percibido | media | bajo | Si no hay asset real, se documenta y pospone; el video sigue con `preload="metadata"`. |

---

## 10. Verificación (comandos que ejecuta el usuario en Windows)

```bash
# 1) OG páginas (dry-run primero, luego real)
node scripts/generate-og-images.mjs --pages --dry-run
node scripts/generate-og-images.mjs --pages

# 2) Calidad
pnpm check     # tipos
pnpm build     # compilación / SSR
pnpm dev       # ver en vivo
# no aplica: pnpm migrate / pnpm seed / pnpm test:emails (sin cambios de DB/correo)
```

Chequeos manuales (el usuario):
- `/casos`: con DevTools → Network → "block request domain: cdn.jsdelivr.net" + recarga → filtros funcionan, 0 errores de consola, cards visibles. Luego desbloquear → animación activa al filtrar.
- Compartir `/` y `/servicios` en WhatsApp (o Facebook Sharing Debugger) → preview con imagen propia.
- `/blog`: chip "Actualizado" visible solo en los posts con fecha real.
- `https://mtsprz.org/llms.txt` → link a `llms-full.txt` funcional.
- Rich Results Test en 1 página tocada → sin errores nuevos.

> El agente NO ejecuta estos comandos (REGLA #1). El usuario los corre y comparte el output.
> El agente NO hace commit ni push (REGLA #3); entregará resumen + mensaje de commit sugerido.

---

## 11. Bitácora de ejecución

> Última actualización: **2026-10-16**.

- **2026-10-16** — PRD creado a partir del registro `SEO-PROGRESO-2026-10-16.md` v2 y el borrador de marketing `docs/marketing/PRD-seo-ronda2-2026-10-16.md`. Estado `en revisión`. Sin código tocado. Decisiones pendientes del usuario en §12.
- Evidencia clave verificada para este PRD: `casos.astro:241-242` (únicos scripts síncronos del sitio) · `BaseLayout:50-52,131-140,281` · `generate-og-images.mjs:171-177` (resvg) · assets `public/blog/` 51 SVG/13 PNG/0 refs PNG · OG compartidas ×3+3 posts · `StickyCTA` ×3 usos · `blog.astro:227-231,313,588` · `content.config.ts:13`.

---

## 12. Decisiones pendientes (usuario)

1. **Alcance**: ¿aprobar F1–F6 como están? (F6a/F6b son opcionales y de menor impacto; F6b depende de asset de poster).
2. **F3**: ¿Opción **A** (eliminar `StickyCTA`, recomendada) u **Opción B** (reposicionar)? 
3. **F5**: ¿qué posts llevan `modifiedTime` y con qué **fechas reales**? (candidatos: los 3 más recientes; requiere dato del usuario).
4. **Fase 2.5 (OG de los ~55 posts)**: ¿ahora, después de F1–F6, o no hacer? Incluiría regenerar todas las OG de posts en PNG con sharp, eliminar las OG compartidas (previews duplicadas) y repuntar frontmatter `.svg`→`.png`.
