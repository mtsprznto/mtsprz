# Medición SEO/AI — GA4 + Search Console (G3 · Ronda 3)

> **Playbook operativo** · PRD: `docs/prd/PRD-seo-ronda3-2026-10-16.md` · Hito **G3**
> **Creado**: 2026-10-16 · **Fuentes verificadas el 16-oct-2026** (ver §5)
> **Objetivo**: dejar de estar ciego al tráfico AI — canal AI en GA4 + reporte Gen AI en GSC + env vars verificadas.

---

## 0. Estado actual (código, verificado 16-oct-2026)

| Pieza | Archivo | Estado |
|---|---|---|
| GA4 + Clarity loader | `src/lib/analytics.ts` | ✅ consent-gated (`__cookieConsent.isAllowed("analytics")`); expone `window.gtag` |
| Env vars públicas | `PUBLIC_GA_ID` · `PUBLIC_CLARITY_ID` | ⬜ verificar en Vercel (§3) |
| Eventos funnel | `src/lib/tracking.ts` | ✅ `whatsapp_click` (delegación global en todos los `wa.me`), `cotizar_modal_open`, `email_submitted`, `verify_success/failure`, `email_resend`, `quote_submitted`, `contact_submitted`, `form_submit_diagnostico`, `newsletter_subscribed` |
| Higiene pendiente | `src/components/WhatsAppButton.astro:41-46` | ⚠️ envía conversión Ads con `send_to: "AW-CONV/whatsapp_click"` (placeholder inválido — inofensivo hoy; limpiar o reemplazar cuando exista Google Ads real, plan J5) |

**Recordatorio**: GA4 NO ve bots (GPTBot, ClaudeBot, PerplexityBot) — solo navegadores reales. El tráfico AI aquí = humanos que clickearon una cita.

---

## 1. GA4 — canal AI (paso a paso)

### 1.1 Verificación rápida (2 min, sin configurar nada)

1. GA4 → **Informes → Adquisición → Adquisición de tráfico**.
2. Dimensión principal: **Session default channel group** → buscar fila **"AI Assistant"**.
   - Google lo añadió el **13-may-2026**: asigna medium `ai-assistant` a referrers reconocidos (nombra ChatGPT, Gemini y Claude como ejemplos; **no publicó la lista completa** y **no hay backfill** previo a esa fecha).
   - ⚠️ Perplexity y Copilot **suelen seguir cayendo en Referral** (no confirmados en el canal nativo).
3. Dimensión **Session source** → buscar: `chatgpt`, `perplexity`, `claude`, `copilot`, `gemini`, `grok`, `deepseek`.
4. Lo que veas = **piso confirmado**, no techo: los clics sin referrer (apps móviles, navegadores in-app, links copiados) caen en **Direct**.

### 1.2 Custom channel group "AI Search" (vista completa — 10 min)

1. GA4 → **Administrar → Visualización de datos → Grupos de canales** → **Crear nuevo grupo** (nombre: `AI Search`) → partir de copia del default.
2. **Añadir canal** → nombre `AI Referral` → condición: **Session source → matches regex**:

```
.*(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|gemini\.google\.com|bard\.google\.com|claude\.ai|anthropic\.com|copilot\.microsoft\.com|chat\.deepseek\.com|grok\.com|grok\.x\.ai|you\.com).*
```

3. **Reordenar: "AI Referral" ARRIBA de "Referral"** — GA4 asigna al primer canal que matchea; si Referral va primero, se traga el tráfico.
4. Guardar → seleccionar el grupo en Adquisición de tráfico. Puede tomar **1–2 días** en poblar todos los informes (no todos son retroactivos).
5. **Ajustar la lista** con los Session source reales que aparezcan (§1.1) — la lista de asistentes crece; revisar trimestralmente.

### 1.3 Exploración "AI Referrals — baseline" (documentada)

1. **Explorar → Exploración en blanco** → nombre: `AI Referrals — baseline`.
2. Variables: Dimensión `Session source` · Métricas `Sessions`, `Engaged sessions`, `Key events`.
3. Desglose: `Landing page` (¿qué página citan — QuickAnswer G1 debería empujar `/desarrollo-web`, `/seo-local`, `/whatsapp-api`?).
4. Filtro: Session source coincide con la regex de §1.2.
5. **Guardar** (queda en la biblioteca; repetir mensual y anotar en `RESULTADOS.md` de `seo-test-results/ronda4-2026-10-16/`).

### 1.4 Marcar eventos clave (si no está hecho)

Admin → Visualización de datos → **Eventos** → marcar como **evento clave**: `contact_submitted`, `quote_submitted`, `form_submit_diagnostico`, `whatsapp_click`. (Sin esto, las conversiones AI no se pueden comparar.)

---

## 2. Search Console — checklist

