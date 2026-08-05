-- 020 — Marketing: lead magnets + secuencias de email + solicitudes de reseña
-- Implementa jugadas J1 (reseñas), J3 (GEO), J4 (funnel) del plan de marketing 2026.

-- Descargas de lead magnets (captura de email para funnel)
CREATE TABLE IF NOT EXISTS lead_magnet_downloads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  magnet_id VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lm_email ON lead_magnet_downloads(email);

-- Secuencias de email (lead nurturing): LM → día 3 caso → día 7 tip → día 14 CTA
CREATE TABLE IF NOT EXISTS lead_sequences (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  sequence_id VARCHAR(50) NOT NULL DEFAULT 'lm-2026',
  step INTEGER NOT NULL DEFAULT 0,
  next_step_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (email, sequence_id)
);
CREATE INDEX IF NOT EXISTS idx_seq_due ON lead_sequences(status, next_step_at);

-- Solicitudes de reseña Google (J1): día 3 y día 10 post-proyecto
CREATE TABLE IF NOT EXISTS review_requests (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  project VARCHAR(255),
  day INTEGER NOT NULL DEFAULT 3,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
