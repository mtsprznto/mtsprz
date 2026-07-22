-- Migration 010: Add notif_email and representante to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notif_email VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS representante TEXT;
