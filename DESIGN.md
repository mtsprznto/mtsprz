# DESIGN.md — Sistema de Diseño Mtsprz

> **Propósito**: fuente de verdad operativa del diseño visual de `mtsprz`. Lo que
> `.claude/rules/ui-design.md` declara como **filosofía VINCULANTE**, este documento
> lo aterriza en **tokens, recetas y patrones de componente verificados contra el
> código real**.
>
> **Jerarquía de autoridad**:
> 1. `.claude/rules/ui-design.md` — filosofía y anti-patrones (VINCULANTE). Si hay
>    conflicto, gana ese archivo.
> 2. `DESIGN.md` (este archivo) — implementación: tokens, escala, recetas.
> 3. `src/styles/global.css` (`@theme`) y `src/styles/fonts.css` — fuente de verdad
>    técnica de los tokens y las fuentes.
>
> **Alcance**: sitio público (`BaseLayout.astro`) y panel admin (`AdminLayout.astro`).
> Regla: código nuevo DEBE usar tokens, no hex hardcodeados. Toda excepción se
> documenta con un comentario `/* design-exception: ... */` o, en atributos inline,
> `style="... /* design-exception */"`.

---

## 1. Dirección estética

**Editorial inmersivo dark mode.** Referencias: Zara editorial dark, Awwwards SOTD
cinematic, revista de lujo full-bleed.

Principios:

1. **Sin fronteras.** No hay tarjetas flotando sobre un lienzo; hay columnas
   cinematográficas que dominan el viewport. El contenido respira dentro del vacío.
2. **Asimetría como norma.** Ritmo de columnas anchas + estrechas (60/40, 70/30,
   full-width). Nunca grids uniformes de igual ancho.
3. **Tipografía como textura.** El titular grande, comprimido y en tracking negativo
   es un elemento gráfico, no solo texto.
4. **Negro profundo, luz contenida.** Fondo `#010101`. La luz entra por glows radiales,
   hairlines de gradiente y `liquid-glass`, nunca por superficies claras. Las secciones
   alternas suben a `#0A0A0A`, no a un gris claro.
5. **Humanidad real, no fabricada.** El diseño demuestra trabajo humano honesto
   (ver §9): anotaciones manuscritas reales, subrayados dibujados a mano, ligera
   rotación, papel y cinta, temporalidad real (fecha viva), prueba de lugar (datos
   locales verificables). **Prohibido** simular imperfección con IA para parecer humano
   (humanwashing del diseño).

---

## 2. Tokens de color

Fuente: `src/styles/global.css` → `@theme`.

### 2.1 Superficies y texto

| Token | Valor | Uso |
|---|---|---|
| `--color-surface` | `#141416` | Superficie elevada dentro de un panel |
| `--color-surface-hover` | `#1c1c20` | Estado hover de superficie |
| `--color-border` | `#1f1f23` | Borde hairline estándar |
| `--color-border-hover` | `#2a2a30` | Borde en hover |
| `--color-text-primary` | `#fafafa` | Texto principal |
| `--color-text-secondary` | `#a1a1aa` | Texto secundario / párrafos |
| `--color-text-tertiary` | `#6b6b78` | Meta, captions, deshabilitado |

### 2.2 Acentos

| Token | Valor | Uso |
|---|---|---|
| `--color-accent` | `#4f46e5` | Acento primario (indigo) |
| `--color-accent-hover` | `#6366f1` | Acento hover / brillo |
| `--color-accent-subtle` | `rgba(79,70,229,0.12)` | Relleno de acento translúcido |
| `--color-success` | `#22c55e` | Éxito |
| `--color-warning` | `#eab308` | Advertencia |
| `--color-error` | `#ef4444` | Error |

### 2.3 Fondos editoriales por sección (de `.claude/rules/ui-design.md`)

