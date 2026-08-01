-- Migration 012: Add fields for boleta_honorarios contract type
-- Permite contratos de prestación de servicios a honorarios (persona natural)

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_type VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS net_amount INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS retention_rate NUMERIC(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gross_amount INT;

-- Backfill: populate template_type from contract_templates for existing contracts
UPDATE contracts c
SET template_type = t.type
FROM contract_templates t
WHERE c.template_id = t.id
  AND c.template_type IS NULL;
