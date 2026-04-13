
-- Part A: Default expenses on vendedores
ALTER TABLE public.vendedores
  ADD COLUMN despesa_trafego_padrao NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN despesa_fateb_padrao NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Part B: Indicadores table
CREATE TABLE public.indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  chave_pix VARCHAR(200) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage indicadores" ON public.indicadores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read active indicadores" ON public.indicadores
  FOR SELECT TO anon USING (ativo = true);

-- Part B: indicador_id on matriculas
ALTER TABLE public.matriculas
  ADD COLUMN indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL;

-- Part B: Cashbacks table
CREATE TABLE public.cashbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  matricula_id UUID NOT NULL UNIQUE REFERENCES public.matriculas(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  data_pagamento DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_cashback()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pendente', 'pago', 'cancelado') THEN
    RAISE EXCEPTION 'status must be pendente, pago or cancelado';
  END IF;
  IF NEW.valor < 0 THEN
    RAISE EXCEPTION 'valor must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_cashback_trigger
  BEFORE INSERT OR UPDATE ON public.cashbacks
  FOR EACH ROW EXECUTE FUNCTION public.validate_cashback();

ALTER TABLE public.cashbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cashbacks" ON public.cashbacks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Part B: Configuracoes table
CREATE TABLE public.configuracoes (
  chave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage configuracoes" ON public.configuracoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed initial cashback value
INSERT INTO public.configuracoes (chave, valor) VALUES ('valor_cashback', '50.00');
