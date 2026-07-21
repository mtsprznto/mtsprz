CREATE TABLE IF NOT EXISTS verified_emails (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  verified_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  services JSONB NOT NULL,
  total INT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(512) NOT NULL,
  name VARCHAR(255) NOT NULL,
  rut VARCHAR(20),
  phone VARCHAR(50),
  role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'super_admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  content_json JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  template_id INT REFERENCES contract_templates(id),
  user_id INT REFERENCES users(id),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','pending','client_signed','completed','cancelled')),
  client_name VARCHAR(255) NOT NULL,
  client_rut VARCHAR(20),
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_address TEXT,
  company_name VARCHAR(255),
  services JSONB NOT NULL,
  total_amount INT NOT NULL,
  payment_terms TEXT,
  start_date DATE,
  end_date DATE,
  duration_months INT,
  schedule TEXT,
  special_clauses TEXT,
  admin_signature_data TEXT,
  admin_signed_at TIMESTAMP,
  client_signature_data TEXT,
  client_signed_at TIMESTAMP,
  pdf_url TEXT,
  pdf_hash VARCHAR(128),
  signing_token VARCHAR(100) UNIQUE,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS id_verifications (
  id SERIAL PRIMARY KEY,
  contract_id INT NOT NULL REFERENCES contracts(id),
  id_front_data TEXT,
  id_back_data TEXT,
  selfie_data TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signing_events (
  id SERIAL PRIMARY KEY,
  contract_id INT NOT NULL REFERENCES contracts(id),
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT NOT NULL,
  promo_price INT,
  category VARCHAR(100),
  deliverables JSONB DEFAULT '[]',
  includes_maintenance BOOLEAN DEFAULT false,
  maintenance_price INT DEFAULT 0,
  maintenance_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
