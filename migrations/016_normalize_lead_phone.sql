-- 016: Normalizar teléfonos de leads (formato wa.me: solo dígitos, con 56)
-- "+56 9 9844 1444" → "56998441444" ; "9 9844 1444" → "56998441444"
UPDATE leads
SET phone = CASE
  WHEN regexp_replace(phone, '\D', '', 'g') = '' THEN NULL
  WHEN regexp_replace(phone, '\D', '', 'g') ~ '^9\d{8}$'
    THEN '56' || regexp_replace(phone, '\D', '', 'g')
  ELSE regexp_replace(phone, '\D', '', 'g')
END
WHERE phone IS NOT NULL AND phone <> '';
