-- Migration 011: deduplicate clients and add unique constraint on email

-- Eliminar filas duplicadas: conservar la más reciente por email
DELETE FROM clients
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(email))) id
  FROM clients
  WHERE email IS NOT NULL AND is_active = true
  ORDER BY LOWER(TRIM(email)), created_at DESC
)
AND email IS NOT NULL;

-- Unique index parcial sobre email (solo filas activas con email no nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_unique
  ON clients (LOWER(TRIM(email)))
  WHERE email IS NOT NULL AND is_active = true;
