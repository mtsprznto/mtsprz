-- 021 — Marketing fixes: dedupe descargas + unsubscribe + manejo de fallos
-- M3: lead_magnet_downloads sin UNIQUE(email, magnet_id) → descargas duplicadas.
-- M2/A3: lead_sequences sin unsubscribe_token ni fail_count → sin baja (Ley 21.719) ni reintentos.

-- 1. Dedupe: elimina duplicados de descargas (conserva el registro más reciente)
DELETE FROM lead_magnet_downloads a
USING lead_magnet_downloads b
WHERE a.email = b.email
  AND a.magnet_id = b.magnet_id
  AND a.id < b.id;

-- 2. Unicidad real: un email solo puede descargar cada magnet una vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_lm_email_magnet ON lead_magnet_downloads(email, magnet_id);

-- 3. Token único de baja por secuencia (se regenera al reprogramar)
ALTER TABLE lead_sequences ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;
CREATE INDEX IF NOT EXISTS idx_seq_unsub_token ON lead_sequences(unsubscribe_token);

-- 4. Contador de fallos de envío (reintentos + auto-pausa después de N fallos)
ALTER TABLE lead_sequences ADD COLUMN IF NOT EXISTS fail_count INTEGER NOT NULL DEFAULT 0;

-- 5. Backfill: tokens para secuencias existentes (Postgres 13+ tiene gen_random_uuid nativo)
UPDATE lead_sequences SET unsubscribe_token = gen_random_uuid()::text WHERE unsubscribe_token IS NULL;
