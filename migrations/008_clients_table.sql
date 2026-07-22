-- Migration 008: Standalone clients table for quick-select in contract form
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  rut VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  nationality VARCHAR(100) DEFAULT 'Chilena',
  profession VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_rut ON clients (rut);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
