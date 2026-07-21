-- Migration 006: Add prestador_rut to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS prestador_rut VARCHAR(20);
