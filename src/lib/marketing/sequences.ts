/**
 * Marketing — Motor de secuencias de email (nurturing J4).
 *
 * Modelo: `lead_sequences` con `step` + `next_step_at`.
 * - Un lead descarga un magnet → scheduleSequence(email, "lm-2026")
 * - Un cron (Vercel) llama processDueSequences() 1-2×/día
 * - Pasos vencidos se envían en orden; secuencia completa → status 'done'
 *
 * Escalabilidad: función pura y simple; si el volumen crece, migrar a
 * un job manager (Trigger.dev/QStash) sin cambiar la API de esta lib.
 */

import { query, initDb } from "../db";
import { sendEmail } from "../mail";
import { sequenceEmail } from "./templates";

export const SEQUENCE_STEPS = [
  { step: 1, label: "dia-3-caso", delayMs: 3 * 24 * 3600_000 },
  { step: 2, label: "dia-7-tips", delayMs: 7 * 24 * 3600_000 },
  { step: 3, label: "dia-14-cta", delayMs: 14 * 24 * 3600_000 },
];

/** Programa (o reprograma) una secuencia para un email. Idempotente por (email, sequence_id). */
export async function scheduleSequence(email: string, sequenceId = "lm-2026"): Promise<void> {
  await initDb();
  await query(
    `INSERT INTO lead_sequences (email, sequence_id, step, next_step_at)
     VALUES ($1, $2, 1, NOW() + interval '3 days')
     ON CONFLICT (email, sequence_id) DO UPDATE SET status = 'active'`,
    [email, sequenceId]
  );
}

/** Procesa todos los pasos vencidos. Devuelve cuántos emails se enviaron. */
export async function processDueSequences(): Promise<number> {
  await initDb();
  const due = await query(
    `SELECT id, email, sequence_id, step FROM lead_sequences
     WHERE status = 'active' AND next_step_at <= NOW()
     ORDER BY next_step_at ASC
     LIMIT 200`
  );

  let sent = 0;
  for (const row of due.rows as { id: number; email: string; sequence_id: string; step: number }[]) {
    const stepDef = SEQUENCE_STEPS.find((s) => s.step === row.step);
    if (!stepDef) {
      // Paso inexistente → terminar secuencia
      await query(`UPDATE lead_sequences SET status = 'done' WHERE id = $1`, [row.id]);
      continue;
    }

    const name = row.email.split("@")[0];
    try {
      await sendEmail({
        to: row.email,
        subject: ["Un caso real que hicimos en el sur", "3 cosas que tu competencia no hace (aún)", "Último paso: tu diagnóstico gratis"][stepDef.step - 1],
        html: sequenceEmail(stepDef.step, name),
      });

      const next = SEQUENCE_STEPS.find((s) => s.step === row.step + 1);
      if (next) {
        await query(
          `UPDATE lead_sequences SET step = $2, next_step_at = NOW() + ($3 || ' seconds')::interval, last_sent_at = NOW() WHERE id = $1`,
          [row.id, next.step, next.delayMs / 1000]
        );
      } else {
        await query(`UPDATE lead_sequences SET status = 'done', last_sent_at = NOW() WHERE id = $1`, [row.id]);
      }
      sent++;
    } catch (err) {
      console.error(`[Sequence] Fallo email step ${row.step} para ${row.email}:`, err);
      // No actualizamos next_step_at → reintento en el siguiente cron
    }
  }
  return sent;
}
