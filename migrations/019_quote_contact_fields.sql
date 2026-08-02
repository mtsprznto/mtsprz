-- A2: teléfono de contacto del solicitante (formato wa.me normalizado)
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
-- A3: descuento pack aplicado (CLP) — total en DB = total bruto, descuento explícito
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS discount INT NOT NULL DEFAULT 0;
