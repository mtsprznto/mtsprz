/**
 * WAHA · Utilidades de formato de números y chat IDs.
 *
 * WAHA usa chat IDs tipo `56912345678@c.us` (número + sufijo de dominio).
 * Estos helpers normalizan entre "número pelado" (56..., 9...) y chat ID.
 */

const CHAT_SUFFIX_RE = /@(c\.us|lid|s\.whatsapp\.net|g\.us|newsletter|broadcast)$/;

/** Quita cualquier sufijo de chat ID → número pelado (56912345678). */
export function extractPhoneNumber(chatIdOrPhone: string): string {
  return chatIdOrPhone.replace(CHAT_SUFFIX_RE, "").trim();
}

/**
 * Normaliza un número a chat ID directo (`@c.us`).
 * Acepta: "56912345678", "+56912345678", "912345678" (Chile), "56912345678@c.us".
 */
export function toChatId(input: string): string {
  let phone = extractPhoneNumber(input);
  phone = phone.replace(/[^0-9]/g, "");
  if (!phone.startsWith("56")) {
    if (phone.startsWith("9")) phone = `56${phone}`;
    else if (phone.startsWith("0")) phone = `56${phone.slice(1)}`;
    else phone = `56${phone}`;
  }
  return `${phone}@c.us`;
}

/** Convierte un valor ack (estado de entrega) a un status legible para la DB. */
export function ackToStatus(ack: number): string {
  switch (ack) {
    case -1:
      return "error";
    case 0:
      return "pending";
    case 1:
      return "server";
    case 2:
      return "delivered";
    case 3:
      return "read";
    case 4:
      return "played";
    default:
      return "sent";
  }
}
