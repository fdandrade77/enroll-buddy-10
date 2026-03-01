
-- 1. Add senha_gerada column to vendedores
ALTER TABLE public.vendedores ADD COLUMN IF NOT EXISTS senha_gerada text;

-- 2. Add DELETE policy on matriculas for admin
CREATE POLICY "Admins can delete matriculas"
ON public.matriculas
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Make vendedor_id nullable and update FK to ON DELETE SET NULL
ALTER TABLE public.matriculas ALTER COLUMN vendedor_id DROP NOT NULL;

-- Drop existing FK if exists
ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS matriculas_vendedor_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE public.matriculas
  ADD CONSTRAINT matriculas_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id)
  ON DELETE SET NULL;

-- 4. Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('curso-materiais', 'curso-materiais', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload curso materiais"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'curso-materiais' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete curso materiais"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'curso-materiais' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view curso materiais"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'curso-materiais');

CREATE POLICY "Public can view curso materiais"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'curso-materiais');

-- 5. Create curso_materiais table
CREATE TABLE public.curso_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  tipo text NOT NULL DEFAULT 'pdf',
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curso_materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage curso_materiais"
ON public.curso_materiais FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view curso_materiais"
ON public.curso_materiais FOR SELECT
TO authenticated
USING (true);
