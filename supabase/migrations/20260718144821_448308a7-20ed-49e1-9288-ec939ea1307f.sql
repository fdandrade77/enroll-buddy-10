
-- 1. Drop overexposed public SELECT policies
DROP POLICY IF EXISTS "Public can read vendedores by codigo" ON public.vendedores;
DROP POLICY IF EXISTS "Public can read vendedor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can read active indicadores" ON public.indicadores;

-- 2. Public resolvers: only expose id + nome
CREATE OR REPLACE FUNCTION public.get_vendedor_public(_codigo text)
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, COALESCE(p.nome, v.codigo_ref) AS nome
  FROM public.vendedores v
  LEFT JOIN public.profiles p ON p.user_id = v.user_id
  WHERE v.codigo_ref = _codigo
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_indicador_public(_slug text)
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.nome
  FROM public.indicadores i
  WHERE i.slug = _slug AND i.ativo = true
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_vendedor_public(text) FROM public;
REVOKE ALL ON FUNCTION public.get_indicador_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_vendedor_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_indicador_public(text) TO anon, authenticated;

-- 3. Lock down SECURITY DEFINER helpers: only server/roles that need them
REVOKE EXECUTE ON FUNCTION public.notify_matricula_webhook() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM public, anon;
-- has_role is required for RLS predicates run by authenticated users; keep EXECUTE for authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 4. Stronger input validation for public matricula inserts
CREATE OR REPLACE FUNCTION public.validate_matricula_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  clean_cpf text;
  clean_wa text;
BEGIN
  IF NEW.nome_completo IS NULL OR length(trim(NEW.nome_completo)) < 3 OR length(NEW.nome_completo) > 120 THEN
    RAISE EXCEPTION 'nome_completo inválido';
  END IF;

  IF NEW.email IS NULL OR length(NEW.email) > 160
     OR NEW.email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'email inválido';
  END IF;

  clean_cpf := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');
  IF length(clean_cpf) <> 11 THEN
    RAISE EXCEPTION 'cpf inválido';
  END IF;

  clean_wa := regexp_replace(COALESCE(NEW.whatsapp, ''), '\D', '', 'g');
  IF length(clean_wa) < 10 OR length(clean_wa) > 15 THEN
    RAISE EXCEPTION 'whatsapp inválido';
  END IF;

  IF NEW.valor_total IS NULL OR NEW.valor_total <= 0 OR NEW.valor_total > 1000000 THEN
    RAISE EXCEPTION 'valor_total inválido';
  END IF;

  IF NEW.vendedor_id IS NULL AND NEW.indicador_id IS NULL THEN
    RAISE EXCEPTION 'origem obrigatória (vendedor ou indicador)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_matricula_input ON public.matriculas;
CREATE TRIGGER trg_validate_matricula_input
BEFORE INSERT OR UPDATE ON public.matriculas
FOR EACH ROW EXECUTE FUNCTION public.validate_matricula_input();

-- 5. Storage: prevent public listing of curso-materiais (direct public URLs continue to work)
DROP POLICY IF EXISTS "Public can read curso materiais" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read curso materiais" ON storage.objects;

CREATE POLICY "Authenticated can list curso-materiais"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'curso-materiais');
