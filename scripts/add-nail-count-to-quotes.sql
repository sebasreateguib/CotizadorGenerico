-- Cobrar sistemas y retoques por uña.
-- Correr una vez en el SQL Editor de Supabase. Es idempotente.
--
-- Default 10 = mano completa, así que las cotizaciones ya guardadas quedan
-- exactamente como estaban.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS system_nails  INTEGER DEFAULT 10 CHECK (system_nails  BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS retoque_nails INTEGER DEFAULT 10 CHECK (retoque_nails BETWEEN 1 AND 10);
