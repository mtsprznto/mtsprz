/**
 * WAHA (WhatsApp HTTP API) — Domain types.
 * Docs: https://waha.devlike.pro/docs/overview/introduction/
 */

/** Estados del ciclo de vida de una sesión WAHA. */
export type WahaSessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "PASSKEY_REQUIRED"
  | "PASSKEY_CONFIRMATION_REQUIRED"
  | "WORKING"
  | "FAILED";

export interface ReachoutTimelock {
  enforcementType?: string;
  isActive: boolean;
  timeEnforcementEnds?: number | null;
}

/** GET /api/sessions/{session} */
export interface WahaSession {
  id: string;
  name: string;
  status: WahaSessionStatus;
  config?: Record<string, unknown>;
  apps?: unknown[];
  me?: WahaMe | null;
}

/** GET /api/sessions/{session}/me */
export interface WahaMe {
  id?: string;
  pushName?: string;
  profilePictureUrl?: string;
  phone?: string;
  reachoutTimelock?: ReachoutTimelock | null;
}

/** Respuesta de POST /api/sendText (y forma de un mensaje en payloads). */
export interface WahaMessage {
  id: string;
  from: string;
  fromMe: boolean;
  chatId: string;
  timestamp: number;
  text?: string;
  type?: string;
  ack: number;
  isForwarded?: boolean;
  replyTo?: string | null;
  [key: string]: unknown;
}

/** Valores ack — estado de entrega de un mensaje. */
export enum Ack {
  ERROR = -1,
  PENDING = 0,
  SERVER = 1,
  DEVICE = 2,
  READ = 3,
  PLAYED = 4,
}

/** Envelope de evento webhook enviado por WAHA. */
export interface WahaWebhookEvent {
  event: string;
  session: string;
  payload: Record<string, unknown> & { [k: string]: unknown };
}

/** Evento `message` (mensaje entrante o saliente). */
export interface WahaMessageEvent extends WahaWebhookEvent {
  event: "message";
  payload: WahaMessage;
}

/** Evento `message.ack` — cambio de estado de entrega. */
export interface WahaMessageAckEvent extends WahaWebhookEvent {
  event: "message.ack";
  payload: {
    id: string;
    fromMe: boolean;
    ack: Ack;
    [k: string]: unknown;
  };
}

/** Error tipado del cliente WAHA (HTTP status + body). */
export class WahaError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string
  ) {
    super(message || `WAHA API error ${status}: ${body}`);
    this.name = "WahaError";
  }

  /** WAHA/WhatsApp devuelve 463 cuando hay Reachout Timelock activo. */
  get isReachoutTimelock(): boolean {
    return this.status === 463;
  }
}
