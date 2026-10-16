# PRD — Rediseño Technopunk Enterprise (v2 del design system)

- **Slug**: `technopunk-redesign`
- **Fecha**: `2026-10-14`
- **Autor**: architect (agente) — a partir de `DESIGN.md` v2 y `.claude/rules/ui-design.md` v2
- **Estado**: `en ejecución` — fases 1–4 completas; fase 5 en curso (ver §11 Bitácora)
- **Regla**: este PRD es obligatorio ANTES de tocar código (ver `AGENTS.md` REGLA #2).

> **Documentos rectores** (ya redactados, no requieren código):
> - `.claude/rules/ui-design.md` — filosofía VINCULANTE (Technopunk Enterprise). **Local, gitignored** (`.gitignore:17` → `.claude/`), no se versiona.
> - `DESIGN.md` v2 — implementación: tokens, escala, recetas, componentes, plan §17.
>
> Este PRD **autoriza y ordena la ejecución** de lo que `DESIGN.md` especifica. Si hay
> conflicto, manda `.claude/rules/ui-design.md` > `DESIGN.md` > este PRD.

---

## 1. Contexto / Problema

El sitio `mtsprz.org` (landing marketing Región de Los Lagos + subsistema admin/contratos/leads)
usa hoy la dirección visual **"editorial inmersivo dark"** (v1): fondo `#010101`, cards
flotantes `liquid-glass`, acento indigo `#4f46e5`, headings **Poppins** 700/800, y un sistema
**"notebook / humanwashing"** (fuente manuscrita **Caveat**, papel crema `#f5efe0`, cinta
adhesiva, subrayados y bordes irregulares a mano) presente en `HeroSection`, `DiagnosticoSection`,
`ScrollCard`, `Footer`, `Testimonials`, `NosotrosSection`, etc.

Problema:
- La oferta real es **soluciones tecnológicas por desarrolladores senior de vieja escuela**
  (arquitectura, modernización de legacy, automatización, deploy). La estética "cuaderno con
  anotaciones a mano" comunica lo contrario: taller artesanal, no autoridad técnica senior.
- El sistema manuscrito introduce **hex hardcodeados** (crema, ámbar, índigo) fuera del `@theme`,
  radios irregulares ad-hoc y SVGs a mano repetidos por componente → deuda de mantenibilidad y
  riesgo de a11y (texto sobre papel crema, decoración no `aria-hidden`, etc.).
- No hay un **lenguaje de contenedor canónico**: cada sección reinventa su superficie.

Evidencia en el repo:
- `src/styles/fonts.css`: carga `Caveat` 600/700 + `Poppins` 700/800; `--font-hand` en `@theme`.
- `src/components/home/HeroSection.astro`: `font-hand`, papel, cinta, subrayados a mano.
- `src/components/home/DiagnosticoSection.astro`: `font-hand`, bordes `12px 250px 14px 240px / …`,
  nota adhesiva `#f5efe0`, CTA "hoja de ruta" manuscrito.
- `src/components/ScrollCard.astro`: número `font-hand`, gradiente `#1A1A1A/#0C0C0C`.
- `global.css`: `--color-accent: #4f46e5`, `--font-heading: Poppins`, `--font-alt: Montserrat`
  (nunca cargada), `focus-visible` hardcodeado a `#6366f1`.
- `DESIGN.md` v2 §0 documenta los 10 conflictos spec↔repo y su resolución.

**Dirección nueva (v2)**: **Technopunk Enterprise** × **Webcore/old-web** × **Cybergoth** —
fondo `#090C10`, ventanas de sistema (`WebcoreWindow` con title bar + controles), headings en
monospace (**JetBrains Mono**), CTA primario neón **verde `#00FF66`** con texto `#090C10`,
acento de marca **púrpura `#A855F7`**, alertas **rojo `#FF3366`**, scanlines ≤3%, glitch <150ms,
status LED, y un **toggle Modo Cyber ↔ Modo Clean** obligatorio (a11y).

---

## 2. Objetivo

**Lograr que todo el sitio público y el panel admin expresen "autoridad técnica senior"
(Technopunk Enterprise) con tokens centralizados en `@theme`**, para que (a) el visitante
ejecutivo perciba solvencia y convierta por los CTAs, y (b) el visitante técnico (CTO/dev)
vea arquitectura, stack y métricas reales — sin fabricar humanidad ni datos, y cumpliendo
WCAG 2.1 AA con un modo reducido de una tecla.

Resultados medibles:
- 0 hex de la paleta v1 (`#010101`, `#4f46e5`, `#6366f1`, `#f5efe0`, `#141416`) en componentes de UI (o excepción comentada `/* design-exception */`).
- 0 usos de `font-hand` / Caveat / Poppins / Montserrat en el sistema.
- Toggle Cyber/Clean funcional, persistido, accesible por teclado.
- `pnpm build` limpio; contraste AA verificado con herramienta (no solo estimado).

---

## 3. Alcance

**In scope**
- Reescribir el contrato de **tokens** (`@theme` en `global.css`) a la paleta v2.
- Cargar **JetBrains Mono** (400/500/700/800, latin + latin-ext) y actualizar `@font-face` +
  `<link rel="preload">` en `BaseLayout`; retirar Poppins/Caveat del sistema.
- Componentes primitivos **NUEVOS**: `WebcoreWindow`, `TerminalWindow`, `StatusLed`,
  `AccessibilityModeToggle`, overlay de scanlines.
- Migrar superficies existentes a v2: `GlassCard`, `Card3D`, `ServiceCard`,
  `CinematicColumn` (queda solo en modo `cinematic`). `ScrollCard` **eliminado** (§11).
- Re-estilar secciones públicas: `Header`, `HeroSection`, `DiagnosticoSection` (→ Manifiesto),
  `ServicesSection` (bivalente + modal técnico), `NosotrosSection` (→ Equipo),
  `PortfolioSection`, `RecursosSection`, `CtaSection`, `Footer`, `Testimonials`, `casos/*`,
  `resenas`, `CookieBanner/CookiePreferences`.
- **Metodología** (sección nueva, `<MethodologyPipeline>`).
- Formularios: `ContactForm` (dual Guiado/Console), `QuoteForm`, `CotizarModal`,
  `LeadMagnetForm`, `casos/CasoForm` (re-estilizado a v2; endpoints intactos).
- Páginas SEO/local (`regiones/*`, `seo-local/*`, `servicios/*`, `blog`, `recursos/*`):
  heredar tokens y superficies nuevas (sin reescribir contenido).
- `AdminLayout` + `pages/admin/*`: **heredar tokens**, suprimir efectos decorativos
  (sin scanlines/glitch/terminal); mono solo en datos.
- Actualizar **`.claude/rules/ui-design.md`** solo si la implementación revela un ajuste
  (ya está en v2). No versionado (gitignored).

**Out of scope**
- Lógica de negocio, DB, migraciones SQL, endpoints (`src/lib/*`, `src/pages/api/*`, `migrations/`).
- Flujo de firma de contratos (`/firmar/*`), PDF (`contract-pdf.ts`), crypto (`crypto.ts`).
- Scripts Python (`scripts/prospector/*`) y `scripts/waha/*`.
- Contenido/SEO textual, JSON-LD, datos (`src/data/*`) — salvo placeholders honestos donde
  se necesiten (status real, caso "interno", testimonios "reservados").
- Reescritura de copy de negocio más allá de lo necesario para v2 (labels de CTA, nombres de
  módulo). El copy definitivo puede ir en PRD de marketing posterior.
- Fotos de equipo reales (aún no existen) → se especifica el tratamiento y se usa placeholder
  honesto.

---

## 4. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | `@theme` remapeado a la paleta v2 (superficies `#090C10/#161B22/#0D1117`, frame `#30363D`, texto `#F0F6FC/#8B949E/#6E7681`, acento `#00FF66`, brand `#A855F7`, danger `#FF3366`). | alta |
| RF-2 | JetBrains Mono 400/500/700/800 cargada (latin + latin-ext, `font-display: swap`); `--font-heading` = JetBrains Mono. | alta |
| RF-3 | `<link rel="preload">` en `BaseLayout` actualizado. **Deviation (§11)**: JetBrains Mono es **variable** (`wght 100–800`) → se precarga 1 archivo (`jetbrainsmono-latin.woff2`, cubre todos los pesos) + `inter-400`; se quitaron los preloads de poppins. | alta |
| RF-4 | Retirado todo uso de `font-hand`/Caveat/Poppins/Montserrat y de la paleta crema/papel. | alta |
| RF-5 | `<WebcoreWindow>`: contenedor con title bar (`#161B22` + borde `#30363D` + label mono), controles `_ □ ✕` con `aria-label` textual, sombra sólida `4px 4px 0 0 var(--color-frame)`, estado min/max persistido en `localStorage`. | alta |
| RF-6 | `<TerminalWindow>` (Hero): contenido visible SIN JS (presentación + lista estáticos); JS añade auto-type (~35–55ms/char) y prompt de comandos (`help`,`stack`,`services`,`contact`,`clear`); input es `<input>` con `<label>` accesible; no captura Tab ni bloquea scroll. | alta |
| RF-7 | `<StatusLed>`: LED con pulso 2s + texto real (`ALL SYSTEMS OPERATIONAL`); estático con `prefers-reduced-motion`. | media |
| RF-8 | `<AccessibilityModeToggle>`: switch Cyber↔Clean, aplica `data-mode` en `<html>`, persiste en `localStorage`, `aria-pressed`, operable por teclado. Default Cyber; si `prefers-reduced-motion`, hint inicial a Clean. | alta |
| RF-9 | Overlay de scanlines global: `repeating-linear-gradient` ≤ 0.03 opacidad, `fixed inset-0 pointer-events-none aria-hidden`; desactivado en Modo Clean y reduced-motion. | media |
| RF-10 | `ServiceCard` bivalente: capa ejecutiva (beneficio + CTA) visible + capa técnica en modal/desplegable (stack, arquitectura, métricas reales o etiquetadas como objetivo). | alta |
| RF-11 | CTA primario neón `#00FF66`/texto `#090C10`; CTA secundario borde metálico `#30363D`; labels mono uppercase. | alta |
| RF-12 | Sección **Metodología** nueva (`Audit → Architecture → Build → Deploy → Scale`) con `<MethodologyPipeline>`. | media |
| RF-13 | `ContactForm` dual: toggle "Modo Estándar / Modo Console"; Console acepta payload JSON, valida en cliente y envía al **mismo** endpoint `POST /api/leads` (source `contact`). Estándar siempre disponible. | media |
| RF-14 | Glitch solo en hover de botones secundarios/títulos, < 150ms, nunca en loop ni en cuerpo; off en Clean/reduced-motion. | baja |
| RF-15 | Admin: hereda tokens v2, sin scanlines/glitch/terminal; mono solo en datos. | media |
| RF-16 | ~~`ScrollCard`/`ServicesSection` conservan el patrón `svc-track` (sticky-deck CSS + cascada GSAP) re-vestido a v2; sin `reveal-item` en cards del track.~~ **SUPERSEDED (§11, 2026-10-14)**: se eliminó `ScrollCard.astro` + CSS `.svc-track*` (huérfanos y con bug TDZ en el timeline GSAP). `ServicesSection` pasa a **grid responsive** (`sm:2 / lg:3`) con `ServiceCard` bivalentes y reveal CSS puro (sin GSAP/pin). | alta |

---

## 5. Requisitos no funcionales

- **Accesibilidad (WCAG 2.1 AA, AAA en texto principal)**: foco visible con `#00FF66`;
  púrpura `#A855F7` nunca en texto <18.66px; controles de ventana con `aria-label` textual;
  decoración `aria-hidden`; `aria-live`/`role="status"` en feedback de formularios; `main#main-content`
  + `.skip-to-content`.
- **Contraste**: verificar con axe/WebAIM (la tabla de `DESIGN.md` §2.2 es **estimada**).
  Duros: `#090C10` sobre `#00FF66`; `#F0F6FC` sobre `#090C10`; `#8B949E` ≥14–18px.
- **Motion**: respetar `prefers-reduced-motion` (contenido visible sin animación); glitch <150ms;
  scanlines ≤3%; LED estático en reduced-motion.
- **Performance**: WOFF2 subsets + preload de pesos críticos; animar solo `transform`/`opacity`;
  imágenes v2 con Astro `<Picture>`/`<Image>` (sharp) → AVIF/WebP, `loading="lazy"` salvo hero
  (`fetchpriority="high"`), `width`/`height` (evita CLS). No introducir deps npm.
- **Compatibilidad/arquitectura (heredado, NO cambiar)**: Astro 7 + Tailwind v4 + GSAP 3.13 CDN
  por hooks `data-gsap-*`; `overflow-x: clip` (no `hidden`); `liquid-glass` con `mask-composite`
  (nunca junto a transform hover en el mismo nodo); patrón `is:inline` sin `{id}`
  (`document.currentScript.previousElementSibling` / `data-id`); fuentes self-hosted.
- **SEO**: conservar JSON-LD, `lang="es-CL"`, breadcrumbs, un `<h1>`/página, `FaqPreview`/`FAQSection`
  único por página. No romper rutas ni contenido indexado.
- **Honestidad**: LED/status deben reflejar algo real (health endpoint o dato honesto);
  métricas solo verificables o etiquetadas "objetivo"; testimonios `null` → "reservado/REC".

---

## 6. Diseño técnico

### 6.1 Módulos/archivos afectados

**Fase 1 — Tokens + fuentes**
- `src/styles/global.css` — reescribir `@theme` (§2.1 de DESIGN.md); actualizar `focus-visible`,
  `::selection`, `body` bg; retirar `.font-hand`; `--font-alt`/`--font-hand` fuera; `h1–h6`
  a `--font-heading` con peso 700.
- `src/styles/fonts.css` — retirar `Caveat` (600/700) y `Poppins` (700/800); añadir
  `JetBrains Mono` 400/500/700/800 (latin + latin-ext).
- `src/layouts/BaseLayout.astro` — actualizar preloads; `theme-color` a `#090C10`.
- Activos: `/public/fonts/jetbrainsmono-{400,500,700,800}-{latin,latin-ext}.woff2` (los provee el usuario).

**Fase 2 — Primitivas**
- `src/components/ui/WebcoreWindow.astro` *(nuevo)*.
- `src/components/ui/TerminalWindow.astro` *(nuevo)*.
- `src/components/ui/StatusLed.astro` *(nuevo)*.
- `src/components/ui/AccessibilityModeToggle.astro` *(nuevo)* + script en `BaseLayout`.
- Overlay scanlines (en `BaseLayout.astro` o componente propio).

**Fase 3 — Superficies**
- `src/components/GlassCard.astro` (deprecar/delegar a `WebcoreWindow`), `Card3D.astro`,
  `ServiceCard.astro`, `CinematicColumn.astro` (→ modo `cinematic`).
- ~~`ScrollCard.astro`~~ **ELIMINADO** (§11, 2026-10-14): huérfano tras rediseñar `ServicesSection`;
  su CSS `.svc-track*` también se retiró de `global.css`.

**Fase 4 — Header + Hero**
- `src/components/Header.astro`, `src/components/home/HeroSection.astro`.

**Fase 5 — Secciones home**
- `DiagnosticoSection.astro`, `ServicesSection.astro`, `NosotrosSection.astro`,
  `PortfolioSection.astro`, `RecursosSection.astro`, `CtaSection.astro`, `Testimonials.astro`.
- `src/components/MethodologyPipeline.astro` *(nuevo)* + integración en `src/pages/index.astro`.

**Fase 6 — Formularios**
- `ContactForm.astro`, `QuoteForm.astro` (si aplica), `CotizarModal.astro`,
  `LeadMagnetForm.astro`, `src/components/casos/CasoForm.astro`.

**Fase 7 — Admin y resto**
- `src/layouts/AdminLayout.astro`, `src/pages/admin/*`, `src/pages/regiones/*`,
  `src/pages/seo-local/*`, `src/pages/servicios/*`, `src/pages/blog/*`, `src/pages/recursos/*`,
  `src/components/casos/*`, `Footer.astro`, `CookieBanner.astro`, `CookiePreferences.astro`.

### 6.2 Cambios en DB

**No.** Sin migraciones SQL. Los formularios conservan endpoints y payloads (solo cambia UI).
Si `ContactForm` dual envía JSON (modo Console), se mapea al payload existente de `/api/leads`.

### 6.3 Nuevas dependencias

**Ninguna dependencia npm.** `sharp` ya está en devDeps; GSAP ya se sirve por CDN.
Lo único a incorporar son **archivos de fuente WOFF2 de JetBrains Mono** (assets estáticos).
Su obtención/instalación (descarga desde Google Fonts u origen self-host) **la decide y ejecuta
el usuario** (REGLA #1); el agente indicará el comando/ruta exactos y esperará confirmación.

### 6.4 Flujo (comportamientos nuevos)

1. **Carga de página (público)**: `BaseLayout` aplica `data-mode` (localStorage o default
   Cyber) antes del primer paint (script `is:inline` en `<head>`, sin `{id}`) → sin
   FOUC de scanlines. Renderiza header con LED + toggle + CTA neón.
2. **Hero**: `TerminalWindow` muestra presentación estática (no-JS). Con JS: auto-type +
   prompt (`help/stack/services/contact/clear`). Botones "Ver Servicios"/"Agendar Llamada"
   para no técnicos.
3. **Servicio (bivalente)**: `ServiceCard` → chrome `webcore-window`; capa técnica en `<details>`
   nativo (**sin JS**, accesible) con stack/arquitectura y nota de honestidad de cifras
   (desviación de "modal" en §6.4 original: se prioriza no-JS).
4. **Contacto**: toggle Estándar/Console. Console valida JSON en cliente; ambos → `POST /api/leads`.
5. **Toggle Cyber/Clean**: alterna `data-mode` en `<html>`; CSS global desactiva scanlines,
   glitch, glow, auto-type y pasa fondo a `#0D1117` plano. Persiste y respeta reduced-motion.

### 6.5 Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| Mantener v1 y solo cambiar tipografía | No resuelve el mensaje (notebook ≠ autoridad senior) ni la deuda de hex/manuscrito. |
| Rediseño "big bang" de un commit | Alto riesgo de romper sticky/GSAP/SEO/a11y; el plan §17 es incremental y verificable por fase. |
| Sustituir Astro por Next.js (spec origen) | Fuera de alcance, rompe SSR/Vercel/ISR/DB; se adapta a Astro (`<Picture>`/sharp). |
| Glass/`liquid-glass` como superficie dominante | v2 exige superficie **opaca** de ventana; glass queda solo para header/overlays. |
| Neón púrpura como acento primario de texto | Falla AA <18.66px; se usa verde para CTA y púrpura solo en bordes/badges. |

---

## 7. Plan de migración de datos

No aplica (sin cambio de esquema). Migración relevante = **migración de diseño**, por fases
(§6.1). Cada fase es incremental y reversible vía git. `localStorage` de v2 usa claves
namespaced (p. ej. `mtsprz:mode`, `mtsprz:win:<id>`) para no colisionar con preferencias
existentes (`__cookieConsent`). Rollback de una fase = revertir sus archivos; no hay datos
que migrar ni idempotencia que garantizar.

---

## 8. Criterios de aceptación

- [ ] **CA-1**: `@theme` de `global.css` coincide con `DESIGN.md` §2.1; no hay hex v1 en UI activa (o `/* design-exception */`). — **home ✓ (M0–M3)**; resto de páginas pendiente (fase 7).
- [x] **CA-2**: JetBrains Mono 400/500/700/800 cargada; preload de `BaseLayout` actualizado; headings renderizan mono real (no sintética). — variable `wght 100–800` verificada por parse WOFF2; confirmar visual en `pnpm dev`.
- [ ] **CA-3**: 0 usos de `font-hand`, Caveat, Poppins, Montserrat, papel crema en el código. — home ✓ (Hero/Services); quedan ~10 archivos (fase 5/7).
- [x] **CA-4**: `WebcoreWindow` con controles `aria-label`, sombra sólida, min/max persistido. — existe en `ui/`; `ServiceCard`/`CtaSection` usan la **clase** (chrome sin controles), el componente sigue sin consumidores.
- [x] **CA-5**: `TerminalWindow` muestra contenido sin JS; con JS tiene auto-type + prompt; reduced-motion lo muestra completo.
- [x] **CA-6**: Toggle Cyber/Clean funcional, persistido, por teclado, `aria-pressed`; sin FOUC. — script anti-FOUC en `<head>`.
- [x] **CA-7**: CTA primario neón con texto `#090C10`; secundario borde metálico. — Header/Hero/CTA.
- [ ] **CA-8**: `ServiceCard` bivalente (capa ejecutiva + técnica); páginas SEO/local y blog conservan contenido y rutas. — ServiceCard ✓ (`<details>` ficha técnica); páginas SEO/local pendiente.
- [ ] **CA-9**: `ContactForm` dual envía correctamente a `/api/leads` en ambos modos (estándar y console). — pendiente (fase 6).
- [ ] **CA-10**: Admin hereda tokens sin efectos decorativos; mono solo en datos. — pendiente (fase 7).
- [ ] **CA-11**: reduced-motion respetado (contenido visible); foco visible; `alt` correctos; `aria-live` en forms. — home ✓ parcial (noscript + reveals); forms pendiente.
- [ ] **CA-12**: Contraste AA verificado con herramienta. — pendiente (requiere navegador).
- [ ] **CA-13**: `pnpm check` y `pnpm build` pasan (los ejecuta el usuario). — pendiente.
- [x] **CA-14**: ~~Sin regresiones en `svc-track`~~ **SUPERSEDED**: `svc-track` eliminado (§11). Criterio vigente: `ServicesSection` = grid CSS responsive con `reveal` puro, sin GSAP ni sticky; verificar 1/2/3 columnas y que las 7 cards rendericen sin JS.

---

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| JetBrains Mono no se obtiene/instala → headings sintetizados | media | alto | Fase 1 bloqueante: no shippear sin la fuente; el usuario provee los WOFF2; verificar visualmente. |
| `overflow-x`/layout roto por cambios | baja | alto | Mantener `overflow-x: clip`; `reveal-group` con `opacity:0` siempre cubierto por `<noscript>`; probar móvil/sin-JS. |
| `liquid-glass` + transform hover (rompe `mask-composite`) | media | medio | Regla dura: no combinar; glass solo header/overlays. |
| ~~GSAP cascada pelea con reveals/`WebcoreWindow`~~ → **obsoleto**: `svc-track` eliminado; `ServicesSection` ya no usa GSAP. Riesgo residual: hero GSAP `matchMedia` + `ScrollTrigger.refresh()`. | baja | bajo | `gsap.matchMedia()`; `ScrollTrigger.refresh()` en load. |
| Contraste insuficiente (púrpura/neón) | media | alto | Verificar con axe/WebAIM; reglas duras de color; Modo Clean plano. |
| Scanlines/glitch degradan legibilidad o perf | media | medio | ≤3% opacidad; glitch <150ms off-loop; off en Clean y reduced-motion. |
| Regresión SEO (JSON-LD, h1, rutas) | baja | alto | No tocar datos/schema/contenido; revisar diffs de `<head>` y breadcrumbs. |
| Rediseño masivo rompe páginas no revisadas | media | medio | Fases incrementales verificadas con `pnpm build` + `pnpm dev`; checklist por fase. |
| Toggle sin FOUC (flash de modo equivocado) | media | bajo | Script `is:inline` en `<head>` que setea `data-mode` antes del paint. |

---

## 10. Verificación (comandos que ejecuta el usuario en Windows)

```bash
pnpm check     # tipos (Astro/TS) — tras cada fase
pnpm build     # compilación / SSR — tras cada fase
pnpm dev       # ver en vivo: home, servicios, un servicio, una región, contacto, admin
# no aplica: pnpm migrate / pnpm seed / pnpm test:emails (sin cambios de DB/correo)
```

Chequeos manuales sugeridos (el usuario, en `pnpm dev`):
- Hero en móvil 375px y desktop; sin scroll horizontal.
- Toggle Cyber/Clean: recarga y verifica persistencia; activa "reduce motion" del SO y revalida.
- `Tab` por header, ventanas, terminal y formularios → foco visible y orden lógico.
- `servicios` (`#servicios`): grid responsive (1/2/3 columnas), 7 ventanas `ServiceCard`, `<details>`
  "ficha técnica" abre sin JS, CTAs `[ Solicitar diagnóstico ]` → `/cotizar` y "Ver catálogo completo".
- `contacto`: envía en Modo Estándar y en Modo Console.
- `admin/*`: sin scanlines/glitch; densidad y mono solo en datos.

> El agente NO ejecuta estos comandos (REGLA #1). El usuario los corre y comparte el output.
> El agente NO hace commit ni push (REGLA #3); entregará resumen + mensaje de commit sugerido.

---

## 11. Bitácora de ejecución

> Última actualización: **2026-10-15**. El agente no commitea (REGLA #3); los mensajes de commit
> sugeridos se entregan al usuario. No se ejecutó `pnpm check`/`build` aún (REGLA #1).
> **Directriz usuario (2026-10-15)**: secciones home a **100% width en desktop**, siempre responsive;
> nada de contenedores centrados estrechos (aplicado: `DiagnosticoSection` hoja de ruta + `NosotrosSection`; extendida a internas: hero + grilla de `/servicios`).

### Fase 1 — Tokens + fuentes · ✅ COMPLETA
- `src/styles/fonts.css`: Inter 400 (latin/latin-ext), **JetBrains Mono variable ×2** (`100 800`, `swap`), Fira Code 400 latin, Caveat 600/700 ×4 (transitorio); **Poppins fuera**.
- `src/styles/global.css`: `@theme` v2 + aliases transitorios (`--color-border*` → frame); `--font-heading`/`--font-mono` = JetBrains Mono; `--font-hand` conservado (transitorio); radios 4/6/10/14; `--spacing-section: 5rem`; `body` bg; `h1–h6` 700/1.15; `::selection`; `:focus-visible`; `select option`.
- `src/layouts/BaseLayout.astro`: preload `jetbrainsmono-latin` + `inter-400`; `theme-color #090C10`; `body` sin `bg-[#010101]`.
- Activos: `public/fonts/jetbrainsmono-latin.woff2` (31 432 B) + `jetbrainsmono-latin-ext.woff2` (11 624 B).
- **Deviation**: fuente **variable** → 1 preload cubre todos los pesos (ver RF-3).

### Fase 2 — Primitivas · ✅ COMPLETA
- `src/components/ui/` (5 nuevos): `WebcoreWindow.astro`, `StatusLed.astro`, `ScanlinesOverlay.astro`, `AccessibilityModeToggle.astro`, `TerminalWindow.astro`.
- `global.css` (apéndice): `.webcore-window` (sombra sólida `4px 4px 0 0 var(--color-frame)`), `[data-window][data-maximized]`, `.win-ctl`, `.win-body[hidden]`, `.scanlines`, `@keyframes led-pulse` + `.led-pulse`, `html[data-mode="clean"]`, reduced-motion.
- `BaseLayout.astro`: `<ScanlinesOverlay />` (primer hijo de `<body>`) + script anti-FOUC `data-mode` en `<head>`.

### Fase 3 — Superficies · 🟡 PARCIAL
- `src/components/ServiceCard.astro` ✅ reescrito (bivalente; chrome **sin controles**; capa técnica `<details>`; acento solo decorativo).
- `src/components/ScrollCard.astro` ✅ **ELIMINADO** + CSS `.svc-track*` retirado de `global.css` (huérfanos; bug TDZ eliminado con la reescritura de `ServicesSection`).
- `GlassCard.astro`, `Card3D.astro`, `CinematicColumn.astro` → **pendientes**.

### Fase 4 — Header + Hero · ✅ COMPLETA
- `src/components/Header.astro` reescrito: nav `liquid-glass z-50`, `StatusLed ONLINE`, **un solo** `AccessibilityModeToggle`, CTA `[ Cotizar ]` neón, overlay móvil accesible (`Escape`, click en link, scroll-lock).
- `src/components/home/HeroSection.astro` reescrito: H1 mono + `StaggerText`, `TerminalWindow`, `StatusLed`, CTAs neón/metal, video fondo, GSAP `matchMedia` + parallax, trust strip.
- `src/layouts/BaseLayout.astro`: `<noscript><style>` → reveals/`stagger-char`/`blur-word` visibles sin JS.
- `src/components/home/CtaSection.astro`: `id="contacto"` añadido (resto v1 → reescrito en Fase 5).

### Fase 5 — Secciones home · ✅ COMPLETA — falta verificación visual (usuario)
- ✅ `src/components/home/ServicesSection.astro`: grid `sm:2 / lg:3` + `reveal` puro, `id="servicios"`, sin GSAP/pin.
- ✅ `src/lib/service-display.ts`: acentos a §2.3 (Web `#00FF66`, SEO `#22E584`, Automatización `#22D3EE`, Datos `#A855F7`).
- ✅ `src/components/home/CtaSection.astro`: ventana de contacto v2 (`[ Cotizar proyecto ]` → modal; `[ Contáctanos ]` → `/contacto`).
- ✅ `src/components/home/DiagnosticoSection.astro` (Manifiesto): header mono + rutas como ventanas Webcore (dot con acento §2.3 por categoría), hoja de ruta = ventana entrada (CTA neón `[ Solicitar diagnóstico ]`) + conector SVG + ventana salida con "Respuesta rápida" GEO en plano (§7.3); copy/enlaces intactos; `index.astro`: fallbacks de acento a §2.3. Retrofit 100% width (sin `max-w` en hoja/h2).
- ✅ `src/components/home/NosotrosSection.astro` (Equipo): manifiesto en ventana `cat mision.md` (copy xl a 2 columnas) + cobertura regional como `ls /regiones/` (5 links con aria-label, filas full width 12-col); GSAP retirado → reveal CSS puro; `id="nosotros"`; sin font-hand/stickers.
- ✅ `src/components/home/PortfolioSection.astro` (Casos): consola de deploys `deploys --status=production` — 5 entradas log full-width (índice `[0X]`, LED `en producción`, host real, stack en chips mono, captura `<picture>` AVIF/WebP/PNG); CTA `[ Ver portafolio completo ]` borde metálico → `/portafolio`; GSAP retirado (307 → ~180 líneas) → reveal CSS puro; `id="portafolio"`; enlaces externos `_blank` intactos.
- ✅ `src/components/home/RecursosSection.astro` (Recursos): ventana `biblioteca --gratis` — índice de guías en formato log full-width (`[0X]`, LED `acceso libre`, slug real `/recursos/[slug]`, icono lucide en caja frame, promesa + audiencia en chips mono); CTA `[ Biblioteca completa ]` borde metálico → `/recursos`; sin font-hand/hex v1 (amber/indigo) → reveal CSS puro; `id="recursos"`; slugs y copy intactos (SEO/GEO).
- ✅ `src/components/Testimonials.astro` (Testimonios): ventana de reseña `reseña --verificada` (estrellas en acento, cita y autor en tokens v2); conserva API, datos y JSON-LD Review; `id="testimonios"`; liquid-glass y amber v1 retirados.
- ✅ `src/components/home/MethodologyPipeline.astro` (Metodología · **nueva**): ventana `pipeline --run all` — 5 etapas Audit → Architecture → Build → Deploy → Scale en mosaico hairline (`[0X]` + comando mono + descripción); pie `[ Solicitar diagnóstico ]` → `/contacto`; integrada en `index.astro` en orden canónico §14 (Servicios → Metodología → Equipo).
- ✅ `src/components/Footer.astro`: tokens v2 (frame/text-*), CTA `[ Cotiza gratis ]` borde metálico, sociales en caja frame, headings y barra inferior en mono; full width; datos, enlaces y script de cookies intactos.
- ⏳ Solo falta verificación visual del usuario en Windows (`pnpm dev` / `pnpm build`).

### Fases 6–7 · 🟡 EN CURSO — prioridad usuario: páginas internas
- ✅ `/servicios` · hero v2: nueva primitiva reutilizable `ui/PageHero.astro` (video atenuado §5.4 + scrim, StatusLed, H1 StaggerText, CTAs mono, strip inferior con breadcrumbs; slots `actions`/`aside`) + aside `catálogo --list` con `WebcoreWindow` → `#servicios`; retirado hero v1 (`#010101`, estilos inline `!important`, `w-screen`).
- ✅ `Breadcrumbs.astro` migrado a tokens v2 (font-mono · text-* · hover accent) — hereda a todas las páginas internas (regiones, blog, casos, contacto…).
- ✅ Fix datos `ui/TerminalWindow.astro`: `chillán` → `puerto varas`; `hola@mtsprz.cl` → `contacto@mtsprz.org`.
- ✅ `/servicios` · grilla v2: header mono `// nuestros servicios` + `BlurText` en tokens v2; grid full-width de 7 ventanas `ServiceCard` (mismo criterio que home: `1/2/3/4`, `reveal` CSS puro, `<details>` ficha técnica); CTA por tarjeta `Explorar servicio` → landing / `Cotizar` → `/cotizar`; `CinematicColumn` v1 **eliminado**.
- ✅ `src/lib/service-display.ts`: acentos §2.3 completos (Marketing `#EAB308`, Diseño `#C084FC`, Consultoría `#FF3366` — roles: alertas/auditoría) + `serviceStack` movido a la lib (fuente única home + `/servicios`); dead code `getEditorialBg*` retirado. `ServiceCard`: props `ctaText`/`ctaHref` (home intacto); `ServicesSection` home consume `s.stack` (render idéntico).
- ✅ `/servicios` · FAQ v2: sección full-width `bg-bg` con eyebrow mono `// preguntas frecuentes` + `BlurText`; accordion editorial (filas `border-frame/60`, índice mono `[0X]`, chip `+` 4px que rota 45° en `group-open`, respuestas `max-w-3xl`); CTA inferior `Hablemos` borde metálico → `/contacto`; retirados `#0A0A0A`, gradientes indigo, ruido SVG y hairlines v1. Copy, JSON-LD FAQPage y `<details>` sin JS intactos.
- ✅ `/servicios` · CTA final v2: ventana de contacto canónica (`webcore-window` con chrome `contact — iniciar conversación`, `id="contacto"`, DESIGN §13[8]) — port del `CtaSection` del home; `// hablemos` + h2 + copy v2 tokens + doble botón `[ Cotizar proyecto ]` (modal global) / `[ Contáctanos ]` → `/contacto` + teléfono mono + 3 checks accent. Retirados `#0A0A0A`, gradientes indigo, ruido, hairlines y botón gradiente v1. **`/servicios` 100% v2 (hero + grilla + FAQ + CTA).**
- ✅ `/portafolio` · hero v2: primitiva `ui/PageHero` (mismo patrón home//servicios) — LED `05 proyectos en producción`, eyebrow `// portafolio · en producción`, H1 StaggerText `Portafolio` + accent `Web y aplicaciones a medida.`, aside `portafolio --list` (`WebcoreWindow` sunken con host real por fila + pie `ver detalle ↓`), CTAs `[ Cotizar Proyecto ]` (modal) / `[ Ver Proyectos ]` → `#proyectos`, strip con breadcrumbs + año de build. Retirado hero v1 (`#010101`, `w-screen`, estilos inline `!important`, video full-opacity, breadcrumb flotante `max-w-6xl`). Ancla `#proyectos` añadida al primer spread. Prioridad usuario (2026-10-15): `/portafolio` antes que salmonicultura.
- ✅ `/portafolio` · spreads de proyecto v2 (×5): grilla editorial `lg:grid-cols-12` (imagen 7 col / ficha 5 col) full-width con hairlines `border-frame/60`; carrusel re-tokenizado (dots `bg-frame`/`bg-accent`, botones metal `rounded-[4px]` `border-frame` + hover accent, scrim `from-bg/80`, hover-reveal md+ con `group-focus-within`); ficha: eyebrow `// proyecto 0N`, H2 BlurText 4xl→6xl, sub-línea acento (título partido por `·`), descripción, chips `rounded-[4px] border-frame bg-surface`, CTA `[ Visitar proyecto ↗ ]` + host mono. Retirados: fondos `#0A0A0A`/radial/noise, acentos indigo `#6366f1`/`#8b5cf6`, `onmouseover` inline, `min-h-screen` de carrusel (ahora `h-[300px] sm:h-[420px] lg:min-h-[560px]`), estilos inline `min-height:inherit`. Derivación única `items` (head/sub/host/num) compartida aside+spreads. Eager solo 1er slide del 1er proyecto.
- ✅ `/portafolio` · CTA final v2: ventana canónica §13[8] (`webcore-window` + title bar `contact — iniciar conversación` + LED accent) — eyebrow `// contacto`, H2 `¿Tienes un proyecto en mente?` (acento en "en mente?"), copy v1 conservado, `[ Contactar ]` accent-filled → /contacto + `[ Portafolio completo ↗ ]` metal → sitio externo, línea teléfono + trust strip (`Sin compromiso / Respuesta en 24 hrs / Atención en el sur de Chile`). Retirados: fondos `#0A0A0A`/radial/noise indigo, H2 8xl con gradiente, `onmouseover` inline. **`/portafolio` queda 100% v2** (hero + 5 spreads + CTA, cero rastros v1).
- ✅ `/casos` · hero v2: `PageHero` canónico (video §5.4 + LED `4 casos documentados` + eyebrow `// casos · sur de chile` + H1 "Trabajo real, números reales." / acento "Sin humo." + CTAs `[ Diagnóstico Gratis ]`/`[ Ver los Casos ]`) + aside `WebcoreWindow casos --list` (4 clientes + industria) + strip de cifras data-driven (ex-stats v1) full-width. Retirados: `#010101`/radial/noise indigo, tab ARCHIVO·CASOS, rects dashed, `font-hand` 2026, breadcrumbs inline, aside nav+SCROLL.
- ✅ `/casos` · showcase `01 El trabajo` v2: sección full-width `bg-bg`; header canónico (eyebrow `// 01 · el trabajo` mono accent, H2 tokens v2, tagline mono `// todas las historias, una sola mesa`, contador `casos-count` mono tertiary); chips de filtro v2 (`rounded-[4px] border-frame bg-surface` mono; `is-active` accent-filled); regla superior sólida `bg-frame` full-bleed (scaleX GSAP conservado); `CasoCard` re-skin completo (fila `border-b border-frame/60`, visual sin rotate en marco `rounded-[6px]`, índice editorial mono `text-tertiary/70`, sello chip v2 mono backdrop-blur, meta `[0N]` + LED + industria, h3 hover accent, métricas `divide-frame/60`, CTA `[ Ver caso completo ]` + `ArrowUpRight`); empty state v2 `surface-sunken`; JS: guard del underline + rows sin rotation. Retirados: `#0A0A0A`, `font-hand #fde68a`, underline SVG `#6ee7b7`, `white/[...]`, dashed, rotaciones/sombras v1.
- ✅ `/blog` · hero v2: `PageHero` canónico (video §5.4 + LED `55 artículos publicados` + eyebrow `// blog · marketing digital y seo` + H1 "Marketing digital y SEO" / acento "explicado para pymes." + CTAs `[ Explorar artículos ]` accent → `#articulos` / `[ Suscribirme ]` metal → `#newsletter`) + aside `blog --list` (`WebcoreWindow` sunken: últimos 5 posts con fecha es-CL, pie `55 artículos` + `explorar ↓`) + strip de control full-width (ex-hero v1): `temas:` + chips v2 (`allTags.slice(0, 6)`) + `BlogSearch` re-tokenizado (`surface`/`frame`, mono 12px, focus ring accent, feedback `--color-danger`/`--color-text-tertiary`). Anclas `#articulos`/`#newsletter` (`scroll-mt-20`) e import muerto `Breadcrumbs` retirado. Retirados: `#0A0A0A`, `#6366f1`, `white/[...]`, `w-screen`, estilos inline `!important`, pills redondos, scroll indicator.
- ✅ `/blog` · featured v2: columna cinematográfica full-bleed (§5.4) re-tokenizada — post destacado `sortedPosts[0]`: imagen como textura (`opacity-25`, hover `scale-[1.04]`, eager/`fetchpriority`), base plate `bg-bg` + scrims `from-bg via-bg/70` (`aria-hidden`); contenido anclado abajo full-width: eyebrow `// destacado` accent + H2 mono con hover accent; meta en chips mono v2 (categoría / fecha es-CL `2-digit` / `{fReadMin} min de lectura` / chip `Actualizado` `border-accent/40 bg-accent-subtle`); CTA `[ Leer artículo ]` borde metálico → accent; alto fijo `h-[420px] sm:h-[520px] lg:h-[600px]` (adiós `80dvh`/`90vh`), hairline `border-b border-frame/60`; retirados `#0A0A0A`, `#6366f1`, `white/[...]`, `emerald-400`, `max-w-6xl`, `style=` inline y var muerta `fImg`.
- ✅ `/blog` · grilla `02 · últimos artículos` v2 (4 tiers): header canónico full-width (eyebrow `// últimos artículos` accent + contador mono tertiary, sin `max-w-6xl`); cards re-tokenizadas `rounded-[6px] border-frame/60 bg-surface hover:border-frame-hover hover:bg-surface-hover` (fuera `#0D0D0F`, `white/[...]`, indigo inline); imagen `bg-surface-sunken` + fusión `from-surface`, badge `Nuevo` chip accent LED (`border-accent/60 bg-bg/70`, dot `animate-pulse`); categoría con punto guía §2.3 (helper `getCategoryAccent`: SEO `#22E584`, Automatización `#22D3EE`, Web `#00FF66`, Marketing `#EAB308`, Digital `#A855F7`) + label mono; títulos mono hover accent; meta mono tertiary (`·` decorativos en `text-frame`); CTA `[ Explorar ]` metal; tier 4 rows `border-frame/60` + divider hairline sólida (fuera gradiente inline); `emerald-400` retirado. 54 cards data-driven intactas (fechas `datetime`, `content-visibility`, copy/orden sin cambios).
- ✅ `/blog` · newsletter v2: `border-t border-frame/60 bg-bg` + glow accent radial `#00FF660D` (fuera `#0A0A0A`, radial `#6366f112`, hairline `#6366f122`); eyebrow `// no te pierdas nada` mono accent; input `rounded-[4px] border-frame bg-surface font-mono focus:border-accent` (fuera `bg-white/[0.04]`); botón outline accent (`border-accent/40 bg-accent-subtle text-accent` → hover rellena `bg-accent text-bg`); statuses del script inline re-tokenizados (`text-danger`/`text-accent`, mono — fuera `red-400`/`emerald-400`); ids, `/api/leads`, `trackEvent`, reveal y lógica intactos. **`/blog` 100% v2 — cero marcadores v1 en el archivo.**
- ✅ `/blog` · paginación del archivo `Tier 4` (pedido usuario 15 oct): 5 filas por página client-side progresiva — HTML completo estático, sin JS se ven las 46 filas (SEO/crawlers intactos); pager `<nav>` metal-mono centrado (ventana `1 … p±1 … N` + flechas ←/→ con disabled + `aria-current`), scroll suave al inicio del listado al cambiar página; tiers 1-3 (9 posts) fijos como destacados.
- ✅ `/contacto` · hero v2 (pedido usuario 15 oct — prioridad sobre `/casos` testimonios): `PageHero` canónico (video §5.4 + scrim, LED `canal directo · respuesta en 24 hrs`, eyebrow `// contacto · puerto varas`, H1 "Hablemos de tu" / acento "próximo proyecto.", subtitle v2) + CTAs `[ Enviar mensaje ]` accent → `#formulario` / `[ WhatsApp directo ]` metal (wa.me con texto pre-cargado conservado) + aside `contacto --canales` (`WebcoreWindow` sunken: `[01]` email mailto · `[02]` WhatsApp wa.me · `[03]` Puerto Varas · Los Lagos, pie `respuesta en 24 hrs` + `ir al formulario ↓`) + strip breadcrumbs + año. Retirados: `#010101`, video inline `!important`, `w-screen h-[100dvh]`, breadcrumb flotante `max-w-6xl`, H1 `CONTACTO` 9xl. Ancla `id="formulario"` + `scroll-mt-20` añadida a la sección de contacto. Import `Breadcrumbs` directo retirado (lo maneja `PageHero`).
- ✅ `/contacto` · sección información + formulario v2 (pedido usuario 15 oct "mismo criterio"): sección full-width `bg-bg` grid `lg:grid-cols-12` (info 5 / form 7); izq. eyebrow `// información` + filas canales (iconos lucide Phone/Mail/MapPin en cajas `rounded-[4px] border-frame bg-surface`, índice `[0N]`, tel/mailto accionables con hover accent) + chips de confianza canónicos con `Check` accent; der. eyebrow `// cuéntanos de tu proyecto` + form editorial v2: inputs boxed `rounded-[4px] border-frame bg-surface focus:border-accent` (dos cols sm nombre/email), select con `ChevronDown` custom (`appearance-none`), presupuesto como chips `has-[:checked]` accent, textarea `resize-none`, submit primary accent `[ Enviar mensaje ]` + `ArrowRight`, `#form-status` con `role="status" aria-live="polite"`, nota WhatsApp → link accent. Script inline re-tokenizado (`text-accent`/`text-danger` mono) manteniendo ids, `novalidate`, fetch `/api/contact` + FormData + `trackEvent`. Retirados: `#0A0A0A`, radials indigo, noise SVG, hairlines `#6366f144/#6366f122`, `max-w-5xl`, `text-white`, pills redondos, gradiente botón indigo, `#25D366`, `accent-[#6366f1]`. Copy/payloads intactos.
- ✅ `CotizarModal` v2 (pedido usuario 15 oct "mismo criterio") — modal público de captura en 2 pasos (email → código), disparado desde Header/Footer/Hero/Cta/Portafolio/Servicios: re-chrome como ventana de sistema canónica (`.webcore-window` global + title bar con dots y `cotizar --gratis` + ✕ `win-ctl--close`), body `surface-sunken`, eyebrows `// paso 1|2 de 2` accent, H3 `font-heading` con segunda frase tertiary, inputs boxed v2 (`focus:border-accent`), código en 6 cajas, botón primary accent full-width, errores `font-mono text-danger`, resend link tertiary→accent, status bar con `StatusLed` "verificación en 2 pasos". Spinners `animate-spin` (fuera `@keyframes modal-spin`). Script intacto (ids 22/22, `/api/send-code`, `/api/verify-code`, `trackEvent`, `openCotizarModal`/`closeCotizarModal`); mejoras a11y: `aria-hidden` alternado en open/close, Escape cierra. Retirados: `#0A0A0A`, `#1A1A1A`, `#f87171`, rgba(255…), inline styles + handlers `onmouseover/onfocus/onblur`, noise SVG.
- ✅ `/cotizar` v2 (pedido usuario 15 oct "mismo criterio"): reescritura completa 659 → 724 líneas (325+/260−, 2 estados server-side). **Estado 1 (sin verificar):** `PageHero` canónico (LED `acceso con código`, eyebrow `// cotización · paso 1 de 2`, H1 "Cotiza"/"gratis.", meta `verificación en 2 pasos`, CTA `[ Explorar servicios ]` metal) + aside `cotizar --como-funciona` (flujo `[01][02][03]` + LED `sin compromiso`) + ventana centrada `cotizar --verificación` (step 1 email / step 2 código en 6 cajas con separador `·`, spinners `animate-spin`, LED `verificación en 2 pasos`). **Estado 2 (verificado):** `PageHero` (LED `sesión verificada`, note `Sesión: {email}`, meta `sin compromiso · menos de 24 hrs`, aside `acceso --verificado`) + grid `lg:grid-cols-12`: catálogo `lg:col-span-8` (categorías con barra accent + contador `[N]`, opts `has-[:checked]:border-accent/50 has-[:checked]:bg-accent-subtle`, checkbox `accent-accent`, badge `Popular` accent, promo `<s>` + `/mes` mono) + sidebar `lg:col-span-4 lg:sticky lg:top-24` ventana `resumen --live` (`#cotizar-summary` con `aria-live="polite"`, subtotal/descuento/total, submit accent con estado `opacity-40 pointer-events-none` hasta selección, teléfono opcional, LED `cotización en vivo`). **Bug v1 corregido:** `#cotizar-discount-row` (`class="hidden"` + `style="display:flex"` inline → fila "Descuento pack" siempre visible) ahora toggles `hidden`/`flex` por clases vía `setDiscountRow`. Script re-tokenizado: selector `.font-heading.font-semibold` → `[data-service-name]`, strings de `summary.innerHTML` con clases Tailwind literales, helpers `setSubmitReady`/`setDiscountRow`, spinner `animate-spin` (fuera `<style>`/`@keyframes spin`), success SVG `currentColor` + `text-accent`. Conservados: `prerender=false`, query `services`, cookie `mtsprz_verified`, tabla `verified_emails`, endpoints `/api/send-code` `/api/verify-code` `/api/submit-quote`, packs (350k/150k/100k), payloads, `trackEvent` (`verify_success`/`email_resend`/`quote_submitted`), precios `${N}k`. `<main id="main-content">` restaurado (skip-link de `BaseLayout` operativo). Retirados: `#010101`, `#1A1A1A`, `#0A0A0A` (sidebar sticky v1), indigo `rgba(99,102,241)`, `#f87171`, `#34d399`, `style=` inline + handlers `onfocus/onblur/onmouseover/onmouseout`, noise SVG, `max-width:480px`. Verificado: 0 residuos v1, ids 30/30, balance `<main>` 1/1.
- ✅ `/automatizacion` · hero v2 (pedido usuario 15 oct "partir con el hero", 100% width + 100% responsive): v1 full-bleed (100dvh, H1 `clamp(4rem,13vw,15rem)` "AUTOMATIZA TU NEGOCIO", noise SVG, gradiente `#010101`, CTAs `#1A1A1A` con hover `#25D366` + handlers inline) → `PageHero` canónico (LED `bots activos · 24/7`, eyebrow `// automatización · bots, datos y flujos`, H1 "Automatiza"/"tu negocio.", subtitle v1 intacto, video §5.4 vía `VIDEO_HERO` con preload, breadcrumb integrado al strip, meta `puerto varas · osorno · valdivia`). CTAs: `[ Cotizar online ]` accent → `/cotizar` + `[ Consultar ahora ]` metal → `waUrl` (patrón `/contacto`: interna accent, WhatsApp metal). Aside: `WebcoreWindow` sunken `automatizar --flujos` con las 4 soluciones (`[01]` 24/7 · `[02]` diario · `[03]` crm · `[04]` kpis), pie `ahorra 10+ hrs/semana` + `ver soluciones ↓`. Ancla `#soluciones` (`scroll-mt-20`) añadida al grid. `<main>` → `class="overflow-x-hidden"` (fuera style inline). Import `Breadcrumbs` retirado (0 refs). Verificado: 0 residuos v1 en hero (L121–183), `<section>` 4/4, `<main>` 1/1, `PageHero` 1/1. **Resto de página aún v1** (answer block GEO, soluciones 4 cols, planes, FAQ, CTA final, `<style>` sol/plan/faq).
- ✅ `/automatizacion` · answer block GEO v2 (continuación 15 oct; iteración pedido usuario "menos texto, mejor distribuido, siguiendo el estilo"): v1 (shell `max-w-[920px]` centrado, hairline verde `rgba(37,211,102)`, label 0.6rem gris-verde, statement `clamp(1.4rem,3.4vw,2.4rem)` `#fff` con precios `#25D366`, CTA `#1A1A1A` + `onmouseover`) → shell canónico v2 (`<section relative w-full bg-bg>` + `px-4 py-20 sm:px-6 md:py-28 lg:px-8 xl:px-12`), grid `lg:grid-cols-12` (eyebrow mono `// respuesta directa · automatización con IA` `text-accent` col-3 · contenido col-9). Contenido fragmentado en 4 capas para lectura en 2 segundos, misma info: **lead** (1 frase, `font-heading text-2xl md:text-3xl font-bold tracking-[-0.02em] max-w-3xl`) · **capacidades** grid `sm:grid-cols-3` con índices mono `[01]`–`[03]` terciarios (bots de WhatsApp 24/7 · reportes que se generan solos · flujos Excel/CRM/email) · **barra precio/CTA** `border-t border-frame/60 pt-6` (precios poppins bold `text-accent`, kicker mono `resultados en días · sin conocimientos técnicos`, CTA `[ Quiero mi diagnóstico ]` accent → `waUrl` alineado a la derecha en lg) · **nota** mono `Caso real: contador de Puerto Varas · 200 comprobantes al día sin digitar`. Retirados `#010101`, `#25D366`, `#1A1A1A`, hairline decorativa, handlers inline y shell 920px. Copy GEO: misma información, frases originales preservadas (lead + capacidades verbatim; conectores condensados en barra). Fix usuario post-review: espaciado texto↔precios con 3× `{' '}` explícito (Astro trimea el whitespace con newline entre texto y `<span>` inline → renderizaba "desde$590.000pago"). 0 residuos v1 en la región, `<section>` 4/4, `<main>` 1/1.
- ✅ `/automatizacion` · soluciones + planes + FAQ + CTA final + `CiudadesRelacionadas` v2 (continuación 15 oct): **SOLUCIONES**: 4 cols v1 (gradientes `#041208`/`#25d366`/`#06b6d4`/`#6366f1`/`#10b981`, noise SVG, handlers inline, `#010101`) → `<section id="soluciones">` full-bleed con 2 filas 55/45 · 45/55, superficies planas v2 (`bg-surface` ↔ `bg-surface-sunken` con hover swap), índices `[01]`–`[04]` accent, títulos normalizados a sentence-case, stat chips mono (`10+ HRS/SEMANA`, `3X MÁS APERTURA`), CTA compacta `[ Consultar ]` metal en 01/04; móvil stack `min-h-[20rem]`. **PLANES**: `<section id="planes">`, elimina `100vw`/`#0A0A0A`/handlers → header `// precios` + 3 filas editoriales `lg:grid-cols-12` (num/precio/nota · nombre + features con check accent `sm:grid-cols-2` · CTA `[ Lo quiero ]`), destacado 02 con `border-l-accent` + `bg-surface/40` + CTA accent y badge `· popular`; nota final con `{' '}`. **FAQ**: `<section id="faq">` accordion canónico de `/servicios` (6 Q&A verbatim, índices `[0X]`, icono `+` rotate-45 `group-open`). **CTA FINAL**: min-h-75vh/radial `#25D366` → sección estándar `border-t`, `Recupera` + `tu tiempo` accent, `[ WhatsApp ]` accent + `[ Cotizar online ]` metal. **`CiudadesRelacionadas`** (compartido con regiones): v1 (`#0A0A0A`, `#6366f1aa`, `max-w-6xl`, `white/[0.02]`) → v2 full-width `border-frame`/`bg-surface` + eyebrow `// también trabajamos en`. `<style>` scoped v1 eliminado completo; `main` → `overflow-x-clip` (DESIGN §15). Copy verbatim (features, precios, Q&A, nombres de plan); case de títulos a sentence-case (estilo v2). `<section>` 5/5, 0 residuos v1 en todo el archivo.
- ✅ `/regiones/*` v2 (15 páginas — pedido usuario "ojalá todas las regiones", continuidad 15 oct): plantilla canónica nueva `src/components/RegionPage.astro` (hero §13[2] vía `PageHero` + ficha `WebcoreWindow` `<slug> --ficha` con población INE censo 2024, distancia y sectores + link `#datos-locales`; servicios full-bleed en 3 layouts; guías `md:grid-cols-3`; FAQ `#faq-completo` con GEO `FaqPreview` + accordion canónico; `LocalidadDatos`; CTA final; `CiudadesRelacionadas`) + `LocalidadDatos.astro` v2 (`#datos-locales` full-width, stats censo, chips sectores, hitos, fuente INE) + `FaqPreview.astro` v2 (fallback `defaultFaqs`, link a `#faq-completo`). Los 15 `src/pages/regiones/*.astro` (269–388 líneas v1) → **thin wrappers ~95 líneas** (script determinista, pre-validación en memoria): `BaseLayout` + **2 JSON-LD (FAQPage/LocalBusiness) verbatim**, consts `waPhone/waMsg/waUrl/site` verbatim, 3 guías + 4 FAQ verbatim; `<main id="main-content" class="overflow-x-clip">` + `<RegionPage>` por props. Variantes: **osorno** `seo-first` + `<StickyCTA>` conservado; **valdivia** `auto-first` + `colWeb={55}` (55/45); resto `web-seo` 60/40. **Bugs v1 corregidos**: `chiloe` sin entry en `regiones.ts`/`CiudadesRelacionadas` (añadida: 176.865 hab, 105 km, sectores/hitos; links Castro/Ancud/Chonchi); typo real "Queilé n"→"Queilén" (CTA kicker + 2 FAQ de queilen). Verificación 15/15 post-escritura: verbatim vs HEAD, 0 residuos v1 (`#010101`/`onmouseover`/`style=`/`faq-item`/`25D366`), wrappers ↔ previews. Sin `pnpm` (REGLA #1) — pendiente `pnpm check`/`build` + revisión visual.
- ⏳ Siguiente: `CookiePreferences` (modal público de cookies + preferencias; aún v1 liquid-glass — confirmar con usuario) → retomar `/casos` testimonios `02` → salmonicultura → Fase 6 (`ContactForm` dual Console/Guiado + resto de formularios; ojo: `FAQSection.astro` y páginas `desarrollo-web/*` siguen v1 con `faq-item`) → admin · recursos.
- Pendiente: Fase 6 (formularios) · admin · recursos.

### Decisiones abiertas
1. ~~**Manifiesto** (`DiagnosticoSection`): §13 pide fanzine; §15 prohíbe imperfección simulada → propuesta: **terminal puro** + métricas reales.~~ ✅ **Resuelta (2026-10-15)**: terminal puro implementado; métricas omitidas (sin datos verificables, §9).
2. ~~**`RecursosSection`**: conservar y reestilizar, o **plegar** (no figura en el orden canónico §14).~~ ✅ **Resuelta (2026-10-15)**: conservar y reestilizar — ventana `biblioteca --gratis` full-width (decisión usuario).

### Verificación pendiente (usuario, Windows)
`pnpm check` · `pnpm build` · `pnpm dev` — checklist en §10.

---

## 12. Plan de fases (orden de ejecución, menor → mayor riesgo)

1. **Tokens + fuentes** (`global.css`, `fonts.css`, `BaseLayout` preloads). [bloqueante: requiere JetBrains Mono]
2. **Primitivas** (`WebcoreWindow`, `TerminalWindow`, `StatusLed`, `AccessibilityModeToggle`, scanlines).
3. **Superficies** (`GlassCard`/`Card3D`/`ServiceCard`/`CinematicColumn`; `ScrollCard` eliminado).
4. **Header + Hero** (LED, CTA neón, terminal dual).
5. **Secciones home** (Manifiesto, Servicios bivalente, Metodología, Equipo, Casos, CTA, Testimonials).
6. **Formularios** (`ContactForm` dual, `CotizarModal`, `LeadMagnetForm`, `CasoForm`).
7. **Admin + páginas SEO/local/servicios/blog/recursos** (heredar tokens, limpiar efectos).

> **Estado por fase (2026-10-15)**: 1 ✅ · 2 ✅ · 3 🟡 · 4 ✅ · 5 ✅ · 6 ⏳ · 7 🟡 — detalle en §11.

Cada fase: `pnpm check` → `pnpm build` → revisión en `pnpm dev` (usuario) antes de la siguiente.
