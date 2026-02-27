
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');
CREATE TYPE public.tipo_pagamento AS ENUM ('a_vista', 'parcelado');
CREATE TYPE public.status_matricula AS ENUM ('nao_pago', 'pago');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vendedores table
CREATE TABLE public.vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_ref VARCHAR(50) NOT NULL UNIQUE,
  whatsapp VARCHAR(20) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  chave_pix VARCHAR(150) NOT NULL,
  cnpj VARCHAR(18),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores can view own data" ON public.vendedores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can select vendedores" ON public.vendedores
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert vendedores" ON public.vendedores
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vendedores" ON public.vendedores
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vendedores" ON public.vendedores
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public readable vendedores by codigo_ref (for enrollment page)
CREATE POLICY "Public can read vendedores by codigo" ON public.vendedores
  FOR SELECT TO anon
  USING (true);

-- Cursos table
CREATE TABLE public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  max_parcelas INT NOT NULL,
  comissao_primeira_parcela NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cursos" ON public.cursos
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert cursos" ON public.cursos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cursos" ON public.cursos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cursos" ON public.cursos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Matriculas table
CREATE TABLE public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES public.vendedores(id),
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  nome_completo VARCHAR(200) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  email VARCHAR(150) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  tipo_pagamento tipo_pagamento NOT NULL,
  quantidade_parcelas INT,
  data_vencimento DATE NOT NULL,
  status status_matricula NOT NULL DEFAULT 'nao_pago',
  valor_total NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create matriculas" ON public.matriculas
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Vendedores can view own matriculas" ON public.matriculas
  FOR SELECT TO authenticated
  USING (
    vendedor_id IN (
      SELECT id FROM public.vendedores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can select matriculas" ON public.matriculas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update matriculas" ON public.matriculas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Validation trigger for matriculas
CREATE OR REPLACE FUNCTION public.validate_matricula()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_p INT;
BEGIN
  IF NEW.tipo_pagamento = 'a_vista' AND NEW.quantidade_parcelas IS NOT NULL THEN
    RAISE EXCEPTION 'quantidade_parcelas must be NULL for pagamento a_vista';
  END IF;
  IF NEW.tipo_pagamento = 'parcelado' AND (NEW.quantidade_parcelas IS NULL OR NEW.quantidade_parcelas < 1) THEN
    RAISE EXCEPTION 'quantidade_parcelas is required for pagamento parcelado';
  END IF;
  IF NEW.tipo_pagamento = 'parcelado' THEN
    SELECT max_parcelas INTO max_p FROM public.cursos WHERE id = NEW.curso_id;
    IF NEW.quantidade_parcelas > max_p THEN
      RAISE EXCEPTION 'quantidade_parcelas exceeds max_parcelas of the course';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_matricula_trigger
  BEFORE INSERT OR UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.validate_matricula();

-- Validation trigger for cursos
CREATE OR REPLACE FUNCTION public.validate_curso()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.valor_total <= 0 THEN
    RAISE EXCEPTION 'valor_total must be greater than 0';
  END IF;
  IF NEW.max_parcelas < 1 OR NEW.max_parcelas > 12 THEN
    RAISE EXCEPTION 'max_parcelas must be between 1 and 12';
  END IF;
  IF NEW.comissao_primeira_parcela < 0 THEN
    RAISE EXCEPTION 'comissao_primeira_parcela must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_curso_trigger
  BEFORE INSERT OR UPDATE ON public.cursos
  FOR EACH ROW EXECUTE FUNCTION public.validate_curso();

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
