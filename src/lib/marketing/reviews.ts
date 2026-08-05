/**
 * Marketing — Solicitudes de reseña Google (J1 del plan 2026).
 *
 * Dos disparos post-proyecto:
 * - día 3: pedir reseña con entusiasmo del entregable
 * - día 10: recordatorio suave (solo si no se registró reseña)
 *
 * Uso: desde el panel admin o un script, llamar requestReview()
 * con el cliente recién entregado. La tabla review_requests lleva
 * el historial (evita spamear al mismo cliente).
 */

import { query, initDb } from "../db";
import { sendEmail } from "../mail";
import { reviewRequestEmail } from "./templates";

export interface ReviewRequestInput {
  clientName: string;
  clientEmail: string;
  project: string;
  /** Días post-entrega: 3 o 10 */
  day?: number;
}

export async function requestReview(input: ReviewRequestInput): Promise<{ id: number; status: string }> {
  await initDb();

  // No repetir la misma combinación cliente+day
  const existing = await query(
    `SELECT id FROM review_requests WHERE client_email = $1 AND day = $2 AND status != 'failed'`,
    [input.clientEmail, input.day ?? 3]
  );
  if (existing.rows.length > 0) {
    return { id: Number(existing.rows[0].id), status: "skipped-duplicate" };
  }

  const day = input.day ?? 3;
  const inserted = await query(
    `INSERT INTO review_requests (client_name, client_email, project, day, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
    [input.clientName, input.clientEmail, input.project, day]
  );
  const id = Number(inserted.rows[0].id);

  try {
    await sendEmail({
      to: input.clientEmail,
      subject: day === 10 ? `¿Ya nos ayudaste con una reseña? — Mtsprz` : `¿Nos ayudas con una reseña? — Mtsprz`,
      html: reviewRequestEmail(input.clientName, input.project, day),
    });
    await query(`UPDATE review_requests SET status = 'sent', sent_at = NOW() WHERE id = $1`, [id]);
    return { id, status: "sent" };
  } catch (err) {
    console.error(`[Review] Fallo email a ${input.clientEmail}:`, err);
    await query(`UPDATE review_requests SET status = 'failed' WHERE id = $1`, [id]);
    return { id, status: "failed" };
  }
}
