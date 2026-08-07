-- Diagnóstico: ¿de dónde salen los ítems "predeterminados" de catalog_items?
-- Solo lectura. Correr en el SQL Editor de Supabase.
--
-- Contexto: la DB tiene una tabla public.catalog_templates que NO existe en
-- supabase-schema-students.sql, así que la DB derivó del schema del repo.
-- Estas consultas identifican qué la llena y qué la copia a catalog_items.

-- 1. ¿Qué hay en catalog_templates y cuánto?
SELECT kind, COUNT(*) AS items
FROM public.catalog_templates
GROUP BY kind
ORDER BY kind;

-- 2. Estructura de la tabla (para saber si es global o por-tenant).
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'catalog_templates'
ORDER BY ordinal_position;

-- 3. TODOS los triggers sobre tenants, profiles, catalog_items y auth.users.
--    Acá debería aparecer el que siembra el catálogo.
SELECT
  c.relname   AS tabla,
  t.tgname    AS trigger,
  p.proname   AS funcion,
  pg_get_triggerdef(t.oid) AS definicion
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc  p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND (
    (n.nspname = 'public' AND c.relname IN ('tenants', 'profiles', 'catalog_items'))
    OR (n.nspname = 'auth' AND c.relname = 'users')
  )
ORDER BY c.relname, t.tgname;

-- 4. Cuerpo de toda función que mencione catalog_items o catalog_templates.
--    Esto revela el INSERT que siembra, viva donde viva.
SELECT p.proname AS funcion, pg_get_functiondef(p.oid) AS cuerpo
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (pg_get_functiondef(p.oid) ILIKE '%catalog_items%'
       OR pg_get_functiondef(p.oid) ILIKE '%catalog_templates%')
ORDER BY p.proname;

-- 5. ¿Cuántos ítems tiene cada tenant hoy? Si todos tienen el mismo conteo,
--    confirma que se sembraron automáticamente y no a mano.
SELECT t.id, t.name, t.created_at, COUNT(ci.id) AS items_catalogo
FROM public.tenants t
LEFT JOIN public.catalog_items ci ON ci.tenant_id = t.id
GROUP BY t.id, t.name, t.created_at
ORDER BY t.created_at;
