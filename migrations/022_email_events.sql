-- 022 — Email events: tracking de aperturas, clics y bounces vía Resend webhooks

CREATE TABLE IF NOT EXISTS email_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,   -- delivered, opened, clicked, bounced, complained
  email VARCHAR(255) NOT NULL,
  message_id VARCHAR(255),           -- Resend message ID
  metadata JSONB DEFAULT '{}',       -- payload completo del webhook
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ee_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_ee_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ee_created ON email_events(created_at DESC);
