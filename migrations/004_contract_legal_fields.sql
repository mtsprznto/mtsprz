-- Migration 004: Agregar campos legales para contrato actualizado con 19 cláusulas
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_nationality VARCHAR(100) DEFAULT 'Chilena';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_profession VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);  -- 'contado' | '50_50' | 'hitos'
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS warranty_days INT DEFAULT 15;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS revision_days INT DEFAULT 5;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS acceptance_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS subcontracting_allowed BOOLEAN DEFAULT true;
