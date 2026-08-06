import { neon } from "@neondatabase/serverless";

// Migrations embebidas · no usar fs.readdirSync (falla en Vercel serverless)
const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "001_initial",
    sql: `
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
)`,
  },
  {
    name: "002_add_signing_token",
    sql: `
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token VARCHAR(100) UNIQUE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP`,
  },
  {
    name: "003_biometric_verification",
    sql: `
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS face_match_score FLOAT;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS liveness_passed BOOLEAN DEFAULT false;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS rut_valid BOOLEAN DEFAULT false;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS mrz_valid BOOLEAN DEFAULT false;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending','passed','failed'))`,
  },
  {
    name: "004_contract_legal_fields",
    sql: `
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration_months INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_clauses TEXT`,
  },
  {
    name: "005_add_service_fields",
    sql: `
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_monthly BOOLEAN DEFAULT false`,
  },
  {
    name: "006_clients",
    sql: `
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
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(name,'') || ' ' || coalesce(company_name,'') || ' ' || coalesce(rut,'') || ' ' || coalesce(email,''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING GIN(search_vector)`,
  },
  {
    name: "012_add_honorarios_fields",
    sql: `
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_type VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS net_amount INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS retention_rate NUMERIC(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gross_amount INT`,
  },
  {
    name: "014_lead_management",
    sql: `
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  source VARCHAR(50) NOT NULL DEFAULT 'web'
    CHECK (source IN ('whatsapp','web','contact','quote')),
  service_interest VARCHAR(255),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','lost')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id SERIAL PRIMARY KEY,
  lead_id INT REFERENCES leads(id),
  wa_message_id VARCHAR(255),
  direction VARCHAR(10) NOT NULL
    CHECK (direction IN ('incoming','outgoing')),
  message_type VARCHAR(20) NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text','image','document','audio','video')),
  content TEXT,
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_wa_conv_lead ON whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_wa_msg ON whatsapp_conversations(wa_message_id);
`,
  },
  {
    name: "015_widen_lead_source",
    sql: `
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('whatsapp','web','contact','quote','google_maps','manual'));
`,
  },
  {
    name: "016_normalize_lead_phone",
    sql: `
UPDATE leads
SET phone = CASE
  WHEN regexp_replace(phone, '\\D', '', 'g') = '' THEN NULL
  WHEN regexp_replace(phone, '\\D', '', 'g') ~ '^9\\d{8}$'
    THEN '56' || regexp_replace(phone, '\\D', '', 'g')
  ELSE regexp_replace(phone, '\\D', '', 'g')
END
WHERE phone IS NOT NULL AND phone <> '';
`,
  },
  {
    name: "017_wa_conversations_ack",
    sql: `
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
DELETE FROM whatsapp_conversations a
USING whatsapp_conversations b
WHERE a.id > b.id AND a.wa_message_id = b.wa_message_id AND b.wa_message_id IS NOT NULL;
DROP INDEX IF EXISTS idx_wa_conv_wa_msg;
CREATE UNIQUE INDEX idx_wa_conv_wa_msg ON whatsapp_conversations(wa_message_id) WHERE wa_message_id IS NOT NULL;
`,
  },
  {
    name: "018_verification_codes",
    sql: `
CREATE TABLE IF NOT EXISTS verification_codes (
  email VARCHAR(255) PRIMARY KEY,
  code_hash VARCHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);
`,
  },
  {
    name: "019_quote_contact_fields",
    sql: `
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS discount INT NOT NULL DEFAULT 0;
`,
  },
];

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    const url = import.meta.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no configurada");
    _sql = neon(url);
  }
  return _sql;
}

async function exec(sql: string, params?: (string | number | boolean | null)[]) {
  const rows = await getSql().query(sql, params ?? []);
  return rows as Record<string, unknown>[];
}

export async function runMigrations(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
  )`);

  const applied = await exec("SELECT name FROM _migrations ORDER BY name");
  const appliedSet = new Set(applied.map((r) => r.name as string));

  const pending = MIGRATIONS.filter((m) => !appliedSet.has(m.name));
  if (pending.length === 0) return;

  for (const m of pending) {
    console.log(`[Migrate] Applying ${m.name}...`);
    const statements = m.sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await exec(stmt);
    }

    await exec("INSERT INTO _migrations (name) VALUES ($1)", [m.name]);
    console.log(`[Migrate] ✓ ${m.name}`);
  }
}