| Token conceptual | Valor | Uso |
|---|---|---|
| `bg-deep` | `#010101` | Fondo base del sitio (`body`) y superficies inmersivas |
| `bg-card` / `bg-section-alt` | `#0A0A0A` | Secciones secundarias alternadas |
| `cta-bg` | `#1A1A1A` | Botón sólido editorial / superficie de card opaca (p. ej. "Ver todos" en Services, tabla fundador) |

### 2.4 Acentos de datos (por servicio / categoría)

Paleta extendida usada en `home/*`, `ServiceCard`, casos y datos. **Uso como acento
puntual, nunca dominante.**

| Rol | Hex |
|---|---|
| Indigo (default, web) | `#6366f1` |
| Indigo claro | `#a5b4fc` |
| Violeta | `#8b5cf6` / `#a78bfa` |
| Esmeralda (SEO/éxito) | `#10b981` |
| Esmeralda claro (subrayado) | `#6ee7b7` |
| Ámbar claro (manuscrito) | `#fde68a` |
| Ámbar (trust) | `#f59e0b` |
| Cian (automatización) | `#06b6d4` |

### 2.5 Acentos de "papel y tinta" (sistema cuaderno / humanidad)

Usados en el lenguaje manuscrito (§9). No son tokens CSS; son constantes de diseño.

| Rol | Valor | Uso |
|---|---|---|
| Papel crema | `#f5efe0` | Sticky note, ficha hero |
| Cinta adhesiva | `rgba(253,230,138,0.75)` | "Tape" sobre notas/recortes |
| Tinta marrón | `#4a3f33` / `#2f2a22` | Texto sobre papel crema |
| Tinta sobre link manuscrito | `#4338ca` | Links `font-hand` en respuesta GEO |

### 2.6 Reglas de color

- **Prohibido** fondo blanco, beige o cualquier sección clara (el crema `#f5efe0` solo
  como papel/nota pequeña, nunca como fondo de sección).
- Acento **nunca dominante**: se usa en iconos, subrayados, glows y estados, no en
  grandes superficies rellenas (excepto el gradiente de marca del §7.2).
- Glow radial canónico de sección:
  `radial-gradient(ellipse at 50% 0%, #6366f128 0%, transparent 50%)`.
  Variantes cercanas: `#6366f122` / `#8b5cf615` (Nosotros), `#6366f11f` + `#8b5cf612`
  (OfertaFundador).
- Separador hairline: `linear-gradient(90deg, transparent, #6366f144, transparent)`.

---

## 3. Tipografía

Fuente: `src/styles/fonts.css` (self-hosted, `font-display: swap`, subsets
`latin` + `latin-ext` con `unicode-range`).

| Token | Familia | Rol |
|---|---|---|
| `--font-heading` | `"Poppins"` | Títulos y números grandes |
| `--font-body` | `"Inter"` | Cuerpo de texto, labels, botones |
| `--font-mono` | `"Fira Code"` / `"JetBrains Mono"` | Código y datos |
| `--font-alt` | `"Montserrat"` | Alternativa puntual |
| `--font-hand` | `"Caveat"` | Anotaciones manuscritas (humanidad) |

### 3.1 Realidad de fuentes (verificado)

- **Pesos self-hosted incompletos** — NO asumir otros:
  - `Inter`: **400** únicamente.
  - `Poppins`: **700** y **800** únicamente.
  - `Fira Code`: 400.
  - `Caveat`: 600 y 700.
- Si un componente pide un peso no cargado (p. ej. Inter 500/600, Poppins 600), el
  navegador lo sintetiza o usa el más cercano. **Preferir weights cargados.**
- `--font-alt` (**Montserrat**) **NO tiene `@font-face`** → cae a `system-ui`. No
  usarla para nada crítico hasta cargarla.
- El `<link rel="preload">` de `BaseLayout` precarga `inter-400-latin`,
  `poppins-700-latin` y `poppins-800-latin`. Cargar un peso nuevo ⇒ agregar preload.

