-- Limpieza del catálogo predeterminado.
--
-- Diagnóstico previo (ver scripts/diagnostico-catalog-templates.sql):
--   * public.catalog_templates existe en la DB pero NO en el repo. No tiene
--     tenant_id: es un catálogo maestro global, pensado para copiarse.
--   * El único trigger relevante es on_auth_user_created -> handle_new_user,
--     que solo crea tenant + profile. No siembra catálogo.
--   * Un solo tenant, con 127 ítems en catalog_items.
--
-- Conclusión: las filas se insertaron una vez a mano. Nada las regenera.
--
-- Correr por PASOS en el SQL Editor de Supabase. No correr el archivo entero.


-- =========================================================
-- PASO 1 — Confirmar (solo lectura). Correr esto primero.
-- =========================================================

-- 1a. Re-chequeo robusto de la consulta 4. Usa prosrc en vez de
--     pg_get_functiondef(), que revienta si hay funciones de agregado.
--     Si esto devuelve 0 filas, se confirma que ninguna función siembra.
SELECT p.proname AS funcion, p.prosrc AS cuerpo
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.prosrc ILIKE '%catalog_items%' OR p.prosrc ILIKE '%catalog_templates%')
ORDER BY p.proname;

-- 1b. ¿Cuántas filas tiene la plantilla y cuántas el catálogo real?
--     Si los conteos por kind coinciden, confirma que fue una copia.
SELECT 'template' AS origen, kind, COUNT(*) AS items
FROM public.catalog_templates GROUP BY kind
UNION ALL
SELECT 'items', kind, COUNT(*)
FROM public.catalog_items GROUP BY kind
ORDER BY kind, origen;

-- 1c. ¿Los nombres del catálogo salieron de la plantilla?
SELECT
  (SELECT COUNT(*) FROM public.catalog_items)      AS total_items,
  (SELECT COUNT(*) FROM public.catalog_templates)  AS total_template,
  (SELECT COUNT(*)
     FROM public.catalog_items ci
     JOIN public.catalog_templates ct
       ON ct.kind = ci.kind AND lower(ct.name) = lower(ci.name)) AS coinciden;

-- 1d. ¿Se insertaron todas de golpe? Si min y max están a segundos,
--     fue un INSERT único y no carga manual de la alumna.
SELECT MIN(created_at) AS primera, MAX(created_at) AS ultima, COUNT(*) AS filas
FROM public.catalog_items;


-- =========================================================
-- PASO 2 — Limpiar. Correr solo si el PASO 1 confirmó lo de arriba.
-- =========================================================

-- Vacía el catálogo de TODOS los tenants. Hoy solo existe uno.
-- En el SQL Editor corres como owner, así que RLS no aplica.
-- DELETE FROM public.catalog_items;


-- =========================================================
-- PASO 3 — Opcional: eliminar la plantilla maestra.
-- =========================================================

-- catalog_templates no la usa ni la app ni ninguna función ni ningún
-- trigger. Mientras exista, alguien puede volver a copiarla por error.
-- Descomentar solo si no la quieres conservar para un futuro
-- feature de "plantilla sugerida".
-- DROP TABLE public.catalog_templates;
