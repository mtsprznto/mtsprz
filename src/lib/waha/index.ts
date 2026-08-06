/**
 * WAHA (WhatsApp HTTP API) · Módulo de infraestructura.
 *
 * Público:
 *  - `wahaClient` · instancia singleton del cliente HTTP (transporte)
 *  - tipos de dominio (WahaSession, WahaMessage, WahaWebhookEvent, ...)
 *  - utilidades de formato (extractPhoneNumber, toChatId, ackToStatus)
 *
 * La capa de negocio (auto-responder, leads) vive en `lib/whatsapp.ts`
 * y consume este módulo · el dominio no conoce el transporte.
 */

export * from "./types";
export { WAHA_CONFIG } from "./config";
export type { WahaConfig } from "./config";
export { WahaClient } from "./client";
export type { SendTextOptions } from "./client";
export { extractPhoneNumber, toChatId, ackToStatus } from "./phone";

import { WAHA_CONFIG } from "./config";
import { WahaClient } from "./client";

/** Instancia única del cliente · un solo transporte por proceso. */
export const wahaClient = new WahaClient(WAHA_CONFIG);
