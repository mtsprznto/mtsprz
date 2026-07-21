# Architecture Decision Record — mtsprz

> Generado por codebase-memory-mcp. Re-generar con: `get_architecture(project="mtsprz", aspects=["all"])` + `manage_adr(project="mtsprz", mode="update", content=...)`

## Project Overview
- **Stack**: Astro 7 · Tailwind v4 · SSR + Vercel adapter (ISR 60s) · NeonDB (PostgreSQL serverless) · Resend · pdf-lib · TypeScript 5.8
- **Deploy**: https://mtsprz.org
- **Nodes**: 875 · **Edges**: 2986 (full mode)
- **Languages**: TypeScript (37 files) · Python (27 files, prospector) · SQL (3 migrations)

## Architecture Layers

| Layer | Packages | Role |
|---|---|---|
| entry | pages | Astro routes — SSR handlers |
| core | lib | Business logic — 65 inbound calls from pages |
| internal | prospector | Python scraper, standalone (uv) |

## Key Boundaries
- `pages → lib`: 65 calls — pages consumen todos los lib services
- `lib` hotspots: `query` (28 fan-in), `initDb` (24 fan-in) — DB es la dependencia central

## Entry Points / Public API

### lib (core services)
- `src/lib/db.ts` → `query`, `initDb`
- `src/lib/crypto.ts` → `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `generateToken`
- `src/lib/mail.ts` → `sendEmail`, `contractCreatedEmail`, `contractSignedEmail`, `adminNewContractNotification`
- `src/lib/contract-pdf.ts` → `generateContractPdf`
- `src/lib/contract-number.ts` → `generateContractNumber`
- `src/lib/storage.ts` → `storeBase64File`, `dataUrlToBase64`, `toDataUrl`
- `src/lib/validar-rut.ts` → `cleanRut`, `formatRut`, `validarRut`, `obtenerDigitoVerificador`
- `src/lib/validar-mrz.ts` → `validarChecksum`, `parseMrz`
- `src/lib/validators.ts` — validadores de formularios
- `src/lib/migrate.ts` → `runMigrations`

### pages/api endpoints
- `src/pages/api/auth/` — login/logout/session
- `src/pages/api/contracts/` — CRUD contratos
- `src/pages/api/services/` — CRUD servicios
- `src/pages/api/templates/` — CRUD plantillas
- `src/pages/api/upload.ts` — file upload
- `src/pages/api/contact.ts` — formulario contacto
- `src/pages/api/submit-quote.ts` — cotización
- `src/pages/api/send-code.ts` / `verify-code.ts` — OTP flow
- `src/pages/api/diagnostico.ts` — health check
- `src/pages/api/seed-admin.ts` / `seed-templates.ts` — setup inicial

### Auth-protected routes (middleware.ts)
- `/admin/*` · `/contratos/*` · `/firmar/*`

## Component Clusters (Leiden community detection)

| Cluster | Members | Key nodes |
|---|---|---|
| src/pages+lib | 48 | query, initDb, POST handlers |
| prospector-logger | 39 | info, warning, enrich_web |
| prospector-data | 32 | _row_to_prospect, normalizar_telefono |
| prospector-scraper | 27 | scrape, _fetch, import_file |
| validar-rut | 4 | cleanRut, formatRut, validarRut |
| validar-mrz | 4 | checksum, parseMrz, charValue |

## Data Flow: Firma de contrato
```
/firmar/[token].astro
  → crypto.verifyToken
  → db.query (fetch contrato)
  → contract-pdf.generateContractPdf
  → storage.storeBase64File
  → mail.contractSignedEmail
```

## Design Decisions

1. **SSR + ISR 60s** — dinámico (contratos/admin) en SSR; marketing con ISR para performance
2. **NeonDB serverless** — `query()` wrapper con `neon()` tagged template (no pg driver)
3. **Firma token único** — `/firmar/[token]` con `crypto.generateToken`, single-use en DB
4. **prospector aislado** — Python/uv en `scripts/prospector/`, sin deps compartidas con Astro
5. **Design system inline** — `liquid-glass` via CSS en global.css, sin lib externa

## Re-indexar

```
# Tras cambios grandes al código:
index_repository(repo_path="D:/LLLIT/Code-W11/mtsprz", mode="fast", name="mtsprz")

# Luego actualizar este ADR:
get_architecture(project="mtsprz", aspects=["all"])
manage_adr(project="mtsprz", mode="update", content="...")
```
