-- =============================================================================
-- VK STUDIO STUDENTS — Schema multi-tenant (Supabase)
-- =============================================================================
-- Correr este SQL COMPLETO en el editor SQL del proyecto Supabase NUEVO
-- (no en el de VK Studio). Es idempotente: se puede volver a correr entero, y
-- correrlo sobre una DB que derivó a mano la devuelve al estado de este archivo.
--
-- Modelo:
--   1 alumna = 1 tenant aislado. Cada alumna carga SU PROPIO tarifario desde
--   cero (no hay precios ni diseños predeterminados), y tiene sus propias
--   clientas y cotizaciones. Nadie ve lo de nadie.
--   El super admin (VK Students) ve la lista de alumnas y su actividad
--   NUNCA el detalle de sus cotizaciones.
--
-- Aislamiento: todo se filtra por tenant_id vía RLS, usando el helper
--   public.auth_tenant_id(). Ese helper devuelve NULL si el tenant está
--   suspendido, así que suspender una cuenta corta el acceso a los datos
--   a nivel de base de datos, no solo en la UI.
-- =============================================================================


-- =========================================
-- 0. Limpieza de deriva (idempotente)
-- =========================================
-- En una base nueva esto no hace nada. Existe porque la primera DB de Students
-- derivó de este archivo: le habían agregado a mano una tabla
-- public.catalog_templates (un tarifario maestro global) y siembra que la
-- copiaba al catálogo de cada alumna nueva. Eso contradice la decisión de
-- producto —cada alumna carga su tarifario DESDE CERO— y además terminó
-- rompiendo el alta de usuarios: al borrar la tabla, la siembra seguía
-- referenciándola, el INSERT en auth.users se abortaba entero y el dashboard
-- devolvía "Failed to create user" (500 en /auth/v1/admin/users).
--
-- Va primero para que re-correr este archivo sobre una DB derivada la deje
-- igual a una recién creada.

-- Todo trigger cuya función mencione catalog_templates es siembra: fuera.
-- handle_new_user se excluye a propósito: no se borra, se reemplaza más abajo
-- (sección 7) por la versión correcta, que no siembra nada.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS esquema, c.relname AS tabla, t.tgname AS disparador
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND p.prosrc ILIKE '%catalog_templates%'
      AND p.proname <> 'handle_new_user'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.disparador, r.esquema, r.tabla);
    RAISE NOTICE 'Trigger de siembra eliminado: % sobre %.%', r.disparador, r.esquema, r.tabla;
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.catalog_templates;


-- =========================================
-- 1. Tenants (el "estudio" de cada alumna)
-- =========================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  -- Marca de la alumna: es lo que sale en la cotización y en el PDF.
  name TEXT NOT NULL DEFAULT 'Mi estudio',
  logo_url TEXT,
  phone TEXT,
  instagram TEXT,
  policies_text TEXT,
  -- Configuración de cálculo (equivale a lo que hoy está hardcodeado)
  currency TEXT NOT NULL DEFAULT 'PEN',
  igv_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  -- Extra de largo: incluido hasta N.° X, y desde ahí +S/ Y por cada nivel.
  -- Arranca en 0 (no cobra nada) hasta que la alumna defina su regla.
  nail_size_free_up_to INTEGER NOT NULL DEFAULT 3,
  nail_size_step_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Kill switch del super admin.
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'suspendido')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);


-- =========================================
-- 2. Profiles (extiende auth.users)
-- =========================================
-- role es el rol de PLATAFORMA, no un rol dentro del estudio:
--   'alumna'     -> dueña de su tenant
--   'superadmin' -> VK Students; tenant_id = NULL, no cotiza
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'alumna' CHECK (role IN ('alumna', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);


-- =========================================
-- 3. Catálogo
-- =========================================
-- NO hay tarifario predeterminado: cada alumna arranca con el catálogo VACÍO
-- y carga sus propios sistemas, diseños y precios. Nada se siembra en el
-- signup y no existe una plantilla global.
--
-- Un solo modelo para todas las listas de precios, discriminado por "kind".
-- Así el CRUD y la UI son uno solo en vez de 10 tablas casi iguales.
--
-- "kind" sí es fijo: son las secciones que tiene el formulario de cotización.
-- Lo que la alumna define es el CONTENIDO de cada sección, no las secciones.
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'sistema', 'retoque', 'retoque_semana', 'adicional', 'cambio_tamanio',
    'cambio_punta', 'pedreria', 'diseno', 'prep', 'kapping'
  )),
  name TEXT NOT NULL,
  -- Categoría libre: la escribe la alumna ("Extensiones", "Cat eye"...).
  -- La UI puede sugerir las que ya usó, pero no hay lista cerrada.
  category TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_nail DECIMAL(10,2) NOT NULL DEFAULT 0,
  per_nail BOOLEAN NOT NULL DEFAULT FALSE,
  duration TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- En vez de borrar, se desactiva: las cotizaciones viejas guardan el precio
  -- como snapshot, pero el ítem sigue existiendo para el historial.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_kind
  ON public.catalog_items(tenant_id, kind, sort_order);
