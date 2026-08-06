/**
 * WAHA · Configuración central desde environment.
 * Variables: WAHA_URL, WAHA_API_KEY, WAHA_SESSION
 */

export interface WahaConfig {
  baseUrl: string;
  apiKey: string;
  session: string;
  /** Timeout por request (ms). Envío de media puede ser lento. */
  timeoutMs: number;
}

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_SESSION = "mtsprz";
const DEFAULT_TIMEOUT_MS = 30_000;

export const WAHA_CONFIG: WahaConfig = {
  baseUrl: (import.meta.env.WAHA_URL as string | undefined) || DEFAULT_BASE_URL,
  apiKey: (import.meta.env.WAHA_API_KEY as string | undefined) || "",
  session: (import.meta.env.WAHA_SESSION as string | undefined) || DEFAULT_SESSION,
  timeoutMs: Number(import.meta.env.WAHA_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
};