### 2.1 Generative AI performance report (reporte nuevo de Google)

- **Qué es**: impresiones de tus URLs en **AI Overviews + AI Mode** en Google Search. Dimensiones: página / país / dispositivo / fecha. **Sin clics, sin queries** (solo impresiones).
- **Disponibilidad**: anunciado jun-2026; **global para todos los sitios desde el 31-ago-2026**.
- **Ruta**: GSC → Rendimiento → **Generative AI** (`search.google.com/search-console/performance/search-analytics/ai`).
- **Si no aparece**: (a) el sitio no tiene suficientes impresiones AI aún, o (b) el sitio está **excluido** de las features generativas → verificar en Configuración que `Search generative AI features` esté en **incluido** (si se excluye: 0 datos y 0 aparición).
- **Alcance**: no incluye Search Labs; Discover tiene su propio reporte. Las impresiones AI **ya están incluidas** en el reporte de rendimiento normal (este reporte las filtra).
- **Limitación honesta**: posición = bloque, no link individual; impulsiones detrás de "Show more" pueden no contarse. Google reconoció (sep-2026) que es "difícil hacerlo útil" — usar como tendencia, no como verdad absoluta.

### 2.2 Baseline (hacer 1 vez, ~15 min)

1. Exportar CSV últimos 28 días: **Generative AI** (páginas con impresiones) + **Rendimiento** (queries clave: `agencia digital puerto varas`, `desarrollo web osorno`, `seo local chile`, `página web precio chile`).
2. Anotar en `seo-test-results/ronda4-2026-10-16/RESULTADOS.md` → nueva subsección "GSC Gen AI (baseline)".
3. Esperar 1-2 semanas de datos antes de interpretar (el reporte se puebla lento; tráfico actual bajo = pocas filas — normal).

### 2.3 Revisión post-core-update

- Comparar ventanas de 28 días antes/después de cada update listado en **Google Search Central → News** (`developers.google.com/search/news`).
- Contexto vigente (SEO-PROGRESO §7): Core Update may-2026 + spam updates mar/jun/ago-2026 → alta volatilidad; revisar posiciones de queries locales post-8-oct-2026.
- Buscar señales: caídas de impresiones/clics en queries de servicio, cambios de CTR en marca.

### 2.4 Cadencia fija

| Frecuencia | Qué | Tiempo |
|---|---|---|
| Semanal | Gen AI impressions (delta vs semana previa) + brand queries | 10 min |
| Mensual | Export completo (Gen AI + Rendimiento + GA4 AI channel) → anotar en `RESULTADOS.md` | 30 min |
| Trimestral | Actualizar regex GA4 + revisar últimos launches GSC (Search Central News) | 20 min |

---

## 3. Verificación env vars (usuario, Vercel)

- [ ] `PUBLIC_GA_ID` = `G-XXXXXXX` presente en **Production + Preview** (Settings → Environment Variables).
- [ ] `PUBLIC_CLARITY_ID` presente (proyecto Clarity).
- [ ] En vivo: aceptar consentimiento en mtsprz.org → GA4 **Tiempo real** muestra sesión; click en botón WhatsApp → evento `whatsapp_click` visible.
- [ ] GA4: eventos clave marcados (§1.4).
- [ ] Clarity: grabaciones/sesiones visibles tras consent.

> Si `PUBLIC_GA_ID` está vacío en Vercel, GA4 nunca carga (el código no rompe: `|| ""`). Verificar ANTES de esperar datos AI.

---

## 4. Registro baseline (rellenar con el primer dato real)

| Fecha | AI Assistant (GA4) | AI Referral custom (GA4) | Gen AI impressions (GSC) | Notas |
|---|---|---|---|---|
| 2026-10-__ | ⬜ | ⬜ | ⬜ | primer dato post-config |

---

## 5. Fuentes (verificadas 16-oct-2026)

- ✅ **SEJ** — "Google Analytics Adds AI Assistant As Default Channel Group" (14-may-2026): canal nativo ai-assistant desde 13-may-2026, lista no publicada, sin backfill.
- ✅ **Arrow AI** — "GA4's AI Assistant Channel" (28-sep-2026): Perplexity suele seguir en Referral; sin referrer → Direct; custom group cubre histórico.
- ✅ **dnmdigital** — "GA4 Now Tracks AI Traffic" (18-jun-2026): AI Overviews/AI Mode de Google NO entran al canal (quedan en Organic Search).
- ✅ **Google Search Console Help** — "Generative AI performance report (Search)" (reporte global desde 31-ago-2026; solo impresiones; opt-out en Settings).
- ✅ **Search Engine Land** — "GSC performance reports gets multimodal filter" (24-sep-2026).
- ✅ **GEOly / Ryze / thestacc** (2026): paso a paso de custom channel groups + regex de dominios AI + gotcha del orden de canales.
