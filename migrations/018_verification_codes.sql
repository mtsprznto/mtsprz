-- 018_verification_codes
-- Persist OTP codes in NeonDB instead of in-memory Map (Vercel serverless
-- multi-instance: in-memory codes were lost between instances / cold starts).
-- Codes stored as SHA-256 hex hash (never plaintext), one active code per email.

CREATE TABLE IF NOT EXISTS verification_codes (
  email VARCHAR(255) PRIMARY KEY,
  code_hash VARCHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);
