# Tracker Off-Site — O1/O2/O9 (G4 · Ronda 3)

> **Tracker ejecutable** · PRD: `docs/prd/PRD-seo-ronda3-2026-10-16.md` · Hito **G4**
> **Creado**: 2026-10-16 · **Subdominios re-verificados**: 2026-10-16 (curl)
> **Playbooks**: `scripts/seo-directorios-chile.md` (O1) · `scripts/seo-bing-webmaster-tools.md` (O2)
> **Uso**: marcar estados aquí + commitear. Regla: cada acción off-site se ejecuta 100% con el **NAP canónico**.

---

## NAP canónico (usar SIEMPRE este, carácter por carácter)

```
Nombre: Mtsprz Soluciones Digitales
Ubicación: Puerto Varas, Región de Los Lagos, Chile
Teléfono/WhatsApp: +56966929818
Email: contacto@mtsprz.org
Sitio: https://mtsprz.org
```

---

## O1 — Directorios (meta: ≥10 con NAP canónico corregido)

### ⚠️ Correcciones de entidad pendientes (PRD P2 — verificado 16-oct, AÚN incoherentes)

| Directorio | Problema detectado | Corrección exacta |
|---|---|---|
| **EmpresaChile** | Categoría "Comunicaciones y medios" ✗ · ciudad "Puerto Montt" ✗ | Categoría → "Desarrollo de software / Agencia digital" · Ciudad → **Puerto Varas** |
| **ChilePymes.cl** | Categoría "artes" ✗ · dirección mixta ✗ | Categoría → "Servicios tecnológicos / Diseño web" · Dirección única: **Puerto Varas, Los Lagos** |

> Nota: el checklist de `seo-directorios-chile.md` lista ambos como "✅ editado 2026-08-01" — **stale**: la verificación del 16-oct (PRD P2) los da por pendientes. Al entrar, corregir y actualizar ambos docs.

### Estados base (del checklist 2026-08-01, actualizar al ejecutar)

| # | Directorio | Estado | Nota |
|---|---|---|---|
| 1 | Google Business Profile ⭐ | ✅ verificado (ago) | Completar: categoría, teléfono, web, descripción, fotos, link reseñas |
| 2 | **Bing Places** | ⬜ pendiente | Alimenta Copilot/ChatGPT — prioridad alta (ver O2) |
| 3 | Apple Maps Connect | ⬜ pendiente | |
| 4 | ChilePymes.cl | ⚠️ corregir | Ver arriba |
| 5 | Yelu.cl | ⬜ pendiente | |
| 6 | GuíaEmpresas.cl | ⬜ pendiente | |
| 7 | Empresario.cl | ⬜ pendiente | |
| 8 | Cámara de Comercio Puerto Montt | ⬜ pendiente | Backlink .cl alta autoridad |
| 9 | Cylex Chile | ⬜ pendiente | |
| 10 | Hotfrog Chile | ⬜ pendiente | |
| 11 | InfoAnuncios | ⬜ pendiente | Clasificado |
| 12 | MundoChileno | ⬜ pendiente | Clasificado |
| 13 | Gauchada.cl | ⬜ pendiente | Clasificado |
| 14 | ListadoLocal.com | ⬜ pendiente | |
| + | EmpresaChile | ⚠️ corregir | Ver arriba |
| + | Instagram Business (@mtsprz) | ⬜ pendiente | |
| + | Facebook Business (/mtsprz) | ⬜ pendiente | |
| + | **Foursquare** (extra J2) | ⬜ pendiente | Fuente local que usan asistentes IA (estrategia J2) |
| + | **Yelp** (extra J2) | ⬜ pendiente | Idem |

**Métrica PRD**: ≥10 directorios con NAP canónico corregido · ↑ dominios de referencia en GSC.

**Cómo verificar avance** (Windows):
```cmd
:: busca menciones de la marca y su NAP en la web
start https://www.bing.com/search?q=%22Mtsprz%22+%22Puerto+Varas%22
start https://duckduckgo.com/?q=%22Mtsprz+Soluciones+Digitales%22
```
Anotar: dominio + ¿NAP exacto? + ¿link dofollow?

---

## O2 — GBP completo + Bing Webmaster Tools

### GBP (Google Business Profile)
- [ ] Categoría principal: "Agencia de marketing digital" (secundaria: "Servicio de diseño web")
- [ ] Teléfono + horario + web + descripción (texto del playbook)
- [ ] Fotos reales (logo, oficina, proyectos — subir mínimo 5)
- [ ] Q&A sembrado (3-5 preguntas frecuentes con precios)
- [ ] 1 post/semana · responder reseñas <24h
- [ ] Link de reseña activo: `https://g.page/r/CTtH8EKjoy9cEBM/review`

**Métrica PRD**: Local Pack "agencia digital Puerto Varas" + ↑ reseñas (meta estrategia: 10 en 90 días).

### Bing Webmaster Tools + Bing Places (playbook completo: `seo-bing-webmaster-tools.md`)
- [ ] Cuenta Bing WMT creada (import desde GSC — 2 min)
- [ ] Sitemaps submit: `sitemap-index.xml` + `image-sitemap.xml`
- [ ] Primer `node scripts/indexnow-notify.mjs` post-deploy
- [ ] Bing Places con NAP canónico
- [ ] Revisar **AI Performance report** (Bing) en 2 semanas — citas en Copilot/Bing AI/ChatGPT

---

## O9 — Noindex subdominios de marca

### Re-verificación HTTP (2026-10-16, desde este repo — spec del PRD)

| Subdominio | HTTP | ¿noindex? | Acción |
|---|---|---|---|
| `dept.mtsprz.org` | 200 | ❌ no | Añadir noindex |
| `lllit.mtsprz.org` | 200 | ❌ no | Añadir noindex |
| `autcv.mtsprz.org` | 200 | ❌ no | Añadir noindex |
| `td.mtsprz.org` | 200 | ❌ no (tiene `<meta name="robots" content="index, follow">` explícito) | Añadir noindex |
| `portafolio.mtsprz.org` | 200 | ❌ no | Añadir noindex |
| `ota.mtsprz.org` | — | DNS muerta (curl=000) | Nada; vigilar que no reviva |

### Cómo ejecutar (por proyecto, off-repo)

1. **Opción A (HTML)**: `<meta name="robots" content="noindex, nofollow" />` en el `<head>` raíz del proyecto → deploy.
2. **Opción B (header)**: `X-Robots-Tag: noindex, nofollow` en el `vercel.json` del subproyecto (`headers` global) → deploy.
3. ⚠️ **NO bloquear con robots.txt** — un bloqueo de crawling impide que Google lea el `noindex`. Usar noindex, no robots.txt.
4. Verificación post-deploy (desde donde sea):

```cmd
curl.exe -sI https://dept.mtsprz.org/ | findstr /i "x-robots-tag"
curl.exe -s https://dept.mtsprz.org/ | findstr /i "noindex"
```

(repetir por cada subdominio; en el output: X-Robots-Tag con `noindex` o meta con `noindex`)

**Nota**: la desindexación tarda semanas; validar con `site:dept.mtsprz.org` en Google/Bing a los 30 días.

**Métrica PRD**: 0 subdominios compitiendo en SERP de marca (`site:mtsprz.org` sin subdominios).

---

## Registro de cambios

| Fecha | Item | Estado | Nota |
|---|---|---|---|
| 2026-10-16 | Tracker creado; O9 re-verificado (5×200 sin noindex; ota DNS muerta) | baseline | curl desde arch WSL |
| | | | |
