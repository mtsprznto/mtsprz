-- Migration 013: Add Blast-Up contract fields (single-period engagement model)
-- Tope de horas, contraparte técnica, pagaré, rondas revisión

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS hour_cap INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extra_hour_rate INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_tech_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_tech_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS revision_rounds INT DEFAULT 2;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS include_pagare BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_date DATE;