### 3.2 Reglas tipográficas

- **Base `h1–h6`** (`global.css`): `font-weight: 600`, `line-height: 1.2`,
  `letter-spacing: -0.02em`. Los valores editoriales (`leading-[0.9/0.92]`,
  `tracking-[-2px/-3px/-4px]`, `font-extrabold`) son **overrides por componente**,
  no la base.
- **Headings editoriales**: Poppins **700/800** (`font-bold`/`font-extrabold`),
  uppercase, tracking negativo (`-0.02em` a `-0.04em`), `leading` comprimido
  (`0.9`–`1.05`). Titulares hero/CTA usan `clamp()`.
- **Escala editorial** (`CtaSection`): `text-3xl → sm:text-4xl → md:text-6xl →
  lg:text-7xl → xl:text-8xl`. Titulares de sección: `clamp(2rem, 5vw, 3.75rem)`.
- **Body**: Inter 400 `font-light`, `leading-relaxed`/`leading-[1.8/1.9]`, color
  `--color-text-secondary` o `white/50`–`white/60` sobre sección oscura.
- **Mono**: solo código/datos, nunca párrafos.
- **`font-hand` (Caveat 600/700)**: solo anotaciones manuscritas sueltas (etiquetas
  emocionales, trust signals, "respuesta rápida"). Siempre con ligera rotación (§8).
- **Prohibido**: serif o tipografía decorativa en UI.

---

## 4. Espaciado, radios y layout

### 4.1 Tokens

| Token | Valor |
|---|---|
| `--radius-sm` | `6px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `24px` |
| `--spacing-section` | `5rem` |

Ritmo vertical generoso en secciones editoriales: `py-28 md:py-36 lg:py-44`.

### 4.2 Columnas viewport-dominance

- Columnas cinematográficas full-screen: `100vw × 100vh` cuando el contenido es
  inmersivo (hero, portfolio, storytelling).
- **Sin bordes, sin sombras, sin contenedores visibles** entre columnas.
- Ritmo asimétrico: alternar ancha + estrecha. Sin márgenes entre columnas.
- Grid utilitario permitido para bloques densos (servicios, blog): contenedor
  `max-w-6xl`/`max-w-7xl mx-auto px-6`. Full-bleed en portfolio:
  `px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24`.
- Grid editorial denso: `grid md:grid-cols-12` repartiendo media 5/12 + contenido 7/12.

### 4.3 Restricción crítica de scroll

`html`/`body` usan **`overflow-x: clip`** (NO `hidden`) — es deliberado: preserva
`position: sticky` (Header, StickyCTA). **No cambiar a `overflow-x: hidden`.**

### 4.4 Radios irregulares — "sistema cuaderno"

Firma visual del sistema: además de los radios token, los bloques editoriales usan
radios **asimétricos** (familia "cuaderno"/recorte). Catálogo verificado:

| Forma | Valor | Dónde |
|---|---|---|
| Ficha grande | `3px 22px 3px 24px / 24px 3px 22px 3px` | Hero ficha, "Ver todos" (Services), sticky note Diagnóstico |
| Recorte medio | `6px 14px 6px 12px / 12px 6px 14px 6px` | Portfolio media, Recursos icon box, CasoCard |
| Recorte medio | `8px 18px 8px 16px / 16px 8px 18px 8px` | CasoCard frame |
| Chip nota | `4px 12px 4px 14px / 14px 4px 12px 4px` | Chips Hero (trust) |
| Sello | `255px 15px 225px 15px / 15px 225px 15px 255px` | Sticker Diagnóstico |
| Caja grande | `12px 250px 14px 240px / 240px 14px 250px 12px` | CTA box Diagnóstico |

Complementos: `border: 1px/2px dashed rgba(255,255,255,0.25)` y `box-shadow`
profunda (`0 14px 34px rgba(0,0,0,0.45)`, `0 20px 60px rgba(0,0,0,0.5)`). **Estos sí usan
sombra** porque son papel/recorte físico, no cards de UI.

### 4.5 Filas editoriales con separador dashed

Patrón de listado full-width (Portfolio, Recursos, CasoCard):

```
border-t-2 border-dashed divide-y-2 divide-dashed  /* rgba(255,255,255,0.12) */
```

Cada fila = una entrada del catálogo, sin cajas. La fila entera puede ser un `<a>`
"stretched link" (`absolute inset-0 z-30`) con el contenido en `relative z-10`.

---

## 5. Superficies y elevación

### 5.1 `liquid-glass`

Superficie canónica: `backdrop-blur` + **`mask-composite: exclude`**
(+ `-webkit-mask-composite: xor`). Verificado en `global.css`:

- `liquid-glass`: `backdrop-blur: 8px`, bg `rgba(10,10,11,0.6)`, borde `rgba(255,255,255,0.06)`.
- `liquid-glass-strong`: `backdrop-blur ~50px`, bg ~`0.7`.

```astro
<!-- src/components/GlassCard.astro · patrón canónico -->
<div class="liquid-glass rounded-[1.25rem] p-6">
  <slot />
