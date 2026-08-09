-- Cotizar VARIOS sistemas y varios retoques en una misma cotización.
-- Correr una vez en el SQL Editor de Supabase. Es idempotente.
--
-- Las columnas viejas (system_name, system_price, system_nails, y sus
-- equivalentes de retoque) NO se borran: pasan a ser el espejo de la lista
-- —nombres unidos con " + ", suma de precios, suma de uñas— para que sigan
-- funcionando el buscador de cotizaciones, la columna "Sistema" del dashboard
-- y el RPC cliente_detalle_stats sin tocarlos.

-- 1. Las listas. Mismo patrón que additional_items / design_items:
--    [{ id, name, nails_count, unit_price, full_price, total, comment }]
--    unit_price = precio por uña, full_price = precio de mano completa,
--    total = lo que efectivamente se cobró (snapshot al momento de cotizar).
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS system_items  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retoque_items JSONB DEFAULT '[]'::jsonb;

-- 2. Con varios sistemas, la suma de uñas puede pasar de 10 (manos + pies, o
--    una clienta que combina). El CHECK viejo tope 10 haría fallar el INSERT,
--    así que se reemplaza por uno más ancho. El nombre del constraint depende
--    de cómo se creó la columna, así que se buscan por definición.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.quotes'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ~ '(system_nails|retoque_nails)'
  LOOP
    EXECUTE format('ALTER TABLE public.quotes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_system_nails_check
    CHECK (system_nails IS NULL OR system_nails BETWEEN 1 AND 100),
  ADD CONSTRAINT quotes_retoque_nails_check
    CHECK (retoque_nails IS NULL OR retoque_nails BETWEEN 1 AND 100);

-- 3. Backfill: las cotizaciones ya guardadas pasan a tener su sistema único
--    dentro de la lista, así la app las lee por el mismo camino que las nuevas.
--    Solo toca las que todavía tienen la lista vacía, por eso se puede re-correr.
UPDATE public.quotes q
SET system_items = jsonb_build_array(jsonb_build_object(
      'id', 'legacy',
      'name', q.system_name,
      'nails_count', COALESCE(q.system_nails, 10),
      'unit_price', ROUND(q.system_price / GREATEST(COALESCE(q.system_nails, 10), 1), 2),
      'full_price', q.system_price,
      'total', q.system_price,
      'comment', NULL
    ))
WHERE q.system_name IS NOT NULL
  AND COALESCE(jsonb_array_length(q.system_items), 0) = 0;

UPDATE public.quotes q
SET retoque_items = jsonb_build_array(jsonb_build_object(
      'id', 'legacy',
      'name', q.retoque_name,
      'nails_count', COALESCE(q.retoque_nails, 10),
      'unit_price', ROUND(q.retoque_price / GREATEST(COALESCE(q.retoque_nails, 10), 1), 2),
      'full_price', q.retoque_price,
      'total', q.retoque_price,
      'comment', NULL
    ))
WHERE q.retoque_name IS NOT NULL
  AND COALESCE(jsonb_array_length(q.retoque_items), 0) = 0;
