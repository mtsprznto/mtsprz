/**
 * WAHA · Cliente HTTP tipado para WhatsApp HTTP API.
 * Transporte puro: no conoce lógica de negocio (auto-responder, leads).
 *
 * Docs: https://waha.devlike.pro/docs/overview/introduction/
 * API:   https://waha.devlike.pro/swagger/openapi.json
 */

import type { WahaConfig } from "./config";
import type { WahaMe, WahaMessage, WahaSession } from "./types";
import { WahaError } from "./types";

export interface SendTextOptions {
  /** IDs de contactos a mencionar (grupos). */
  mentions?: { id: string; name?: string }[];
  /** Link preview: false desactiva la previsualización de URLs. */
  linkPreview?: boolean;
  /** Reply a un mensaje previo (reply_to). */
  replyTo?: string;
}

export class WahaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly session: string;
  private readonly timeoutMs: number;

  constructor(config: WahaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.session = config.session;
    this.timeoutMs = config.timeoutMs;
  }

  /* ── Core HTTP ── */

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error("WAHA_API_KEY no configurada · revisa .env");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        throw new WahaError(res.status, body.slice(0, 500));
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof WahaError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new Error(`WAHA timeout (${this.timeoutMs}ms) en ${path}`);
      }
      throw new Error(`WAHA no responde en ${this.baseUrl} · ¿está el container arriba? (${(err as Error).message})`);
    } finally {
      clearTimeout(timer);
    }
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  /* ── Health / Server ── */

  /** GET /health · alive check del server WAHA. */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ── Sesiones ── */

  /** GET /api/sessions/{session} · estado de la sesión. */
  getSession(): Promise<WahaSession> {
    return this.get<WahaSession>(`/api/sessions/${encodeURIComponent(this.session)}`);
  }

  /** GET /api/sessions/{session}/me · incluye reachoutTimelock. */
  getMe(): Promise<WahaMe> {
    return this.get<WahaMe>(`/api/sessions/${encodeURIComponent(this.session)}/me`);
  }

  /* ── LID resolution ── */

  /**
   * GET /api/{session}/lids/{lid} · resuelve un LID (Linked ID) a su número real.
   * WAHA 2026 usa LIDs en `message.from` de los webhooks entrantes;
   * para identificar leads necesitamos el número de teléfono (pn).
   */
  getLidToPhone(lid: string): Promise<{ lid: string; pn: string }> {
    const clean = lid.replace(/@lid$/, "");
    return this.get(`/api/${encodeURIComponent(this.session)}/lids/${encodeURIComponent(clean)}`);
  }

  /* ── Envío ── */

  /** POST /api/sendText · texto plano. */
  async sendText(chatId: string, text: string, options: SendTextOptions = {}): Promise<WahaMessage> {
    const body: Record<string, unknown> = {
      session: this.session,
      chatId,
      text,
    };
    if (options.mentions?.length) body.mentions = options.mentions;
    if (options.linkPreview === false) body.linkPreview = false;
    if (options.replyTo) body.reply_to = options.replyTo;
    return this.post<WahaMessage>("/api/sendText", body);
  }

  /** POST /api/sendSeen · marca mensaje como leído. */
  sendSeen(chatId: string): Promise<unknown> {
    return this.post("/api/sendSeen", { session: this.session, chatId });
  }
}
