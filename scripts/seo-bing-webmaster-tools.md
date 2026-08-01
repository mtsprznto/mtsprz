# Bing Webmaster Tools — Guía de configuración (Mtsprz)

> **Por qué importa**: Bing alimenta **Microsoft Copilot, Bing Chat y (vía licencia) una parte de ChatGPT**.
> Sin indexación en Bing = invisible en esas superficies IA. Setup completo: 30-45 min, gratis.

---

## Paso 1 — Crear cuenta y verificar sitio (2 rutas)

### Ruta A (RECOMENDADA — 2 min): importar desde Google Search Console
1. Ir a **https://www.bing.com/webmasters**
2. Iniciar sesión con cuenta Microsoft (o cuenta Google)
3. Click **"Import from Google Search Console"**
4. Autorizar acceso a GSC → Bing trae automáticamente los sitios verificados + sitemaps
5. Seleccionar `https://mtsprz.org` → queda verificado sin más pasos

### Ruta B (manual, si no hay GSC):
1. Click **"Add a site"** → ingresar `https://mtsprz.org`
2. Elegir verificación **Meta tag** (más fácil para Astro):
   - Bing da un tag como `<meta name="msvalidate.01" content="XXXX" />`
   - Agregarlo en `src/layouts/BaseLayout.astro` dentro de `<head>`
3. Deployar + click **Verify**

---

## Paso 2 — Submit sitemaps

1. Panel del sitio → **Configure My Site → Sitemaps**
2. Submit estos (ya generados por Astro en build):
   - `https://mtsprz.org/sitemap-index.xml`
   - `https://mtsprz.org/image-sitemap.xml`
3. Esperar estado verde. Si muestra error, revisar que `dist/` se generó con `pnpm build`

> robots.txt ya declara ambos sitemaps → Bing los descubre igual, pero el submit acelera.

---

## Paso 3 — IndexNow (YA CONFIGURADO en el repo ✅)

Se implementó:
- `public/6bd0ca88-d854-4880-8696-0487e438a7b4.txt` — key file (accesible en `https://mtsprz.org/6bd0ca88-...txt`)
- `scripts/indexnow-notify.mjs` — script de notificación

**Uso después de cada deploy (Windows):**
```bash
node scripts/indexnow-notify.mjs                    # notifica todas las URLs del sitemap
node scripts/indexnow-notify.mjs --url=https://mtsprz.org/blog/mi-post   # solo una URL
```

**Flujo recomendado** (tras cada build+deploy):
1. `pnpm build`
2. Deploy a Vercel
3. `node scripts/indexnow-notify.mjs`

> Bing crawlea en 24h-3 días en vez de semanas. Crítico para que posts nuevos sean citables por Copilot/ChatGPT rápido.

---

## Paso 4 — Verificar indexación (48h después)

1. Panel → **URL Inspection**
2. Ingresar `https://mtsprz.org` + una página región (ej. `/regiones/osorno`)
3. Deben aparecer como indexadas. Si no:
   - robots.txt no bloquea (verificado ✅)
   - Revisar si el deploy quedó live

---

## Paso 5 — Bing Places (mapas) — mismo login

1. Ir a **https://www.bingplaces.com** (o Bing Maps → "Add business")
2. Usar la misma cuenta Microsoft
3. Crear/editar ficha **Mtsprz** con NAP canónico:
   - Nombre: Mtsprz Soluciones Digitales
   - Ciudad: Puerto Varas, Los Lagos, Chile
   - Teléfono: +56966929818
   - Sitio: https://mtsprz.org
4. Opcional: importar datos desde GBP si la opción aparece

---

## Paso 6 — Reportes a vigilar (semanal)

| Reporte | Qué muestra | Acción |
|---|---|---|
| **AI Performance** (feb 2026) | Citas de tus páginas en Copilot/Bing AI/ChatGPT | Lista de optimización prioritaria — el reporte del futuro |
| **Search Performance** | Clicks, impresiones, CTR, posición en Bing | Comparar con GSC: Bing suele rankear distinto |
| **Site Scan** | Broken links, tags faltantes, thin content | Corregir flags semanales |
| **Backlinks** | Dominios que enlazan | Cross-check con estrategia link building |
| **SEO Reports** | Duplicate titles, meta faltantes | Alimenta prioridades |

---

## Checklist final

- [ ] Cuenta Bing Webmaster Tools creada
- [ ] Sitio verificado (import GSC recomendado)
- [ ] Sitemaps submit (sitemap-index + image-sitemap)
- [ ] IndexNow key file live (✅ ya en repo)
- [ ] Primer `node scripts/indexnow-notify.mjs` post-deploy
- [ ] Bing Places con NAP canónico
- [ ] Revisar AI Performance Report en 2 semanas
