-- =========================================
-- VK STUDIO CALCULADORA - Supabase Schema
-- Correr este SQL en el editor de Supabase
-- =========================================

-- 1. Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'tecnico' CHECK (role IN ('admin', 'tecnico')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'tecnico');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabla de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- 3. Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible TEXT,
  system_name TEXT,
  system_price DECIMAL(10,2) DEFAULT 0,
  retoque_name TEXT,
  retoque_price DECIMAL(10,2) DEFAULT 0,
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
  additional_items JSONB DEFAULT '[]'::jsonb,
  design_items JSONB DEFAULT '[]'::jsonb,
  jewelry_items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) DEFAULT 0,
  igv_rate DECIMAL(5,4) DEFAULT 0.18,
  igv_amount DECIMAL(10,2) DEFAULT 0,
  total_with_igv DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  client_type TEXT DEFAULT 'nueva' CHECK (client_type IN ('nueva', 'frecuente')),
  share_policies BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'confirmada', 'pagada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Función helper: revisa el rol SIN disparar RLS (SECURITY DEFINER).
-- Es CLAVE para evitar recursión infinita: si una policy sobre "profiles"
-- hiciera un SELECT directo a "profiles", Postgres entra en bucle y falla
-- la consulta entera (por eso un admin se veía como usuario normal).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
-- WITH CHECK impide que un usuario cambie su propio "role" desde el cliente (evita auto-promoción a admin).
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all clients" ON public.clients FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all quotes" ON public.quotes FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can insert own quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotes" ON public.quotes FOR DELETE USING (auth.uid() = user_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON public.quotes(date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- 6. Para promover a admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@vkstudio.com';

-- =========================================
-- 7. Funciones de paginación / agregación (RPC)
-- Todas son SECURITY INVOKER: respetan RLS automáticamente
-- (un técnico ve lo suyo, un admin ve todo).
-- =========================================

-- Resumen de cotizaciones (para las tarjetas de stats de /cotizaciones)
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

-- Directorio de clientes: agrupa cotizaciones por nombre, con búsqueda + paginación.
-- total_count viene por window function para saber cuántas páginas hay.
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

-- Resumen global de clientes (tarjetas de stats de /clientes)
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

-- Stats de detalle de un cliente (encabezado de /clientes/[id])
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

-- Stats globales del panel de admin
CREATE OR REPLACE FUNCTION public.admin_global_stats()
RETURNS TABLE(tecnicos INT, total_cotizaciones INT, total_facturado NUMERIC, pagadas INT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'tecnico')::int,
    (SELECT COUNT(*) FROM public.quotes)::int,
    (SELECT COALESCE(SUM(subtotal), 0) FROM public.quotes),
    (SELECT COUNT(*) FROM public.quotes WHERE status = 'pagada')::int;
$$;

-- Leaderboard del equipo (una fila por técnico/admin con sus totales)
CREATE OR REPLACE FUNCTION public.admin_team_stats()
RETURNS TABLE(
  id UUID, name TEXT, email TEXT, role TEXT,
  quotes_count INT, total_revenue NUMERIC, pagadas INT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id,
    COALESCE(NULLIF(p.full_name, ''), p.email) AS name,
    p.email, p.role,
    COUNT(q.id)::int,
    COALESCE(SUM(q.subtotal), 0),
    COUNT(q.id) FILTER (WHERE q.status = 'pagada')::int
  FROM public.profiles p
  LEFT JOIN public.quotes q ON q.user_id = p.id
  GROUP BY p.id, p.full_name, p.email, p.role
  ORDER BY COALESCE(SUM(q.subtotal), 0) DESC;
$$;

-- Tabla de cotizaciones del equipo (paginada, con nombre de técnico y filtros)
CREATE OR REPLACE FUNCTION public.admin_quotes(
  p_search TEXT DEFAULT '',
  p_status TEXT DEFAULT 'todas',
  p_tech UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID, client_name TEXT, system_name TEXT, subtotal NUMERIC,
  status TEXT, date DATE, technician_id UUID, technician_name TEXT, total_count INT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT q.id, q.client_name, q.system_name, q.subtotal, q.status, q.date,
    q.user_id,
    COALESCE(NULLIF(p.full_name, ''), p.email, 'Desconocido') AS technician_name,
    COUNT(*) OVER()::int AS total_count
  FROM public.quotes q
  LEFT JOIN public.profiles p ON p.id = q.user_id
  WHERE (p_search = ''
      OR q.client_name ILIKE '%' || p_search || '%'
      OR COALESCE(q.system_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(p.full_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(p.email, '') ILIKE '%' || p_search || '%')
    AND (p_status = 'todas' OR q.status = p_status)
    AND (p_tech IS NULL OR q.user_id = p_tech)
  ORDER BY q.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION
  public.cotizaciones_summary(TEXT, TEXT),
  public.clientes_directory(TEXT, TEXT, INT, INT),
  public.clientes_summary(),
  public.cliente_detalle_stats(TEXT),
  public.admin_global_stats(),
  public.admin_team_stats(),
  public.admin_quotes(TEXT, TEXT, UUID, INT, INT)
TO authenticated;