-- Evita que la alumna cargue dos veces el mismo servicio en la misma sección.
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_items_tenant_name
  ON public.catalog_items(tenant_id, kind, lower(name));


-- =========================================
-- 4. Clientas
-- =========================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  frequency TEXT DEFAULT 'nueva' CHECK (frequency IN ('nueva', 'frecuente')),
  last_visit DATE,
  responsible TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================
-- 5. Cotizaciones
-- =========================================
-- Los precios se guardan como snapshot (system_price, unit_price de cada ítem,
-- etc.): si mañana la alumna sube sus precios, las cotizaciones viejas no
-- cambian de monto.
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible TEXT,
  -- Una cotización puede llevar VARIOS sistemas y varios retoques (por ejemplo
  -- soft gel en una mano y acrílico en la otra). La lista manda; las columnas
  -- planas de al lado son su espejo —nombres unidos con " + ", suma de precios,
  -- suma de uñas— para el buscador, los listados y cliente_detalle_stats.
  -- [{ id, name, nails_count, unit_price, full_price, total, comment }]
  system_items JSONB DEFAULT '[]'::jsonb,
  retoque_items JSONB DEFAULT '[]'::jsonb,
  system_name TEXT,
  system_price DECIMAL(10,2) DEFAULT 0,
  -- Cuántas uñas se cobraron entre todos los sistemas / retoques. Puede pasar
  -- de 10 cuando se combinan servicios (manos + pies).
  system_nails INTEGER DEFAULT 10 CHECK (system_nails BETWEEN 1 AND 100),
  retoque_name TEXT,
  retoque_price DECIMAL(10,2) DEFAULT 0,
  retoque_nails INTEGER DEFAULT 10 CHECK (retoque_nails BETWEEN 1 AND 100),
  retoque_weeks_extra DECIMAL(10,2) DEFAULT 0,
  nail_number INTEGER DEFAULT 1,
  nail_size_extra DECIMAL(10,2) DEFAULT 0,
  kapping_extra DECIMAL(10,2) DEFAULT 0,
  size_change_label TEXT,
  size_change_price DECIMAL(10,2) DEFAULT 0,
  tip_change_label TEXT,
  tip_change_price DECIMAL(10,2) DEFAULT 0,
  prep_type TEXT,
  prep_price DECIMAL(10,2) DEFAULT 0,
  nail_type TEXT,
  nail_layer TEXT,
  nail_condition TEXT,
  -- Ficha de diagnóstico (informativos, no afectan el precio)
  nail_curvature TEXT,
  nail_plate_status TEXT,
  skin_type TEXT,
  nail_moisture TEXT,
  previous_product TEXT,
  product_condition TEXT,
  -- Ficha de servicio técnico (informativos, no afectan el precio)
  primer_type TEXT,
  base_type TEXT,
  service_type TEXT,
  nail_system_material TEXT,
  technique_type TEXT,
  nail_shape TEXT,
  nail_length TEXT,
  next_maintenance_date DATE,
  technical_notes TEXT,
  additional_items JSONB DEFAULT '[]'::jsonb,
  design_items JSONB DEFAULT '[]'::jsonb,
  jewelry_items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) DEFAULT 0,
  igv_rate DECIMAL(5,4) DEFAULT 0,
  igv_amount DECIMAL(10,2) DEFAULT 0,
  total_with_igv DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  client_type TEXT DEFAULT 'nueva' CHECK (client_type IN ('nueva', 'frecuente')),
  share_policies BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'confirmada', 'pagada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================
