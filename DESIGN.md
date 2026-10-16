# DESIGN.md — Sistema de Diseño Mtsprz · v2 "Technopunk Enterprise"

> **Propósito**: fuente de verdad operativa del diseño visual de `mtsprz`.
> **v2 (2026-10-14)**: reemplaza la dirección "editorial inmersivo" (v1) por
> **Technopunk / Webcore / Cybergoth** para una oferta de *soluciones
> tecnológicas por desarrolladores senior de vieja escuela*.
>
> **Jerarquía de autoridad**:
> 1. `.claude/rules/ui-design.md` — filosofía (VINCULANTE). Si hay conflicto gana ese archivo.
> 2. `DESIGN.md` (este archivo) — implementación: tokens, escala, recetas, componentes.
> 3. `src/styles/global.css` (`@theme`) y `src/styles/fonts.css` — fuente técnica de tokens y fuentes.
>
> **Alcance**: sitio público (`BaseLayout.astro`) y panel admin (`AdminLayout.astro`).
> Regla: código nuevo DEBE usar tokens, no hex hardcodeados. Excepción → comentario
> `/* design-exception: ... */` o `style="... /* design-exception */"`.

> ⚠️ **Este documento NO autoriza código.** Todo cambio de UI/UX es una implementación
> y requiere **PRD aprobado** (`AGENTS.md` REGLA #2) antes de tocar componentes.
> Ver §17 (Plan de implementación).

---

## 0. Resumen del cambio (v1 → v2) y resolución de conflictos

El spec de origen describe una estética y una arquitectura distinta a la que vive en
el repo. La tabla resuelve cada choque contra el **código real**, no contra el ideal.

| # | Spec "Technopunk Enterprise" | Realidad del repo (v1) | Resolución v2 |
|---|---|---|---|
| 0.1 | Stack "Next.js" (`next/image`) | **Astro 7** + Tailwind v4 + GSAP CDN + `sharp` | Astro: `<Picture>`/`<Image>` (sharp) para WebP/AVIF, `loading`/`decoding` manuales. Ignorar todo lo Next.js. |
| 0.2 | Headings en **monospace** (JetBrains Mono / Space Mono) | Headings **Poppins 700/800** (sans) | Migrar headings a **JetBrains Mono**. Poppins se **retira**. Requiere cargar JetBrains Mono (§3). |
| 0.3 | CTA primario **verde neón** `#00FF66` (relleno) | v1: "neón como relleno **PROHIBIDO**" | **Se revoca** ese anti-patrón. Neón permitido **como relleno de CTA con texto negro** (`#090C10` sobre `#00FF66` = ~15:1). Sigue prohibido neón como texto pequeño de cuerpo. |
| 0.4 | Ventanas retro **con borde** `#30363D` + sombra de bloque | v1: "sin bordes, sin sombras, sin contenedores" | **Se revoca**. v2 introduce `WebcoreWindow` con **borde 1px + sombra sólida offset** (estética OS retro). El "sin fronteras" pasa a ser un modo opcional (§5.4), no la norma. |
| 0.5 | Paleta negra-azulada + neón (green/purple/red) | Tokens `#141416/#4f46e5` indigo | **Remap total de tokens** (§2). Indigo/violeta de marca se retiran. |
| 0.6 | Acento por servicio (indigo, esmeralda, cian, ámbar) | Acentos por categoría + "papel y tinta" | Acentos por categoría **se conservan** (§2.5) pero re-anclados a la paleta neón. "Papel y tinta" (crema) **se retira**. |
| 0.7 | No menciona anotaciones manuscritas (Caveat) | Sistema "humanidad real" / notebook (§9 v1) | El sistema manuscrito/notebook **se retira**. La **honestidad** (§9) se conserva, re-expresada en lenguaje técnico (status real, métricas reales, cero fabricación). |
| 0.8 | "Sin fotos de stock sonrientes" | OK (compatible) | Se conserva y se refuerza (§10). |
| 0.9 | `font-display: swap`, WCAG, reduced-motion | Ya implementado en `global.css`/`fonts.css` | Se conserva y se extiende (§11). |
| 0.10 | Fotos Cybergoth + duotono/halftone | No hay fotos de equipo todavía | Se especifica el tratamiento (§10) para cuando existan; placeholder honesto mientras. |

**Lo que NO cambia** (verdad operativa que se hereda intacta): Astro/Tailwind/GSAP,
restricción `overflow-x: clip`, `liquid-glass` con `mask-composite`, patrón `is:inline`
sin `{id}`, fuentes self-hosted, reduced-motion, `BaseLayout`/`AdminLayout`, JSON-LD/SEO,
GEO, regla "el agente no ejecuta `pnpm`".

---

## 1. Dirección estética

**Technopunk Enterprise.** Fusión de tres corrientes: **Technopunk / hacktivismo**,
**Webcore / old web** (ventanas de OS, scanlines, pixel UI) y **Cybergoth / mall goth**
(neón magenta-verde, cuero oscuro, drama). Sobre una base digital moderna, segura y
orientada a conversión.

Referencias: terminales CRT, window managers de los 90 (motif/CDE), fanzine digital,
Case Study de Awwwards "dev-tool dark", portales de ciberseguridad.

### 1.1 Principios

1. **Autoridad por herencia.** La estética retro/hacker comunica dominio desde el
   ensamblador hasta la nube, no inexperiencia.
2. **Estructura de ventana.** El contenido vive en **ventanas de sistema** (title bar +
   controles), no en cards flotantes genéricas. La ventana es el contenedor canónico.
3. **Tipografía mono como textura técnica.** Titulares, métricas y UI en monospace; el
   cuerpo en sans legible. La mono es identidad, la sans es servicio.
4. **Neón contenido, fondo profundo.** Fondo `#090C10`. El neón (verde/púrpura/rojo) entra
   por CTAs, bordes activos, status LED y hovers — **nunca** como gran superficie de texto.
5. **Usabilidad bivalente.** Cada sección sirve a **ejecutivo no técnico** (claridad, ROI,
   CTA) y a **CTO/dev** (arquitectura, métricas, comandos). Ver §1.2.
6. **Honestidad dura.** Cero métricas, testimonios o fechas inventadas. El lenguaje hacker
   no se usa para exagerar: se usa para ser directo.

### 1.2 Audiencia bivalente (regla de diseño vinculante)

```
                 AUDIENCIA BIVALENTE
   NO TÉCNICO  (CEO/COO/Product)      TÉCNICO  (CTO/Arquitecto/Lead)
   Busca: solvencia, plazos, ROI      Busca: arquitectura, stack, rigor
   Necesita: botones claros,          Necesita: métricas reales,
   lenguaje de negocio, jerarquía     specs, comandos auténticos,
   limpia, CTA obvio.                 stack visible.
            \                        /
             PUNTO MEDIO: retro/cyber dentro de componentes web
             de alta legibilidad e interacción guiada.
```

Regla operativa: **toda sección de servicio/caso lleva dos capas** — capa ejecutiva
(siempre visible) + capa técnica (modal/desplegable). Ver §6.4.

---

## 2. Tokens de color

Fuente: `src/styles/global.css` → `@theme`. **Remap completo** respecto a v1.

### 2.1 Objetivo `@theme` (contrato)

```css
@theme {
  /* Superficies */
  --color-bg:            #090C10; /* Deep Terminal Black · body */
  --color-surface:       #161B22; /* Window Charcoal · cards/ventanas/modales */
  --color-surface-hover: #1C232D; /* hover de superficie (derivado) */
  --color-surface-sunken:#0D1117; /* fondo interior de ventana/terminal */

  /* Marcos y bordes */
  --color-frame:         #30363D; /* Metal Frame Gray · bordes ventanas/inputs */
  --color-frame-hover:   #444C56;

  /* Texto */
  --color-text-primary:   #F0F6FC; /* High-Contrast White */
  --color-text-secondary: #8B949E; /* Code Muted Gray */
  --color-text-tertiary:  #6E7681; /* meta, captions, disabled */

  /* Acentos */
  --color-accent:        #00FF66; /* Terminal Hack Green · CTA/status (sobre fondo oscuro o con texto negro) */
  --color-accent-hover:  #33FF85;
  --color-accent-subtle: rgba(0, 255, 102, 0.12);
  --color-brand:         #A855F7; /* Cybergoth Purple · badges/hover/marca */
  --color-brand-hover:   #C084FC;
  --color-brand-subtle:  rgba(168, 85, 247, 0.12);
  --color-danger:        #FF3366; /* Industrial Red · alertas/close/neón rojo */
  --color-danger-hover:  #FF5C82;

  /* Semánticos */
  --color-success: #00FF66;
  --color-warning: #EAB308;
  --color-error:   #FF3366;
}
```

### 2.2 Tabla de contraste estimada (verificar con herramienta)

> Valores **estimados** (fórmula WCAG 2.1). Confirmar con axe/WebAIM antes de ship.

| Primer plano | Fondo | Ratio aprox. | AA (4.5) | AAA (7) |
|---|---|---|---|---|
| `#F0F6FC` texto | `#090C10` | ~19:1 | ✅ | ✅ |
| `#8B949E` secundario | `#090C10` | ~5.9:1 | ✅ | ❌ (usar en ≥14–18px) |
| `#090C10` sobre `#00FF66` (CTA) | — | ~15:1 | ✅ | ✅ |
| `#00FF66` neón texto | `#090C10` | ~15:1 | ✅ | ✅ |
| `#A855F7` púrpura | `#090C10` | ~4.3:1 | ⚠️ solo ≥18.66px/bold | ❌ |
| `#FF3366` rojo | `#090C10` | ~4.8:1 | ✅ | ❌ |

**Reglas duras de color**:
- Púrpura `#A855F7` **nunca** en texto pequeño: solo bordes, badges, iconos, hover, titulares grandes.
- Neón verde como **relleno** siempre con texto `#090C10` (nunca blanco sobre verde).
- Prohibido fondo claro/crema como superficie de sección.
- Sombra sólida de ventana: `box-shadow: 4px 4px 0 0 var(--color-frame)` (offset duro, sin blur).
  Marca `/* design-exception */` donde se use `blur` para glow.

### 2.3 Acentos por categoría/servicio (se conserva el rol, no el hex)

Uso **puntual** (icono, línea activa, badge de categoría), nunca dominante.

| Rol | Hex |
|---|---|
| Web / default | `#00FF66` (hack green) |
| SEO / éxito | `#22E584` |
| Automatización | `#22D3EE` (cyan) |
| Datos / infra | `#A855F7` (purple) |
| Alertas / auditoría | `#FF3366` |

### 2.4 Neón / glow (uso contenido)

- Glow de acento canónico: `text-shadow: 0 0 8px rgba(0,255,102,0.45)` (títulos neón, con moderación).
- Borde activo de ventana: `1px solid var(--color-frame)` + `box-shadow: 0 0 0 1px var(--color-accent-subtle)`.
- Scanlines: overlay `repeating-linear-gradient` con opacidad **≤ 0.03** (§5.3).

---

## 3. Tipografía

Fuente: `src/styles/fonts.css` (self-hosted, `font-display: swap`, subsets
`latin` + `latin-ext` con `unicode-range`).

| Token | Familia objetivo | Rol |
|---|---|---|
| `--font-heading` | `"JetBrains Mono"` | **Titulares, números, UI técnica, labels de ventana** |
| `--font-body` | `"Inter"` | Cuerpo, párrafos, botones |
| `--font-mono` | `"JetBrains Mono"` / `"Fira Code"` | Código, terminal, datos |
| ~~`--font-alt`~~ | — | **Retirado** (Montserrat nunca se cargó — v1 §3.1) |
| ~~`--font-hand`~~ | — | **Retirado** (sistema manuscrito fuera de v2) |

### 3.1 Realidad de fuentes (VERIFICADO contra `fonts.css`)

Cargado **hoy**:
- `Inter` **400** únicamente.
- `Poppins` **700** y **800** únicamente.
- `Fira Code` **400**.
- `Caveat` 600 y 700 (se retira del sistema).

**Pendiente de cargar para v2 (implementación, ver §17)**:
- `JetBrains Mono` — pesos **400, 500, 700, 800** (subsets latin + latin-ext).
- Opcional: `Inter` **500** y **600** para labels/UI (hoy no existen).

> Hasta que JetBrains Mono esté cargada, `--font-heading` cae a `Fira Code` (400) →
> titulares sintetizados. **No shippear v2 sin cargar JetBrains Mono.**
> El `<link rel="preload">` de `BaseLayout.astro` precarga `inter-400`, `poppins-700`,
> `poppins-800`; al cambiar headings a JetBrains Mono hay que **actualizar los preload**
> (quitar poppins, agregar jetbrains 700/800) y actualizar el `@theme`.

### 3.2 Jerarquía

```
[H1] Mono 800, uppercase, tracking -0.03em   "CONSTRUIMOS ARQUITECTURA DE SOFTWARE INDESTRUCTIBLE."
[H2] Mono 700, uppercase                     "[ MÓDULO 01 ]: SOLUCIONES Y SERVICIOS"
[Body] Inter 400, leading-relaxed            "Ayudamos a empresas a escalar sus sistemas con código limpio…"
[Code] Mono 400                              "$ system.status --check --all  [200 OK]"
```

### 3.3 Reglas tipográficas

- **Base `h1–h6`** (`global.css`): `font-family: var(--font-heading)`, `font-weight: 700`,
  `line-height: 1.15`, `letter-spacing: -0.02em`. Los overrides editoriales
  (`tracking-[-2px]`, `leading-[0.9]`, `font-extrabold`) son por componente.
- **Titulares sección**: mono **700/800**, uppercase, `clamp(1.75rem, 5vw, 3.5rem)`.
- **Body**: Inter 400, `leading-relaxed`/`leading-[1.7]`, `--color-text-secondary`.
- **Mono siempre para**: código, terminal, métricas, timestamps, IDs, labels de ventana.
- **Prohibido**: serif, decorativa, y usar mono para párrafos largos (fatiga).
- Longitud de línea de cuerpo: `max-w-[65ch]` para legibilidad.

---

## 4. Espaciado, radios y layout

### 4.1 Tokens

| Token | Valor | Nota |
|---|---|---|
| `--radius-sm` | `4px` | v2 reduce radios (estética OS dura) |
| `--radius-md` | `6px` | ventanas, botones |
| `--radius-lg` | `10px` | modales |
| `--radius-xl` | `14px` | uso excepcional |
| `--spacing-section` | `5rem` | ritmo vertical |

> **Sin radios irregulares "cuaderno"** (v1 §4.4) — retirados. Los radios en v2 son
> **uniformes y pequeños** (estética de sistema operativo retro).

### 4.2 Layout

- Contenedor: `max-w-6xl mx-auto px-4 sm:px-6`.
- Grid de ventanas: `grid md:grid-cols-12`, asimétrico (p. ej. ventana dominante 7/12 +
  panel 5/12). Se mantiene la asimetría, pero **dentro de ventanas**, no como columnas
  full-bleed sin fronteras.
- **Sin `100vh` obligatorio** por sección: v2 prioriza scroll normal y escaneo rápido
  (conversión). El "viewport-dominance" (v1) queda como modo opcional (§5.4).

### 4.3 Restricción crítica de scroll (heredada, NO cambiar)

`html`/`body` usan **`overflow-x: clip`** (NO `hidden`) — preserva `position: sticky`
(Header, StickyCTA). **No cambiar a `overflow-x: hidden`.**

---

## 5. Superficies y ventanas Webcore

### 5.1 `WebcoreWindow` (contenedor canónico v2)

Reemplaza a la card genérica. Es una **ventana de sistema** con title bar.

```
┌─ ● ● ● ────────────  [ TITLE ]  ── _  □  ✕ ┐   ← title bar (#161B22)
│                                            │
│  contenido (#0D1117 o #161B22)             │   ← body
│                                            │
└────────────────────────────────────────────┘
   ↑ 1px solid #30363D  ·  box-shadow: 4px 4px 0 0 #30363D
```

- **Title bar**: `bg-[#161B22]`, `border-b 1px #30363D`, altura `36–40px`, label mono 500 uppercase.
- **Controles**: `_` minimizar (colapsa contenido), `□` maximizar (expande/abre modal),
  `✕` cerrar (color `--color-danger` en hover; "cierra" la ventana → estado minimizado flotante).
- **Sombra**: sólida offset (`4px 4px 0 0 var(--color-frame)`), sin blur.
- **Persistencia**: estado de cada ventana (min/max) en `localStorage`, restaurado en load.
- **Accesibilidad**: controles son `<button>` con `aria-label` real (no solo el glifo);
  el contenido minimizado usa `hidden` o `aria-hidden` — **nunca** `display:none` que
  rompa el foco del teclado sin restaurarlo.

### 5.2 `liquid-glass` (heredado, uso reducido)

Se conserva la utilidad (`backdrop-blur` + `mask-composite: exclude`) para el **Header sticky**
y overlays. **Nunca** combinar `liquid-glass` con transform de hover en el mismo nodo
(rompe el `mask-composite`). En v2 la superficie dominante es **opaca** (`#161B22`), no glass.

### 5.3 Scanlines y ruido (overlay global, baja intensidad)

- **Scanlines**: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px)`,
  capa `fixed inset-0 pointer-events-none z-[1] aria-hidden`. **Máximo 3% de opacidad.**
- **Grain**: se conserva la utilidad `.grain` (SVG `feTurbulence`) a `opacity-[0.02]`.
- Ambos se **desactivan** en Modo Clean (§11.2) y con `prefers-reduced-motion`.

### 5.4 Modo "sin fronteras" (opcional, no default)

El lenguaje editorial v1 (columnas full-bleed sin bordes) sobrevive como variante
**opt-in** para páginas cinematográficas (hero/portfolio), vía `data-surface="cinematic"`.
No es la norma.

---

## 6. Componentes canónicos

**Regla**: si existe un componente, usarlo. No reinventar primitivas.
Los marcados **NUEVO** no existen todavía → se crean en la fase de implementación (§17).

### 6.1 Estructura y superficies

| Componente | Rol | Nota v2 |
|---|---|---|
| **`<WebcoreWindow>`** | Ventana de sistema (title bar + controles) | **NUEVO** — reemplaza a `GlassCard`/`Card3D` como contenedor base |
| `<Header>` | Nav sticky | Conserva `liquid-glass`; agrega **status LED** + toggle Modo Cyber/Clean (§6.5) |
| `<Footer>` | Pie | CTA primario + formulario dual referenciado |
| `<GlassCard>` | Superficie glass | **Deprecado** → usar `WebcoreWindow` |
| `<Card3D>` | Perspectiva hover | Retirar de superficies glass; puede vivir dentro de `WebcoreWindow` |
| `<ScrollCard>` | Card editorial opaca | Re-estilizar a lenguaje v2 (borde + mono); sin `reveal-item` |
| `<CinematicColumn>` / `<FadingVideo>` | Columnas/video | Solo en modo `cinematic` (§5.4) |

### 6.2 Terminal / CLI (`<TerminalWindow>`) — NUEVO

Componente central del Hero. **Doble comportamiento**:

| Perfil | Comportamiento |
|---|---|
| **No técnico** | Auto-type de presentación breve + **botones rápidos** ("Ver Servicios", "Agendar Llamada") |
| **Técnico** | Input de comandos: `help`, `stack`, `services`, `contact`, `clear` → responden JSON/ASCII |

- El contenido **debe ser visible sin JS** (muestra la presentación estática + lista estática).
  JS solo agrega el auto-type y el prompt.
- Respetar `prefers-reduced-motion`: sin auto-type; aparece completo.
- El input es un `<input>` real con `<label>` accesible (no un div contenteditable mudo).
- No bloquear el scroll ni el foco; la terminal no captura Tab.

### 6.3 Badges de estado (`<StatusLed>` / `<BadgeNeon>`) — NUEVO

- LED animado (pulso lento 2s) con texto real: `● ALL SYSTEMS OPERATIONAL`.
  La animación se desactiva con reduced-motion (LED queda estático, texto visible).
- Badge mono para categorías/módulos `[ MÓDULO 01 ]` en `--color-brand`.

### 6.4 Tarjetas de servicio bivalentes (`<ServiceCard>` reescrito)

Cada servicio = una `WebcoreWindow` con **dos capas**:

1. **Capa ejecutiva (visible)**: titular de negocio + beneficio medible + CTA
   (`Solicitar Diagnóstico`). Ej.: "Modernización de Sistemas y Deuda Técnica —
   reducimos costos de infraestructura hasta 40%".
2. **Capa técnica (modal/desplegable)**: arquitectura (microservicios, REST/gRPC,
   Docker/K8s), lenguajes (Rust, Go, TypeScript, Python), cobertura de tests > 90%,
   latencia promedio.

Regla de honestidad: las métricas de la capa técnica deben ser **reales o
etiquetadas como objetivo**, nunca inventadas (§9).

### 6.5 Toggle de accesibilidad (`<AccessibilityModeToggle>`) — NUEVO

Switch **Modo Cyber ↔ Modo Clean** (§11.2). Persiste en `localStorage`, aplica
`data-mode="clean"` en `<html>`, accesible por teclado y con `aria-pressed`.

### 6.6 Formularios y conversión (heredados, + form dual)

| Componente | Rol | Endpoint / nota |
|---|---|---|
| `<ContactForm>` (dual) | Contacto con toggle Modo Guiado / Modo Console | `POST /api/leads` (source `contact`) |
| `<QuoteForm>` | Cotización | `POST /api/leads` (source `quote`); `SERVICES` + `BUDGET_RANGES` |
| `<CotizarModal>` | Modal cotizar | re-estilizar como `WebcoreWindow` |
| `<LeadMagnetForm>` | Captura email | `POST /api/lead-magnet` |
| `casos/CasoForm` | Cupo fundador | `POST /api/leads` (`oferta_fundador`) |
| `<StickyCTA>` / `<WhatsAppButton>` | CTAs persistentes | No solapar en móvil |

**Formulario dual** (§8 del spec): un toggle `(o) Modo Estándar · ( ) Modo Console`.
- **Modo Estándar** (default): campos clásicos (Nombre, Empresa, Mensaje, Email, Tipo, Presupuesto).
- **Modo Console**: textarea mono donde el usuario pega un payload JSON; se valida en
  cliente y se envía igual al mismo endpoint (no es un canal nuevo).
- **La accesibilidad manda**: el modo Console es **opcional**; el estándar siempre disponible.

### 6.7 Tipografía animada (heredada)

| Componente | Rol | Hooks |
|---|---|---|
| `<StaggerText>` | Título char-by-char | `document.currentScript.previousElementSibling` |
| `<BlurText>` | Título word blur-in | `data-id` + id random |

### 6.8 Navegación, SEO y contenido (heredados, re-estilizados)

`<Breadcrumbs>`, `<FAQSection>` / `<FaqPreview>`, `<CiudadesRelacionadas>`,
`<LocalidadDatos>`, `<CookieBanner>` / `<CookiePreferences>`, `<BlogSearch>`,
`<Testimonials>`, `casos/*`. Se conservan; solo cambian tokens y estilo de superficie.

---

## 7. Copy, CTAs y GEO

### 7.1 CTAs

1. **CTA primario** → **verde neón** `bg-[#00FF66] text-[#090C10]`, mono, uppercase,
   `rounded-[6px]`, sin glow excesivo. Es el mayor contraste del sitio.
   Ej.: `[ AGENDAR REUNIÓN ]`, `[ INICIAR PROYECTO ]`.
2. **CTA secundario** → **borde metálico mono**: `border 1px #30363D`,
   `text-[#F0F6FC]`, fondo transparente, hover → `border --color-accent` + glow sutil.
   Ej.: `[ VER CASOS DE ÉXITO ]`.
3. **CTA terciario/editorial** → sólido `#1A1A1A` (permitido para bloques internos),
   texto blanco.

Labels: uppercase, cortos, verbo primero — "AGENDAR", "CONTACTAR", "EXPLORAR",
"VER MÁS", "SOLICITAR DIAGNÓSTICO". Nunca decorativos.

Cursor: **default del sistema** siempre. Cursor `crosshair`/pixel **solo** en zonas
interactivas explícitas (terminal, demo). Nunca global (usabilidad).

### 7.2 Copy bivalente

- **Capa negocio**: beneficio medible, sin jerga. Español de Chile, directo.
- **Capa técnica**: specs, comandos, stack. Puede usar terminología precisa.
- **Voz**: "sin humo publicitario". Prohibido: "desbloquear", "potenciar",
  "viaje", superlativos vacíos.

### 7.3 Respuesta rápida GEO (heredada)

Cada FAQ expone **respuesta directa y citable** en texto plano (nunca solo dentro de
`<details>`). Bloque "Respuesta rápida:" + `src/data/faq-precios.ts`. Precios ancla
vivos en `src/data/pricing.json` (no duplicar a mano).

---

## 8. Motion

### 8.1 Arquitectura de 3 capas (heredada)

| Capa | Tecnología | Cuándo |
|---|---|---|
| **CSS** | `reveal-group`/`reveal-item`, `stagger-char`, `blur-word` + IntersectionObserver | Revelados estándar |
| **GSAP** | CDN 3.13.0 por hook `data-gsap-*` | Secciones complejas |
| **rAF** | manual | `FadingVideo` crossfade |

### 8.2 Efectos v2 (nuevos)

- **Glitch**: solo en transiciones **hover de botones secundarios y títulos**.
  Duración **< 150ms**. Nunca en loop, nunca sobre texto de cuerpo. Desactivado en
  Modo Clean y `prefers-reduced-motion`.
- **Scanlines**: estáticas (no animadas) por default; el jitter animado es opcional y
  se desactiva con reduced-motion (§5.3).
- **LED status**: pulso 2s; estático con reduced-motion.
- **Auto-type terminal**: ~35–55ms/char, cancelable; off con reduced-motion.

### 8.3 Reglas de motion (heredadas)

- Duraciones: 150–300ms micro; reveals ~0.35–0.5s; entradas ease-out, salidas ease-in.
- **Respetar `prefers-reduced-motion`**: `global.css` ya desactiva transforms/backdrop con
  `!important`; verificar que reveals quedan **visibles** sin motion.
- **`is:inline` scripts** NO pueden usar `{id}` de Astro → `document.currentScript.previousElementSibling`
  o `data-id` + `getElementById`.
- **No animar** `liquid-glass` en el mismo nodo que un transform de hover.
- GSAP: `gsap.matchMedia()` para `lg` y reduced-motion; `ScrollTrigger.refresh()` en `load`.

---

## 9. Honestidad (v2) — sin fabricar humanidad ni métricas

El valor de v1 (§9 "humanidad real") **se conserva como principio**, pero se re-expresa
en lenguaje técnico, **sin** el sistema manuscrito/notebook:

1. **Status real**: el LED `ALL SYSTEMS OPERATIONAL` debe reflejar un chequeo real
   (health endpoint o dato estático honesto); no un adorno que miente.
2. **Métricas reales o etiquetadas**: `99.99% uptime`, `0 brechas`, `>90% coverage` solo
   si son verificables; si no, usar "objetivo" / "medido en X" / placeholder honesto.
3. **Temporal realness**: fecha viva server-side (`index.astro` → `hoy`/`anio`). No fechas fijas inventadas.
4. **Casos internos etiquetados**: `casos.ts` marca "Caso interno"; testimonios `null` se
   muestran como "butaca reservada / REC", nunca inventados.
5. **Perfil autor centralizado** (`src/data/author.ts`) para E-E-A-T.

**Límite ético (se mantiene)**: no degradar output de IA para aparentar torpeza humana.
El glitch/imperfección es **estético y honesto** (efecto declarado), no un truco para
simular autoría humana. Ver skill `humanwashing-design`.

---

## 10. Imágenes y fotografía de equipo

- **Prohibido**: stock sonriente frente a laptops genéricos.
- **Retratos de equipo (Cybergoth profesional)**: fondo oscuro, vestimenta negra/táctica,
  iluminación dramática con acento neón (magenta `#A855F7` o verde `#00FF66`).
- **Tratamiento**: duotono suave en hover + trama halftone/dither **controlada**, sin
  distorsionar rostros. Duotono vía CSS `filter`/`mix-blend-mode` o imagen pre-procesada.
- **Formato**: WebP/AVIF (Astro `<Picture>` + `sharp` ya disponible en devDeps),
  `loading="lazy"` salvo hero, `width`/`height` declarados (evita CLS).
- `alt` descriptivo siempre. Decoración con `aria-hidden`.
- Mientras no existan fotos reales: **placeholder honesto**, no una foto stock.

---

## 11. Accesibilidad y performance

### 11.1 WCAG 2.1 AA (AAA en texto principal)

- Cuerpo ≥ 7:1 en fondos oscuros (`#F0F6FC` sobre `#090C10` ✅).
- Neón como **borde/indicador/relleno con texto negro**; nunca texto neón pequeño.
- **Foco visible**: `:focus-visible { outline: 2px solid #00FF66; outline-offset: 2px }`;
  `a`/`button` → `2px solid #fff`. Nunca eliminar outline sin reemplazo.
- `::selection` con acento. `aria-hidden` en decoración (scanlines, glows, ruido).
- `aria-live`/`role="status"` en feedback de formularios (`cf-status`, `lm-status`).
- `main id="main-content"` + `.skip-to-content` con foco visible.
- Controles de ventana con `aria-label` textual (no solo el glifo `✕`).

### 11.2 Toggle "Modo Cyber ↔ Modo Clean" (nuevo, obligatorio)

`<html data-mode="clean">` desactiva:
- Scanlines y ruido.
- Glitch y glow neón intenso.
- Fondo a plano `#0D1117` (contraste plano).
- Auto-type y animaciones decorativas.

Default: **Modo Cyber**. La preferencia persiste en `localStorage` y respeta
`prefers-reduced-motion` como hint inicial. Es requisito de la spec y de a11y.

### 11.3 Performance

- Fuentes: WOFF2 subsets, `font-display: swap`, preload de los pesos críticos
  (actualizar preload al migrar a JetBrains Mono — §3.1).
- Animaciones GPU: `transform`/`opacity`; evitar reflow/repaint.
- Imágenes next-gen con Astro `<Picture>`; hero prioritizado (`fetchpriority="high"`).
- Barra de progreso de lectura `#reading-progress` (heredada, z-60, `will-change: width`).

---

## 12. Dos superficies

| Superficie | Layout | Fondo | Notas |
|---|---|---|---|
| **Público** | `BaseLayout.astro` | `#090C10` | `lang="es-CL"`, SEO/JSON-LD, estética Technopunk completa + toggle Cyber/Clean |
| **Admin** | `AdminLayout.astro` | `.dark` | `lang="es"`, `noindex nofollow`, denso, **sin** scanlines/glitch/terminal; mono solo en datos |

Ambos usan `<html class="dark">` + `global.css` + `fonts.css`. El admin hereda tokens,
no efectos decorativos.

---

## 13. Estructura de la Landing Page (sección por sección)

```
[1. NAVBAR]        Status LED + Logo mono neón | Menú claro | CTA [ AGENDAR REUNIÓN ]
[2. HERO]          H1 mono | Terminal dual | CTA neón + CTA borde metálico
[3. MANIFIESTO]    Fanzine/Zine core + métricas reales (tarjetas retro)
[4. SERVICIOS]     Grid de WebcoreWindow con capas bivalentes
[5. METODOLOGÍA]   Pipeline Audit → Architecture → Build → Deploy → Scale
[6. EQUIPO]        Tarjetas senior devs (perfil de sistema / acceso)
[7. CASOS]         Consola de logs filtrable con métricas reales
[8. FOOTER/CTA]    Formulario dual (Guiado vs Console)
```

**Mapa a componentes existentes** (para la implementación):

| Sección | Componente actual | Acción v2 |
|---|---|---|
| 1 Navbar | `Header.astro` | + status LED, + toggle Cyber/Clean, CTA neón |
| 2 Hero | `home/HeroSection.astro` | + `<TerminalWindow>`, H1 mono, CTAs nuevos |
| 3 Manifiesto | `home/DiagnosticoSection.astro` | Re-estilar a fanzine + métricas reales |
| 4 Servicios | `home/ServicesSection.astro` + `ServiceCard.astro` | `WebcoreWindow` + capa técnica (modal) |
| 5 Metodología | *(nuevo)* | `<MethodologyPipeline>` |
| 6 Equipo | `home/NosotrosSection.astro` | Tarjetas de sistema (equipo real o placeholder) |
| 7 Casos | `casos/*`, `home/PortfolioSection.astro` | Consola de logs con filtros |
| 8 Footer/CTA | `home/CtaSection.astro` + `Footer.astro` + `ContactForm.astro` | Form dual |

---

## 14. Plantillas de página (orden canónico)

- **Home**: Hero → Manifiesto → Servicios → Metodología → Equipo → Casos → CTA → Testimonials.
- **Región** (`regiones/*`): Header → Breadcrumbs → contenido local → `LocalidadDatos` →
  `FaqPreview` → `CiudadesRelacionadas` → Footer.
- **SEO local** (`seo-local/*`): estructura de región + `CiudadesRelacionadas`.
- **Servicio** (`servicios/*`): incluye `StickyCTA`.
- **Casos** (`casos/*`): CasoCard / `OfertaFundador` + `CasoForm` + `CasoNav` +
  `TestimoniosReservados`; `TestimonioCaso` en `/casos/[slug]`.
- **Blog / Recursos** (`recursos/*`): `Breadcrumbs` + `LeadMagnetForm` + Footer.

Un `<h1>` por página. `<FaqPreview>`/`FAQSection` único por página (evita duplicar schema).

---

## 15. Anti-patrones (PROHIBIDOS)

Heredados de v1 que **siguen vigentes**:
- ❌ Fondo blanco/beige o secciones claras.
- ❌ Serif/decorativa en UI.
- ❌ `overflow-x: hidden` (usar `clip`).
- ❌ `liquid-glass` + transform hover en el mismo nodo.
- ❌ Hex hardcodeado donde existe token.
- ❌ Imperfección simulada por IA para aparentar humanidad.
- ❌ Inventar testimonios, métricas o fechas.
- ❌ Usar un peso de fuente no cargado sin agregar su `@font-face` + preload.

**Revocados por v2** (ya no aplican):
- ~~CTA neón prohibido como relleno~~ → permitido (verde con texto negro).
- ~~Sin bordes/sombras/contenedores~~ → `WebcoreWindow` usa borde + sombra sólida.

**Nuevos anti-patrones v2**:
- ❌ Neón púrpura `#A855F7` como texto pequeño (<18.66px) — falla AA.
- ❌ Glitch > 150ms, en loop, o sobre texto de cuerpo.
- ❌ Scanlines > 3% de opacidad.
- ❌ Cursor crosshair global (solo zonas interactivas).
- ❌ Terminal que oculta su contenido sin JS (debe verse estática).
- ❌ Controles de ventana sin `aria-label` textual.
- ❌ Mono en párrafos largos (fatiga de lectura).
- ❌ Ignorar el toggle Cyber/Clean.

---

## 16. Checklist pre-ship

- [ ] Solo tokens de `@theme` (o excepción comentada).
- [ ] Fondo `#090C10`; ventanas `#161B22`; bordes `#30363D`; sin superficies claras.
- [ ] JetBrains Mono cargada (400/500/700/800) + preload actualizado (§3.1).
- [ ] Headings mono; body Inter; mono no usada en párrafos largos.
- [ ] CTA primario neón con texto `#090C10`; secundario borde metálico.
- [ ] `WebcoreWindow` con controles `aria-label` y estado min/max persistido.
- [ ] Terminal dual: contenido visible sin JS; botones para no técnicos; comandos para técnicos.
- [ ] Toggle Cyber/Clean funcional, persistido, accesible por teclado.
- [ ] Glitch < 150ms; scanlines ≤ 3%; LED estático con reduced-motion.
- [ ] Form dual: modo estándar siempre disponible; console valida JSON.
- [ ] reduced-motion respetado (contenido visible sin motion).
- [ ] Foco visible, `alt` correctos, decoración `aria-hidden`, `aria-live` en forms.
- [ ] Contraste verificado con herramienta (no solo estimado).
- [ ] `BaseLayout` (público) o `AdminLayout` (admin) correcto.
- [ ] `pnpm build` pasa (el usuario lo ejecuta).

---

## 17. Plan de implementación (requiere PRD aprobado)

> `AGENTS.md` REGLA #2: nada de esto se toca sin **PRD aprobado**. Este DESIGN.md es la
> especificación; el PRD es la autorización y el plan de ejecución.

**PRD sugerido**: `docs/prd/PRD-technopunk-redesign-<fecha>.md`.

Orden incremental propuesto (menor → mayor riesgo):

1. **Tokens + fuentes** — reescribir `@theme` en `global.css`; cargar JetBrains Mono;
   actualizar preloads en `BaseLayout`. *(No rompe estructura.)*
2. **Primitivas nuevas** — `WebcoreWindow`, `StatusLed`, `AccessibilityModeToggle`,
   `TerminalWindow`, scanlines overlay.
3. **Superficies** — migrar `GlassCard`/`Card3D`/`ScrollCard`/`ServiceCard` a v2.
4. **Header + Hero** — status LED, CTA neón, terminal dual.
5. **Secciones home** — Manifiesto, Servicios (bivalente + modal), Metodología, Equipo.
6. **Formularios** — `ContactForm` dual (Guiado/Console) + modal re-estilizado.
7. **Admin** — heredar tokens, sin efectos decorativos.

Cada paso: `pnpm check` → `pnpm build` → `pnpm dev` (los ejecuta el usuario).

---

## 18. Referencias

- `.claude/rules/ui-design.md` — filosofía VINCULANTE (a actualizar en la fase de implementación).
- `src/styles/global.css` — tokens `@theme`, utilidades, focus/selection, reduced-motion.
- `src/styles/fonts.css` — fuentes self-hosted y pesos reales.
- `src/layouts/BaseLayout.astro` / `AdminLayout.astro` — superficies.
- `src/components/` — inventario canónico (§6).
- `.codebase-memory/ADR.md` — decisiones de arquitectura.
- `src/data/` — `author.ts`, `regiones.ts`, `casos.ts`, `testimonials.json`, `pricing.json`, `faq-precios.ts`.
- Skills: `frontend-maestro`, `humanwashing-design`, `tailwind`, `astro`.
- `AGENTS.md` — convenciones del proyecto (REGLA #1 sin pnpm, REGLA #2 PRD, REGLA #3 git).
