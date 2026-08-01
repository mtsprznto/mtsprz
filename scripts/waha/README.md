# WAHA — WhatsApp HTTP API (Mtsprz)

WAHA (**WhatsApp HTTP API**) = glue layer Node.js sobre engines open-source de WhatsApp.
Expone REST API + webhooks consistente. **v2026.6.1+: Core y Plus fusionados → open source y gratis.**

- Docs oficiales: https://waha.devlike.pro/docs/overview/introduction/
- OpenAPI: https://waha.devlike.pro/swagger/openapi.json
- Dashboard: http://localhost:3000/dashboard
- Swagger UI local: http://localhost:3000/swagger

## Arquitectura en Mtsprz

```
┌─────────────┐    HTTP /api/sendText    ┌──────────────┐   WebSocket   ┌────────────┐
│ Astro app   │ ───────────────────────► │ WAHA :3000   │ ────────────► │ WhatsApp   │
│ (Vercel/dev)│ ◄─────────────────────── │ (engine WEBJS)│ ◄──────────── │ (teléfono) │
│ /api/whatsapp/webhook ◄── webhook HTTP └──────────────┘               └────────────┘
└─────────────┘
```

- **Envío**: la app llama `POST /api/sendText` con header `X-Api-Key` y `session` en body.
- **Recepción**: WAHA envía webhook `POST /api/whatsapp/webhook` cuando llega mensaje.
- Reemplaza a Evolution API (`scripts/prospector/evolution-api/`) — ver sección [Migración](#migración-evolution--waha).

## Requisitos

- Docker Desktop (Windows) o Docker Engine + Compose (VPS/Linux)
- Cuenta de WhatsApp (la del negocio) — se vincula como *Linked Device* (como WhatsApp Web)

## 1. Levantar WAHA

### Local (Windows con Docker Desktop) — PowerShell

```powershell
cd scripts\waha
copy .env.example .env        # editar WAHA_API_KEY si se quiere otra
docker compose up -d
```

### VPS (Linux)

```bash
cd scripts/waha
cp .env.example .env          # editar WAHA_API_KEY
docker compose up -d
```

Verificar:

```powershell
docker compose ps             # health: healthy
curl http://localhost:3000/health
curl http://localhost:3000/api/version -H "X-Api-Key: <tu-key>"
```

> ⚠️ **Persistencia**: el compose monta `./.sessions:/app/.sessions` (volumen local).
> Si borras esa carpeta, pierdes el auth de WhatsApp y hay que re-escanear QR.

## 2. Conectar WhatsApp (crear sesión + QR)

### Opción A — Dashboard (recomendado para la primera vez)

1. Abrir http://localhost:3000/dashboard
2. Crear sesión → nombre `mtsprz` → start
3. Escanear QR con WhatsApp → *Linked Devices* (igual que WhatsApp Web)

### Opción B — API

```powershell
# 1. Crear sesión
curl -X POST http://localhost:3000/api/sessions ^
  -H "Content-Type: application/json" ^
  -H "X-Api-Key: <tu-key>" ^
  -d "{\"name\":\"mtsprz\",\"start\":true}"

# 2. Obtener QR (imagen PNG)
curl http://localhost:3000/api/mtsprz/auth/qr?format=image ^
  -H "X-Api-Key: <tu-key>" --output qr.png
```

Escanear `qr.png` con WhatsApp → Linked Devices.

> ⚠️ Cada vez que el status de sesión sea `SCAN_QR_CODE` hay que **volver a descargar el QR**
> (se regenera en cada emisión del evento).

### Verificar conexión

```powershell
curl http://localhost:3000/api/sessions/mtsprz ^
  -H "X-Api-Key: <tu-key>"
# Esperar: "status": "WORKING"
```

## 3. Enviar mensaje de prueba

```powershell
curl -X POST http://localhost:3000/api/sendText ^
  -H "Content-Type: application/json" ^
  -H "X-Api-Key: <tu-key>" ^
  -d "{\"session\":\"mtsprz\",\"chatId\":\"56912345678@c.us\",\"text\":\"Hola! Prueba desde WAHA\"}"
```

Formato de `chatId`: `569XXXXXXXX@c.us` (número con código país, sin `+`, con sufijo `@c.us`).

## 4. Webhooks — recibir mensajes en la app

WAHA hace `POST` al webhook configurado cuando llegan eventos. La app Mtsprz ya tiene
el endpoint migrado: `POST /api/whatsapp/webhook` (público en middleware, eventos `message`
y `message.ack`, auth por header `X-Api-Key`).

### Configurar webhook en la sesión

**Opción A — Dashboard**: sesión → config → Webhooks → añadir:
- URL: `http://localhost:4321/api/whatsapp/webhook` (dev Astro) o `https://mtsprz.org/api/whatsapp/webhook` (prod)
- Events: `message`, `message.ack` (tracking de entrega — requiere `config.webjs.tagsEventsOn: true` para ack)
- Custom headers: `X-Api-Key` → `<tu-key>` (misma `WAHA_API_KEY` que la app)

**Opción B — API** (re-crear sesión con config completa):

```powershell
curl -X POST http://localhost:3000/api/sessions ^
  -H "Content-Type: application/json" ^
  -H "X-Api-Key: <tu-key>" ^
  -d "{\"name\":\"mtsprz\",\"start\":true,\"config\":{\"webjs\":{\"tagsEventsOn\":true},\"client\":{\"deviceName\":\"Mtsprz WAHA\",\"browserName\":\"Chrome\"},\"webhooks\":[{\"url\":\"http://localhost:4321/api/whatsapp/webhook\",\"events\":[\"message\",\"message.ack\"],\"customHeaders\":[{\"name\":\"X-Api-Key\",\"value\":\"<tu-key>\"}]}]}}"
```

### Payload del evento `message`

```jsonc
{
  "event": "message",
  "session": "mtsprz",
  "payload": {
    "id": "false_56912345678@c.us_ABC123",
    "from": "56912345678@c.us",
    "fromMe": false,
    "chatId": "56912345678@c.us",
    "timestamp": 1715000000,
    "text": "Hola",
    "type": "text",
    "ack": 1
  }
}
```

La app procesa `payload.from` (quita `@c.us`), `payload.fromMe` (ignora propios),
dedupe por `payload.id` e inserta el lead + auto-respuesta. El evento `message.ack`
actualiza el status de entrega en `whatsapp_conversations` (pending → delivered → read).

### HMAC (opcional, producción)

Configurar `hmac: {key: "<secreto>"}` en el webhook → WAHA firma con header `X-WAHA-HMAC-SHA256`.
La app debe verificar la firma antes de procesar. Docs: https://waha.devlike.pro/docs/how-to/webhooks/

## 5. Ciclo de vida de sesión

| Status | Significado | Acción |
|---|---|---|
| `STOPPED` | Detenida | `POST /api/sessions/{s}/start` |
| `STARTING` | Arrancando | — |
| `SCAN_QR_CODE` | Requiere login | Re-fetch del QR (siempre) |
| `WORKING` | Lista | Enviar/recebir normal |
| `FAILED` | Error / auth | Restart → si no, Logout + Start |

```powershell
# Restart / Stop / Logout / Delete
curl -X POST http://localhost:3000/api/sessions/mtsprz/restart -H "X-Api-Key: <tu-key>"
curl -X POST http://localhost:3000/api/sessions/mtsprz/stop    -H "X-Api-Key: <tu-key>"
curl -X POST http://localhost:3000/api/sessions/mtsprz/logout -H "X-Api-Key: <tu-key>"
curl -X DELETE http://localhost:3000/api/sessions/mtsprz       -H "X-Api-Key: <tu-key>"
```

## 6. Anti-bloqueo — Reachout Timelock

WhatsApp shadow-restringe cuentas que escriben a muchos contactos nuevos ("cold").
Señal: envío a contacto nuevo falla con **`server returned error 463`**, sesión sigue `WORKING`.

- **NO restart, NO logout, NO re-pair** — no levanta la restricción; se levanta sola.
- El estado aparece en el evento `session.status` (`data.reachoutTimelock.timeEnforcementEnds`)
  y en `GET /api/sessions/mtsprz/me`.
- Mensajear **chats existentes** sigue funcionando; solo bloquea 1:1 a contactos sin chat previo.
- Best practices: calentar la cuenta (pocos contactos nuevos/día), device name real,
  proxy por sesión si hace falta (`config.proxy.server`), no reintentar en loop.

## 7. Troubleshooting

| Error | Causa / Fix |
|---|---|
| `server returned error 463` | Reachout Timelock — pausar outreach hasta `timeEnforcementEnds` |
| 401 | Falta `X-Api-Key` o key incorrecta |
| QR no actualiza | `SCAN_QR_CODE` re-emitido → siempre re-fetch del QR |
| Sesión muere al reiniciar | Falta volumen `.sessions` |
| FAILED persistente | Restart → si no, Logout → Start |
| Video no llega | Usar imagen `:chrome` (soporta video) |
| Chromium crashea | `shm_size: 256mb` ya configurado en compose |

## Comandos útiles

```powershell
docker compose logs -f          # logs en vivo
docker compose ps               # estado servicios
docker compose down             # detener (NO borra .sessions)
docker compose down -v          # ⚠️ borra .sessions → re-escanear QR
docker pull devlikeapro/waha:latest && docker compose up -d   # update
```

## Migración Evolution → WAHA (completada)

Mapeo aplicado:

| Evolution API | WAHA |
|---|---|
| `POST /message/sendText/{INSTANCE}` | `POST /api/sendText` |
| header `apikey` | header `X-Api-Key` |
| `instance` en URL | `session` en body |
| instancia `mtsprz` | sesión `mtsprz` |
| webhook `MESSAGES_UPSERT` (`data.key`) | webhook `message` (`payload.from`, `payload.text`) |
| `http://localhost:8080` | `http://localhost:3000` |

Cambios en el código:

1. **Nuevo módulo `src/lib/waha/`** — transporte tipado (client, types, config, phone).
   La capa de negocio (`lib/whatsapp.ts`) consume el cliente; el dominio no conoce HTTP.
2. **`src/lib/whatsapp.ts`** — solo dominio: auto-responder, `notifyAdmin`, `getConnectionState`
   (status `WORKING`), `extractPhoneNumber`. Sin Evolution ni sender browser.
3. **Webhook** — eventos `message` + `message.ack`, auth `X-Api-Key` (acepta `apikey` legacy),
   dedupe por `wa_message_id`, actualización de status de entrega.
4. **Migración `017_wa_conversations_ack`** — `updated_at`, dedupe + índice único parcial.
5. **Env**: `WABA_URL`/`WABA_API_KEY` → `WAHA_URL`/`WAHA_API_KEY`/`WAHA_SESSION`
   (actualizar también en Vercel: Settings → Environment Variables).
6. **Prospector Python** — `WhatsAppCampaign` usa sesiones WAHA y `/api/sendText`
   (`--instance` → `--session`, key `WAHA_API_KEY`, error 463 = Reachout Timelock).

> El sender `scripts/whatsapp-browser/` (browser real Python) quedó como herramienta
> independiente y la app ya NO lo usa — WAHA WEBJS (Chromium) es el único transporte.

## Estado (2026-08-01)

- ⚠️ **NO integrado a producción.** Uso local-only por decisión del usuario.
- Cuando se quiera usar: levantar `docker compose up -d` local, escanear QR sesión `mtsprz`, probar sendText.
- Integración futura al flujo web en producción: definir webhook https://mtsprz.org/api/whatsapp/webhook (events message + message.ack, header X-Api-Key) cuando corresponda.
