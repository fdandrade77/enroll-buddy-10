
-- The INSERT WITH CHECK (true) on matriculas is intentional for public enrollment.
-- However, let's add a validation that the vendedor_id must exist and be active.
DROP POLICY "Anyone can create matriculas" ON public.matriculas;

CREATE POLICY "Anyone can create matriculas for active vendedores" ON public.matriculas
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendedores v
      JOIN public.profiles p ON p.user_id = v.user_id
      WHERE v.id = vendedor_id AND p.ativo = true
    )
  );
