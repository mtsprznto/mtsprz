-- 015_widen_lead_source.sql
-- Amplía el CHECK de source en leads para aceptar google_maps y manual
-- (sincronización del prospector + creación manual desde admin)

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('whatsapp','web','contact','quote','google_maps','manual'));
