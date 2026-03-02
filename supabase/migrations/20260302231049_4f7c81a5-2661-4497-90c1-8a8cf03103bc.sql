
-- Fix matriculas INSERT policy: change from RESTRICTIVE to PERMISSIVE
DROP POLICY "Anyone can create matriculas for active vendedores" ON public.matriculas;
CREATE POLICY "Anyone can create matriculas for active vendedores"
ON public.matriculas FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendedores v
    JOIN profiles p ON p.user_id = v.user_id
    WHERE v.id = matriculas.vendedor_id AND p.ativo = true
  )
);

-- Allow anonymous users to read vendedor profiles (for public matricula page)
CREATE POLICY "Public can read vendedor profiles"
ON public.profiles FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM vendedores v
    WHERE v.user_id = profiles.user_id
  )
);