</div>
```

- **Nunca** combinar `liquid-glass` con `Card3D` en el **mismo div** (el transform de
  hover rompe el `mask-composite`). Usar wrapper separado.
- En CSS scoped de componentes (cookies/admin) el patrón se **replica** con
  `mask-composite: exclude; -webkit-mask-composite: xor;` — mantener equivalencia.

### 5.2 ScrollCard (card editorial opaca)

Card de secciones editoriales: gradiente opaco `linear-gradient(160deg,#1A1A1A,#121212,#0C0C0C)`
+ radial de acento alternado por lado, **clase `svc-card`**, número manuscrito, h3
uppercase `tracking-[-2px]`. **Excluye `reveal-item`** a propósito (la animación
compite con el pin de scroll). Ver `ScrollCard.astro`.

### 5.3 Texturas decorativas (permitidas, baja intensidad)

- **Noise overlay**: SVG `feTurbulence`, `opacity-[0.012]` (0.015 en columnas),
  `mix-blend-overlay`.
- **Glows radiales**: 2 elipses opuestas para dar profundidad.
- **Hairlines**: líneas de `1px` con gradiente de acento.

Todo decorativo va con `pointer-events-none` y `aria-hidden`.

---

## 6. Componentes canónicos (usar SIEMPRE)

**Regla**: si existe un componente, usarlo. No reinventar primitivas.

### 6.1 Estructura y superficies

| Componente | Rol | Regla |
|---|---|---|
| `<Header>` | Nav sticky | CTA "Cotizar" = píldora blanca (§7.1). No duplicar padding |
| `<Footer>` | Pie | Cierra toda página pública; CTA píldora blanca |
| `<GlassCard>` | Surface glass | Base de cards |
| `<Card3D>` | Perspectiva en hover (rotate÷20) | NO con `liquid-glass` en mismo div |
| `<ScrollCard>` | Card editorial | Gradiente opaco + lado alternado; sin `reveal-item` |
| `<ServiceCard>` | Servicio | Acento por categoría; hover conic-gradient + `--angle`; `min-h-[310px]` |
| `<CinematicColumn>` | Columna full-bleed | `min-h-[55vh]` compact / `min-h-screen` full; grain 0.015 |
| `<FadingVideo>` | Video con crossfade | Patrón rAF (§8.4) |

### 6.2 Tipografía animada

| Componente | Rol | Hooks |
|---|---|---|
| `<StaggerText>` | Título char-by-char | `document.currentScript.previousElementSibling` |
| `<BlurText>` | Título word blur-in | `data-id` + id random `bt-xxxxxx` |

### 6.3 Formularios y conversión

| Componente | Rol | Endpoint / nota |
|---|---|---|
| `<ContactForm>` | Contacto | `POST /api/leads` (source `contact`) |
| `<QuoteForm>` | Cotización | `POST /api/leads` (source `quote`); `SERVICES` + `BUDGET_RANGES` |
| `<CotizarModal>` | Modal cotizar | Panel `#0A0A0A` sin radio, noise 0.02 |
| `<LeadMagnetForm>` | Captura email | `POST /api/lead-magnet`; dispara secuencia |
| `casos/CasoForm` | Cupo fundador | `POST /api/leads` (`oferta_fundador`); campos underline |
| `<StickyCTA>` | CTA persistente | Aparece scrollY>400; WhatsApp o `/cotizar` |
| `<WhatsAppButton>` | CTA flotante | **No solapar StickyCTA en móvil** |

### 6.4 Navegación, SEO y contenido

| Componente | Rol |
|---|---|
| `<Breadcrumbs>` | Navegación (auto-prepende "Inicio") |
| `<FAQSection>` / `<FaqPreview>` | FAQ + JSON-LD / respuesta GEO visible |
| `<CiudadesRelacionadas>` | Interlinking local |
| `<LocalidadDatos>` | Datos locales verificables (INE Censo 2024) |
| `<CookieBanner>` / `<CookiePreferences>` | Consentimiento (no bloquear contenido) |
| `<BlogSearch>` | Búsqueda blog → `/buscar` |
| `<Testimonials>` | Prueba social + Review schema |
| `casos/CasoCard` | Fila del archivo de casos (GSAP reveal) |
| `casos/*` (Nav, OfertaFundador, TestimonioCaso, TestimoniosReservados) | Casos |

---

## 7. Copy, CTAs y GEO

### 7.1 CTAs — realidad de implementación

Hay **dos familias** de CTA. Usarlas según contexto:

1. **CTA primario de navegación (Header/Footer)** → **píldora blanca**:
   `rounded-full bg-white px-4 py-2 text-sm font-medium text-black`, label "Cotizar".
   Es el botón de mayor contraste del sitio.
2. **CTA inline en bloques editoriales** → píldora/gradiente de marca (§7.2) o sólido
   `#1A1A1A` (§2.3). Ej.: `CasoForm` usa `bg-gradient-to-r from-indigo-500 to-violet-500`.

Labels: uppercase, cortos, directos — "COTIZAR", "CONTÁCTANOS", "EXPLORAR",
"VER MÁS". Nunca decorativos. Ligera rotación `-rotate-1` → `hover:rotate-0` en CTAs
manuscritos (`font-hand`).

### 7.2 Gradiente de marca (excepción a "acento no dominante")

`linear-gradient(135deg, #6366f1, #8b5cf6)` — con `from-indigo-500 to-violet-500` en
Tailwind para `CasoForm`, y `linear-gradient(135deg,#6366f1,#a5b4fc 55%,#8b5cf6)` en
el span del Hero. Sombra de refuerzo: `0 8px 30px rgba(99,102,241,0.25)`.

### 7.3 Respuesta rápida GEO

Cada pregunta frecuente expone una **respuesta directa y citable** en texto plano
(nunca oculta dentro de `<details>`), sinónimo de lo que ChatGPT/Perplexity citan:

- `<FaqPreview city="…">` en páginas de región.
- Bloque "Respuesta rápida:" en `DiagnosticoSection` (con link `font-hand` `#4338ca`).
- `src/data/faq-precios.ts` (`FAQ_PRECIOS`): respuestas con precio concreto.
- Precios ancla vivos: landing `$290K` (promo) / `$350K`, sitio `$690K` / `$800K`,
  ecommerce `$1.5M` / `$1.8M`, bot WhatsApp `$590K` (`src/data/pricing.json`).

**Voz**: español de Chile, directa, sin promesas vacías. Evitar superlativos genéricos
("desbloquear", "potenciar", "viaje").

---

## 8. Motion

### 8.1 Arquitectura de 3 capas

El motion se implementa en tres niveles; elegir el más liviano que cumpla:

| Capa | Tecnología | Cuándo |
|---|---|---|
| **CSS** | `reveal-group`/`reveal-item`, `stagger-char`, `blur-word` + IntersectionObserver | Revelados estándar, listas, títulos. Sin JS de estado |
| **GSAP** | CDN 3.13.0 por hook `data-gsap-*` | Secciones complejas (hero, servicios pinned, portfolio, casos, nosotros) |
| **rAF** | Request animation frame manual | Solo `FadingVideo` (crossfade de video) |

### 8.2 Primitivas

| Mecanismo | Uso |
|---|---|
| `reveal-group` + `reveal-item` | Reveal escalonado en scroll (IntersectionObserver) |
| `stagger-char` / `<StaggerText>` | Título char-by-char (`staggerMs` default 0.06) |
| `blur-word` / `<BlurText>` | Título word blur-in |
| `<Card3D>` | Perspectiva 3D en hover (rotate÷20) |
| hooks `data-gsap-*` | Animaciones GSAP declarativas |
| `svc-track` + `svc-track--gsap` | Pin/scrub de la pila de servicios (`--i`) |
| `FadingVideo` | Crossfade de video (rAF) |

### 8.3 Patrón GSAP (secciones editoriales)

- Cargar por hook: `HeroSection` (`data-gsap="editorial|sheet|sheet-drag|underline|trust"`),
  `ServicesSection` (`data-gsap-svc`), `NosotrosSection` (`data-gsap-about`),
  `PortfolioSection` (`data-gsap-portfolio`), casos (`data-gsap-casos`).
- GSAP desde CDN 3.13.0 con **inyección async** (gsap, ScrollTrigger, Draggable) +
  fallback `console.warn` si no carga; el contenido debe verse **sin** GSAP.
- Usar `gsap.matchMedia()` para `lg` y para `prefers-reduced-motion`.
- Llamar `ScrollTrigger.refresh()` en `load` (y en `document.fonts.ready` + ~800ms en
  secciones con fuentes tardías como Nosotros).
- **`is:inline` scripts** NO pueden usar `{id}` de Astro → usar
  `document.currentScript.previousElementSibling` o `data-id` + `getElementById`.
- **No animar** con `liquid-glass` en el mismo nodo que un transform de hover.

### 8.4 `FadingVideo` (crossfade rAF)

- `FADE_MS = 500`, `LEAD = 0.55s`.
- Eventos `loadeddata` / `ended` / `timeupdate`.
- Contenedor `display: contents`; id aleatorio `fv-xxxxxx` accedido vía `data-id` +
  `document.getElementById` (compatible con `is:inline`).
- Props: `src`, `class`, `style`, `id`.

### 8.5 Reglas de motion

- Duraciones: 150–300ms micro-interacciones; reveals `~0.35s`/`~0.5s`; entradas
  ease-out, salidas ease-in.
- **Rotación sutil** como firma humana: `-rotate-1`/`-rotate-2` en anotaciones
  `font-hand` y CTAs → `hover:rotate-0` (`duration-300`).
- **Respetar `prefers-reduced-motion`**: `global.css` ya desactiva transforms/backdrop
  con `!important`; verificar que reveals quedan **visibles** (no ocultos) sin motion.
  En casos, `CasoCard` es visible por defecto y GSAP solo refuerza.

---

## 9. Humanidad real (Proof of Work), no fabricada

Señales visibles que el diseño **sí** debe contener (honestas, con sustancia real):

1. **Anotaciones manuscritas** (`font-hand` Caveat 600/700) para momentos emocionales,
   con icono SVG y rotación leve.
2. **Subrayados dibujados a mano**: SVG `preserveAspectRatio="none"`, path
   `M3 7c50-5 100 5 150 0s100-5 144-1`, stroke redondeado, `pathLength=1` con
   `strokeDasharray` para el draw.
3. **Papel y cinta**: sticky note crema `#f5efe0` con "tape" `rgba(253,230,138,0.75)`,
   texto en tinta `#4a3f33`/`#2f2a22`; radios irregulares (§4.4).
4. **Temporal realness**: fecha viva server-side (`index.astro` → `hoy`/`anio`). No
   fechas inventadas estáticas.
5. **Prueba de lugar**: datos locales verificables (`src/data/regiones.ts`, fuente
   INE Censo 2024; `notaDistancia` con hito real como ferry Pargua–Chacao).
6. **Perfil autor centralizado** (`src/data/author.ts`): Matías Pérez Nauto, Fundador &
   Estratega Digital, Puerto Varas. Para E-E-A-T consistente.
7. **Honestidad dura** en casos (`casos.ts`): proyectos internos etiquetados "Caso
   interno"; testimonios `null` se muestran como "butaca reservada / REC", nunca se
   inventan (`TestimoniosReservados`, `TestimonioCaso`).

**Límite ético**: no degradar output de IA para aparentar torpeza humana. La
imperfección debe ser decisión humana real, no simulación. Ver skill
`humanwashing-design`.

---

## 10. Imágenes

- Cada columna cinematográfica = imagen de arriba a abajo, `object-fit: cover`.
- Tono dramático/oscuro para fundirse con `#010101`.
- Overlay obligatorio: `linear-gradient(to top, #010101 0%, transparent 40%)`.
- Sin frames que limiten la inmersión; **prohibido** `rounded-3xl` o mayor en hero.
- `alt` descriptivo siempre. Video hero con `preload` y `fetchpriority="high"`.
- `global.css` fija `img { aspect-ratio: attr(width)/attr(height) }` con fallback
  `@supports` — declarar `width`/`height` para evitar CLS.

---

## 11. Accesibilidad y performance

- Contraste AA mínimo sobre fondos oscuros (`#fafafa` sobre `#010101` ✅; usar
  `--color-text-secondary` con criterio).
- **Foco visible**: `:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px }`;
  `a`/`button` usan `2px solid #fff`. Nunca eliminar outline sin reemplazo.
  `:focus:not(:focus-visible)` quita outline solo al mouse.
- `::selection`: fondo `--color-accent`, texto blanco.
- `aria-hidden` en decoración (noise, glows, hairlines). `aria-live`/`role="status"` en
  feedback de formularios (`cf-status`, `lm-status`).
- `main id="main-content"` presente; `.skip-to-content` con foco visible.
- Imágenes con `loading="lazy"` salvo hero.
- Tipografía self-hosted con `font-display: swap` y subsets (evita FOUT de fuentes no
  usadas).
- Objetivo Core Web Vitals: LCP del hero (video/imagen) prioritizado. Barra de
  progreso de lectura `#reading-progress` (z-60, `will-change: width`).

---

## 12. Dos superficies

| Superficie | Layout | Fondo | Notas |
|---|---|---|---|
| **Público** | `BaseLayout.astro` | `#010101` | `lang="es-CL"`, SEO/JSON-LD (Person, FAQPage, Review, Article), editorial inmersivo |
| **Admin** | `AdminLayout.astro` | `.dark` | `lang="es"`, `noindex nofollow`, denso, sin cinemática |

Ambos usan `<html class="dark">` y `global.css` + `fonts.css`. El admin hereda tokens
pero **no** las reglas de columnas viewport-dominance (la densidad de datos manda).
Mantener consistencia de color/tipografía, no de escala.

---

## 13. Plantillas de página (orden canónico)

- **Home** (`index.astro`): Hero → Diagnóstico → Services → Nosotros → Portfolio →
  Recursos → CTA → Testimonials.
- **Región** (`regiones/*.astro`): Header → Breadcrumbs → contenido local →
  `LocalidadDatos` → `FaqPreview` → `CiudadesRelacionadas` → Footer.
- **SEO local** (`seo-local/*.astro`): estructura de región + `CiudadesRelacionadas`.
- **Servicio** (`servicios/*.astro`): incluye `StickyCTA`.
- **Casos** (`casos/*.astro`): CasoCard (archivo) / `OfertaFundador` + `CasoForm` +
  `CasoNav` + `TestimoniosReservados` en `/casos`; `TestimonioCaso` en `/casos/[slug]`.
- **Blog / Recursos** (`recursos/*.astro`): `Breadcrumbs` + `LeadMagnetForm` + Footer.

Un `<h1>` por página. `<FaqPreview>`/`FAQSection` único por página (evita duplicar FAQ
schema).

---

## 14. Anti-patrones (PROHIBIDOS)

- ❌ Fondo blanco/beige o secciones claras.
- ❌ Cards con bordes gruesos o `box-shadow` drop-shadow convencional (excepto el
  papel/recorte de §4.4).
- ❌ CTA en colores brillantes/neón como relleno dominante (el gradiente de marca es la
  única excepción).
- ❌ Serif/decorativa en UI.
- ❌ Grids uniformes de igual ancho (asimetría siempre).
- ❌ Padding excesivo que rompa la inmersión.
- ❌ `rounded-3xl` o más en hero images.
- ❌ `liquid-glass` + transform hover en el mismo nodo.
- ❌ `overflow-x: hidden` (usar `clip`).
- ❌ Hex hardcodeado donde existe token.
- ❌ Imperfección simulada por IA para aparentar humanidad.
- ❌ Inventar testimonios, métricas o fechas (usar placeholder honesto).
- ❌ Usar un peso de fuente no cargado sin agregar su `@font-face` + preload.

---

## 15. Checklist pre-ship

- [ ] Solo tokens de `@theme` (o excepción comentada).
- [ ] Deep dark `#010101` / `#0A0A0A`; sin superficies claras.
- [ ] `reveal-group`/`reveal-item` en secciones; reduced-motion respetado (contenido
      visible sin motion).
- [ ] GSAP por `data-gsap-*` con fallback y `ScrollTrigger.refresh()` donde aplique.
- [ ] Asimetría presente; no grid uniforme.
- [ ] CTA correcto: píldora blanca (nav) o gradiente/sólido (bloque).
- [ ] `font-hand` + rotación solo en anotaciones reales.
- [ ] Pesos de fuente dentro de los cargados (§3.1).
- [ ] Foco visible, `alt` correctos, decoración `aria-hidden`, `aria-live` en forms.
- [ ] `BaseLayout` (público) o `AdminLayout` (admin) correcto.
- [ ] `pnpm build` pasa (el usuario lo ejecuta).

---

## 16. Referencias

- `.claude/rules/ui-design.md` — filosofía VINCULANTE.
- `src/styles/global.css` — tokens `@theme`, utilidades (`.grain`, `.svc-track`,
  `.nav-link`, `#reading-progress`, `.prose-blog`, `.skip-to-content`), focus/selection.
- `src/styles/fonts.css` — fuentes self-hosted y pesos reales.
- `.codebase-memory/ADR.md` — decisiones de arquitectura.
- `src/data/` — `author.ts`, `regiones.ts`, `casos.ts`, `testimonials.json`,
  `pricing.json`, `faq-precios.ts`, `oferta-fundador.ts`, `projects.json`.
- `src/lib/marketing/lead-magnets.ts` — catálogo de lead magnets.
- `src/lib/caso-visuals.ts` — visuales generativos de casos.
- Skills: `frontend-maestro`, `humanwashing-design`, `tailwind`, `astro`.
- `AGENTS.md` — convenciones del proyecto y modo de comunicación.
