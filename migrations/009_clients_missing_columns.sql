-- Migration 009: Add missing columns to clients table (is_active, search_vector)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish',
      coalesce(name, '') || ' ' ||
      coalesce(company_name, '') || ' ' ||
      coalesce(rut, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(profession, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients (is_active);
CREATE INDEX IF NOT EXISTS idx_clients_search_vector ON clients USING gin(search_vector);