-- 6. Helpers de RLS
-- =========================================
-- SECURITY DEFINER a propósito: si una policy sobre "profiles" hiciera un
-- SELECT directo a "profiles", Postgres entra en recursión infinita y falla
-- la consulta entera. Estas funciones saltan RLS y cortan el bucle.

-- Tenant de la sesión actual. Devuelve NULL si la cuenta está suspendida,
-- así que TODAS las policies que lo usan fallan cerradas.
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id
  FROM public.profiles p
  JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.id = auth.uid() AND t.status = 'activo';
$$;

-- El tenant_id se rellena solo con el estudio de quien inserta. Así la app
-- nunca tiene que mandarlo (y no puede equivocarse): sigue haciendo
-- INSERT INTO quotes (client_name, ...) como siempre.
-- Va como ALTER y no dentro del CREATE TABLE porque la función tiene que
-- existir antes de poder usarla como DEFAULT.
ALTER TABLE public.quotes        ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();
ALTER TABLE public.clients       ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();
ALTER TABLE public.catalog_items ALTER COLUMN tenant_id SET DEFAULT public.auth_tenant_id();

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;


-- =========================================
-- 7. Alta de una alumna (signup)
-- =========================================

-- Quita tildes sin depender de la extensión "unaccent" (que en Supabase hay
-- que habilitar aparte). Cubre el español, que es lo único que necesitamos.
CREATE OR REPLACE FUNCTION public.unaccent_fallback(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(
    COALESCE(p_text, ''),
    'áéíóúàèìòùäëïöüâêîôûñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ',
    'aeiouaeiouaeiouaeiounAEIOUAEIOUAEIOUAEIOUN'
  );
$$;

-- Genera un slug único a partir del nombre/email.
CREATE OR REPLACE FUNCTION public.unique_tenant_slug(p_base TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base TEXT;
  v_slug TEXT;
  v_i INT := 1;
BEGIN
  v_base := regexp_replace(lower(unaccent_fallback(p_base)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  IF v_base = '' OR v_base IS NULL THEN
    v_base := 'estudio';
  END IF;
  v_base := trim(both '-' from left(v_base, 40));
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  END LOOP;
  RETURN v_slug;
END;
$$;

-- Al registrarse una alumna: se le crea su tenant y su perfil.
-- El catálogo queda VACÍO a propósito: ella carga sus propios precios.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_brand TEXT;
  v_tenant_id UUID;
BEGIN
  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
  v_brand := COALESCE(NULLIF(NEW.raw_user_meta_data->>'brand_name', ''), v_full_name);

  -- Nota: el rol NUNCA se lee de raw_user_meta_data (lo controla el cliente).
  -- Toda cuenta nueva nace como 'alumna'; a superadmin se promueve a mano.
  INSERT INTO public.tenants (owner_id, slug, name)
  VALUES (NEW.id, public.unique_tenant_slug(v_brand), v_brand)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, email, full_name, role)
  VALUES (NEW.id, v_tenant_id, NEW.email, v_full_name, 'alumna');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================
-- 8. RLS
-- =========================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Se hace DROP POLICY IF EXISTS antes de cada CREATE porque "CREATE POLICY"
-- no tiene IF NOT EXISTS, y este archivo debe poder re-correrse entero.

-- --- tenants -------------------------------------------------------------
-- Ojo: acá NO se usa auth_tenant_id(), se usa owner_id. Así una alumna
-- suspendida igual puede leer su tenant y la app le muestra el mensaje de
-- "cuenta suspendida" en vez de una pantalla vacía.
DROP POLICY IF EXISTS "Alumna ve su tenant" ON public.tenants;
CREATE POLICY "Alumna ve su tenant" ON public.tenants FOR SELECT
  USING (owner_id = auth.uid() OR public.is_superadmin());

-- La alumna edita su marca/config, pero no su propio "status" (eso es del
-- super admin: si no, se auto-reactiva).
DROP POLICY IF EXISTS "Alumna edita su tenant" ON public.tenants;
CREATE POLICY "Alumna edita su tenant" ON public.tenants FOR UPDATE
  USING (owner_id = auth.uid() AND status = 'activo')
  WITH CHECK (
    owner_id = auth.uid()
    AND status = (SELECT t.status FROM public.tenants t WHERE t.id = tenants.id)
  );

DROP POLICY IF EXISTS "Superadmin edita tenants" ON public.tenants;
CREATE POLICY "Superadmin edita tenants" ON public.tenants FOR UPDATE
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- --- profiles ------------------------------------------------------------
DROP POLICY IF EXISTS "Ve su propio perfil" ON public.profiles;
CREATE POLICY "Ve su propio perfil" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_superadmin());

-- WITH CHECK congela role y tenant_id: nadie se auto-promueve ni se cambia
-- de estudio desde el cliente.
DROP POLICY IF EXISTS "Edita su propio perfil" ON public.profiles;
CREATE POLICY "Edita su propio perfil" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND tenant_id IS NOT DISTINCT FROM (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- --- catalog_items -------------------------------------------------------
DROP POLICY IF EXISTS "Catálogo propio: ver" ON public.catalog_items;
CREATE POLICY "Catálogo propio: ver" ON public.catalog_items FOR SELECT
  USING (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Catálogo propio: crear" ON public.catalog_items;
CREATE POLICY "Catálogo propio: crear" ON public.catalog_items FOR INSERT
  WITH CHECK (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Catálogo propio: editar" ON public.catalog_items;
CREATE POLICY "Catálogo propio: editar" ON public.catalog_items FOR UPDATE
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Catálogo propio: borrar" ON public.catalog_items;
CREATE POLICY "Catálogo propio: borrar" ON public.catalog_items FOR DELETE
  USING (tenant_id = public.auth_tenant_id());

-- --- clients -------------------------------------------------------------
DROP POLICY IF EXISTS "Clientas propias: ver" ON public.clients;
CREATE POLICY "Clientas propias: ver" ON public.clients FOR SELECT
  USING (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Clientas propias: crear" ON public.clients;
CREATE POLICY "Clientas propias: crear" ON public.clients FOR INSERT
  WITH CHECK (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Clientas propias: editar" ON public.clients;
CREATE POLICY "Clientas propias: editar" ON public.clients FOR UPDATE
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Clientas propias: borrar" ON public.clients;
CREATE POLICY "Clientas propias: borrar" ON public.clients FOR DELETE
  USING (tenant_id = public.auth_tenant_id());

-- --- quotes --------------------------------------------------------------
-- No hay policy de superadmin acá a propósito: VK Students ve totales por
-- RPC, no las cotizaciones de cada alumna.
DROP POLICY IF EXISTS "Cotizaciones propias: ver" ON public.quotes;
CREATE POLICY "Cotizaciones propias: ver" ON public.quotes FOR SELECT
  USING (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Cotizaciones propias: crear" ON public.quotes;
CREATE POLICY "Cotizaciones propias: crear" ON public.quotes FOR INSERT
  WITH CHECK (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Cotizaciones propias: editar" ON public.quotes;
CREATE POLICY "Cotizaciones propias: editar" ON public.quotes FOR UPDATE
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());
DROP POLICY IF EXISTS "Cotizaciones propias: borrar" ON public.quotes;
CREATE POLICY "Cotizaciones propias: borrar" ON public.quotes FOR DELETE
  USING (tenant_id = public.auth_tenant_id());


-- =========================================
-- 9. Indexes
-- =========================================
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON public.quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_date ON public.quotes(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_client ON public.quotes(tenant_id, client_name);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);


-- =========================================
-- 10. RPCs de la alumna
-- =========================================
-- SECURITY INVOKER: respetan RLS solas, así que ya salen filtradas por tenant.

CREATE OR REPLACE FUNCTION public.cotizaciones_summary(
  p_search TEXT DEFAULT '',
  p_status TEXT DEFAULT 'todas'
)
RETURNS TABLE(total INT, monto NUMERIC, pagadas INT, promedio NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(subtotal), 0),
    COUNT(*) FILTER (WHERE status = 'pagada')::int,
    COALESCE(AVG(subtotal), 0)
  FROM public.quotes q
  WHERE (p_search = '' OR q.client_name ILIKE '%' || p_search || '%' OR COALESCE(q.system_name, '') ILIKE '%' || p_search || '%')
    AND (p_status = 'todas' OR q.status = p_status);
$$;

CREATE OR REPLACE FUNCTION public.clientes_directory(
  p_search TEXT DEFAULT '',
  p_type TEXT DEFAULT 'todas',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  name TEXT, phone TEXT, type TEXT, last_visit DATE,
  total_spent NUMERIC, visits INT, total_count INT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH agg AS (
    SELECT
      q.client_name AS name,
      (ARRAY_AGG(q.client_phone ORDER BY q.date DESC) FILTER (WHERE q.client_phone IS NOT NULL))[1] AS phone,
      (ARRAY_AGG(q.client_type ORDER BY q.date DESC))[1] AS type,
      MAX(q.date) AS last_visit,
      COALESCE(SUM(q.subtotal), 0) AS total_spent,
      COUNT(*)::int AS visits
    FROM public.quotes q
    GROUP BY q.client_name
  )
  SELECT a.name, a.phone, a.type, a.last_visit, a.total_spent, a.visits,
         COUNT(*) OVER()::int AS total_count
  FROM agg a
  WHERE (p_search = '' OR a.name ILIKE '%' || p_search || '%' OR COALESCE(a.phone, '') ILIKE '%' || p_search || '%')
    AND (p_type = 'todas' OR a.type = p_type)
  ORDER BY a.last_visit DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.clientes_summary()
RETURNS TABLE(total INT, nuevas INT, frecuentes INT, total_gastado NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH agg AS (
    SELECT q.client_name AS name,
      (ARRAY_AGG(q.client_type ORDER BY q.date DESC))[1] AS type,
      SUM(q.subtotal) AS spent
    FROM public.quotes q
    GROUP BY q.client_name
  )
  SELECT COUNT(*)::int,
    COUNT(*) FILTER (WHERE type = 'nueva')::int,
    COUNT(*) FILTER (WHERE type = 'frecuente')::int,
    COALESCE(SUM(spent), 0)
  FROM agg;
$$;

CREATE OR REPLACE FUNCTION public.cliente_detalle_stats(p_name TEXT)
RETURNS TABLE(
  total_spent NUMERIC, visits INT, ticket_promedio NUMERIC,
  favorite_system TEXT, last_visit DATE, phone TEXT, type TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(subtotal), 0),
    COUNT(*)::int,
    COALESCE(AVG(subtotal), 0),
    (SELECT system_name FROM public.quotes q2
       WHERE q2.client_name = p_name AND q2.system_name IS NOT NULL
       GROUP BY system_name ORDER BY COUNT(*) DESC LIMIT 1),
    MAX(date),
    (ARRAY_AGG(client_phone ORDER BY date DESC) FILTER (WHERE client_phone IS NOT NULL))[1],
    (ARRAY_AGG(client_type ORDER BY date DESC))[1]
  FROM public.quotes q
  WHERE q.client_name = p_name;
$$;

-- Cuántos ítems tiene cargados por sección. Sirve para el onboarding:
-- la app usa esto para saber si el catálogo todavía está vacío y llevarla
-- a "Mis precios" antes de dejarla cotizar.
CREATE OR REPLACE FUNCTION public.catalogo_progreso()
RETURNS TABLE(kind TEXT, items INT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT ci.kind, COUNT(*)::int
  FROM public.catalog_items ci
  WHERE ci.is_active
  GROUP BY ci.kind;
$$;


-- =========================================
-- 11. RPCs del super admin (VK Students)
-- =========================================
-- SECURITY DEFINER + guard explícito de is_superadmin(): saltan RLS a
-- propósito para poder agregar por tenant, pero SOLO devuelven totales.
-- Ninguna devuelve filas de cotizaciones.

DROP FUNCTION IF EXISTS public.superadmin_stats();
CREATE FUNCTION public.superadmin_stats()
RETURNS TABLE(
  alumnas INT, activas INT, suspendidas INT,
  cotizaciones INT, clientas INT, facturado NUMERIC, activas_30d INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.tenants)::int,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'activo')::int,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'suspendido')::int,
    (SELECT COUNT(*) FROM public.quotes)::int,
    (SELECT COUNT(*) FROM public.clients)::int,
    (SELECT COALESCE(SUM(subtotal), 0) FROM public.quotes),
    (SELECT COUNT(DISTINCT tenant_id) FROM public.quotes
       WHERE created_at >= NOW() - INTERVAL '30 days')::int;
END;
$$;

DROP FUNCTION IF EXISTS public.superadmin_tenants(TEXT, TEXT, INT, INT);
CREATE FUNCTION public.superadmin_tenants(
  p_search TEXT DEFAULT '',
  p_status TEXT DEFAULT 'todas',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, status TEXT,
  owner_name TEXT, owner_email TEXT,
  quotes_count INT, clients_count INT, total_facturado NUMERIC,
  last_quote_date DATE, created_at TIMESTAMPTZ, total_count INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.status,
    COALESCE(NULLIF(p.full_name, ''), p.email, '—') AS owner_name,
    COALESCE(p.email, '—') AS owner_email,
    (SELECT COUNT(*) FROM public.quotes q WHERE q.tenant_id = t.id)::int,
    (SELECT COUNT(*) FROM public.clients c WHERE c.tenant_id = t.id)::int,
    (SELECT COALESCE(SUM(q.subtotal), 0) FROM public.quotes q WHERE q.tenant_id = t.id),
    (SELECT MAX(q.date) FROM public.quotes q WHERE q.tenant_id = t.id),
    t.created_at,
    COUNT(*) OVER()::int AS total_count
  FROM public.tenants t
  LEFT JOIN public.profiles p ON p.id = t.owner_id
  WHERE (p_search = ''
      OR t.name ILIKE '%' || p_search || '%'
      OR COALESCE(p.full_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(p.email, '') ILIKE '%' || p_search || '%')
    AND (p_status = 'todas' OR t.status = p_status)
  ORDER BY t.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Activar / suspender una alumna.
DROP FUNCTION IF EXISTS public.superadmin_set_tenant_status(UUID, TEXT);
CREATE FUNCTION public.superadmin_set_tenant_status(p_tenant_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_status NOT IN ('activo', 'suspendido') THEN
    RAISE EXCEPTION 'Estado inválido: %', p_status;
  END IF;

  UPDATE public.tenants SET status = p_status, updated_at = NOW()
  WHERE id = p_tenant_id;
END;
$$;

-- Supabase ya concede estos permisos por "default privileges", pero se dejan
-- explícitos para que este archivo sea autosuficiente. Quién ve qué lo decide
-- RLS, no estos GRANT.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.tenants, public.profiles, public.catalog_items, public.clients, public.quotes
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.cotizaciones_summary(TEXT, TEXT),
  public.clientes_directory(TEXT, TEXT, INT, INT),
  public.clientes_summary(),
  public.cliente_detalle_stats(TEXT),
  public.catalogo_progreso(),
  public.superadmin_stats(),
  public.superadmin_tenants(TEXT, TEXT, INT, INT),
  public.superadmin_set_tenant_status(UUID, TEXT)
TO authenticated;

-- unique_tenant_slug no se expone al cliente: se usa solo desde el trigger
-- de signup.
REVOKE EXECUTE ON FUNCTION public.unique_tenant_slug(TEXT) FROM anon, authenticated;


-- =========================================
-- 12. Migraciones sobre bases que ya existían
-- =========================================
-- Una base NUEVA no necesita nada de esta sección: las columnas ya están en
-- los CREATE TABLE de arriba. Esto existe solo porque esos CREATE son
-- IF NOT EXISTS, así que sobre una base ya creada no agregan columnas nuevas.
--
-- Al agregar una columna, va en DOS lados: en su CREATE TABLE (para las bases
-- nuevas) y como ALTER acá (para las que ya están corriendo). Todos los ALTER
-- son idempotentes y se pueden re-correr.

-- Cobrar sistemas y retoques por uña (default 10 = mano completa, que es el
-- comportamiento que tenían todas las cotizaciones anteriores).
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS system_nails  INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS retoque_nails INTEGER DEFAULT 10;

-- Varios sistemas y varios retoques por cotización. El detalle completo del
-- backfill y del cambio de CHECK está en scripts/add-multiple-systems-to-quotes.sql.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS system_items  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retoque_items JSONB DEFAULT '[]'::jsonb;


-- =========================================
-- 13. Promover a super admin (correr a mano, una sola vez)
-- =========================================
-- UPDATE public.profiles SET role = 'superadmin', tenant_id = NULL
-- WHERE email = 'admin@vkstudio.com';
-- -- y opcionalmente borrar el tenant que se le creó en el signup:
-- DELETE FROM public.tenants WHERE owner_id = (
--   SELECT id FROM public.profiles WHERE email = 'admin@vkstudio.com'
-- );


