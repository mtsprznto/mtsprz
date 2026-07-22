-- Migration 007: Add legal identification fields per senior lawyer review
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS prestador_nombre_civil VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_representante TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_notif_email VARCHAR(255);
