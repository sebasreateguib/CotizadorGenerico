-- Arreglo: "new row violates row-level security policy for table catalog_items"
--
-- Causa probable: la app inserta SIN tenant_id (CatalogEditor.tsx:71) porque
-- confía en el DEFAULT de supabase-schema-students.sql:222
--
--   ALTER TABLE public.catalog_items ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();
--
-- Si ese ALTER no está aplicado, tenant_id entra NULL y la policy de INSERT
-- (WITH CHECK tenant_id = auth_tenant_id()) rechaza la fila.
--
-- Correr por PASOS en el SQL Editor de Supabase.


-- =========================================================
-- PASO 1 — Confirmar (solo lectura).
-- =========================================================

-- 1a. LA CONSULTA CLAVE. Mirar la fila "tenant_id":
--     column_default debe decir  auth_tenant_id()
--     Si dice NULL, ese es el bug.
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'catalog_items'
ORDER BY ordinal_position;

-- 1b. Las tres tablas dependen del mismo default. Ver si falta en todas.
SELECT c.relname AS tabla, a.attname AS columna,
       pg_get_expr(d.adbin, d.adrelid) AS default_actual
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'public'
  AND c.relname IN ('catalog_items', 'clients', 'quotes')
  AND a.attname = 'tenant_id';

-- 1c. Policies vigentes sobre catalog_items.
SELECT policyname, cmd, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'catalog_items';

-- 1d. Descartar la otra causa posible: auth_tenant_id() devuelve NULL si el
--     tenant no está 'activo'. status debe decir 'activo'.
SELECT id, name, status FROM public.tenants;

-- 1e. ¿Existe la función?
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'auth_tenant_id';


-- =========================================================
-- PASO 2 — Arreglo puntual. Si 1a mostró column_default NULL.
-- =========================================================

-- ALTER TABLE public.catalog_items ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();
-- ALTER TABLE public.clients       ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();
-- ALTER TABLE public.quotes        ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();


-- =========================================================
-- PASO 3 — Arreglo de fondo (recomendado).
-- =========================================================
--
-- El PASO 2 tapa este síntoma, pero la DB tiene más deriva respecto del repo
-- (falta catalogo_progreso(), sobra catalog_templates). supabase-schema-students.sql
-- está escrito para poder re-correrse entero: usa CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION y DROP POLICY IF EXISTS antes de cada CREATE POLICY.
--
-- Recomendación: pegar el archivo completo en el SQL Editor y correrlo. No borra
-- datos ni toca catalog_templates; solo realinea funciones, defaults y policies.
--
-- Ojo: CREATE TABLE IF NOT EXISTS no corrige columnas que ya existan con otra
-- forma. Si el PASO 1a muestra columnas distintas de las del repo (líneas 82-104),
-- avisar antes de correrlo.
