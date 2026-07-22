-- Migración: permitir que el admin asigne comisiones desde /admin
-- Ejecutar en Supabase → SQL Editor

DROP POLICY IF EXISTS "Admin can update team profiles" ON public.profiles;
CREATE POLICY "Admin can update team profiles" ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND commission_rate = (SELECT commission_rate FROM public.profiles WHERE id = auth.uid())
  );

-- Nuevos usuarios empiezan con 0% (el admin asigna manualmente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, commission_rate)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'tecnico',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ver comisiones actuales
SELECT email, full_name, role, commission_rate, (commission_rate * 100)::int || '%' AS pct
FROM public.profiles
ORDER BY role, full_name;
