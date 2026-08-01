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
