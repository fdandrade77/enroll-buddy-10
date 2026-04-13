
-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Anyone can create matriculas for active vendedores" ON public.matriculas;

-- Recreate: allow insert when EITHER vendedor is active OR indicador is active
CREATE POLICY "Anyone can create matriculas"
ON public.matriculas FOR INSERT
TO anon, authenticated
WITH CHECK (
  (
    vendedor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM vendedores v
      JOIN profiles p ON p.user_id = v.user_id
      WHERE v.id = matriculas.vendedor_id AND p.ativo = true
    )
  )
  OR
  (
    indicador_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM indicadores i
      WHERE i.id = matriculas.indicador_id AND i.ativo = true
    )
  )
);
