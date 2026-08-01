/**
 * Lead DB operations — CRUD + conversation logging.
 */

import { query, initDb } from "./db";

export type LeadSource = "whatsapp" | "web" | "contact" | "quote" | "google_maps" | "manual";

export interface LeadRecord {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  service_interest: string | null;
  message: string | null;
  status: "new" | "contacted" | "qualified" | "lost";
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LeadInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  source: LeadSource;
  service_interest?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConversationRecord {
  id: number;
  lead_id: number;
  wa_message_id: string | null;
  direction: "incoming" | "outgoing";
  message_type: "text" | "image" | "document" | "audio" | "video";
  content: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/* ── Lead CRUD ── */

export async function createLead(input: LeadInput): Promise<LeadRecord> {
  await initDb();
  const result = await query(
    `INSERT INTO leads (name, phone, email, source, service_interest, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.name,
      input.phone || null,
      input.email || null,
      input.source,
      input.service_interest || null,
      input.message || null,
      input.metadata ? JSON.stringify(input.metadata) : "{}",
    ]
  );
  return result.rows[0] as unknown as LeadRecord;
}

export async function getLeadById(id: number): Promise<LeadRecord | null> {
  await initDb();
  const result = await query("SELECT * FROM leads WHERE id = $1", [id]);
  return (result.rows[0] as unknown as LeadRecord) || null;
}

export async function findLeadByPhone(phone: string): Promise<LeadRecord | null> {
  await initDb();
  const result = await query("SELECT * FROM leads WHERE phone = $1 ORDER BY created_at DESC LIMIT 1", [phone]);
  return (result.rows[0] as unknown as LeadRecord) || null;
}

export async function listLeads(options?: {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ leads: LeadRecord[]; total: number; stats?: Record<string, number> }> {
  await initDb();

  const conditions: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIdx = 1;

  if (options?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }
  if (options?.source) {
    conditions.push(`source = $${paramIdx++}`);
    params.push(options.source);
  }
  if (options?.search) {
    conditions.push(
      `(name ILIKE $${paramIdx} OR phone ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR message ILIKE $${paramIdx})`
    );
    params.push(`%${options.search}%`);
    paramIdx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query(`SELECT COUNT(*) as total FROM leads ${where}`, params);
  const total = Number(countResult.rows[0]?.total) || 0;

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const result = await query(
    `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  // Conteo por estado para los contadores del panel (sobre el total filtrado)
  const statusResult = await query(
    `SELECT status, COUNT(*) as cnt FROM leads ${where} GROUP BY status`,
    params
  );
  const stats: Record<string, number> = { new: 0, contacted: 0, qualified: 0, lost: 0 };
  for (const row of statusResult.rows as { status: string; cnt: string }[]) {
    if (row.status in stats) stats[row.status] = Number(row.cnt);
  }

  return { leads: result.rows as unknown as LeadRecord[], total, stats };
}

export async function updateLead(
  id: number,
  data: Partial<Pick<LeadRecord, "status" | "notes" | "service_interest" | "name" | "phone" | "email">>
): Promise<LeadRecord | null> {
  await initDb();

  const setClauses: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIdx++}`);
      params.push(value as string | number | boolean | null);
    }
  }

  if (setClauses.length === 0) return getLeadById(id);

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
    params
  );

  return (result.rows[0] as unknown as LeadRecord) || null;
}

/* ── WhatsApp Conversations ── */

export async function logConversation(entry: {
  lead_id: number;
  wa_message_id?: string | null;
  direction: "incoming" | "outgoing";
  message_type: "text" | "image" | "document" | "audio" | "video";
  content: string | null;
  status?: string;
}): Promise<ConversationRecord> {
  await initDb();
  const result = await query(
    `INSERT INTO whatsapp_conversations (lead_id, wa_message_id, direction, message_type, content, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      entry.lead_id,
      entry.wa_message_id || null,
      entry.direction,
      entry.message_type,
      entry.content,
      entry.status || "sent",
    ]
  );
  return result.rows[0] as unknown as ConversationRecord;
}

export async function getConversations(leadId: number): Promise<ConversationRecord[]> {
  await initDb();
  const result = await query(
    `SELECT * FROM whatsapp_conversations WHERE lead_id = $1 ORDER BY created_at ASC`,
    [leadId]
  );
  return result.rows as unknown as ConversationRecord[];
}

/** Busca una conversación por wa_message_id — para dedupe de webhooks. */
export async function findConversationByWaMessageId(waMessageId: string): Promise<ConversationRecord | null> {
  await initDb();
  const result = await query(
    `SELECT * FROM whatsapp_conversations WHERE wa_message_id = $1 LIMIT 1`,
    [waMessageId]
  );
  return (result.rows[0] as unknown as ConversationRecord) || null;
}

/** Actualiza el estado de entrega de un mensaje (eventos message.ack de WAHA). */
export async function updateConversationStatus(waMessageId: string, status: string): Promise<ConversationRecord | null> {
  await initDb();
  const result = await query(
    `UPDATE whatsapp_conversations SET status = $2, updated_at = NOW() WHERE wa_message_id = $1 RETURNING *`,
    [waMessageId, status]
  );
  return (result.rows[0] as unknown as ConversationRecord) || null;
}
