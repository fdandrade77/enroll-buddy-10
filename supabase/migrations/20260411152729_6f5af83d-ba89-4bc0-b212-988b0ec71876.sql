
-- 1. Enum para modelo de comissão
CREATE TYPE public.modelo_comissao AS ENUM ('fixo', 'parcelado');

-- 2. Adicionar campos ao vendedor
ALTER TABLE public.vendedores
  ADD COLUMN modelo_comissao public.modelo_comissao NOT NULL DEFAULT 'fixo',
  ADD COLUMN comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 15.00;

-- 3. Tabela de parcelas de comissão
CREATE TABLE public.comissoes_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES public.vendedores(id),
  numero_parcela INT NOT NULL,
  valor_parcela_curso NUMERIC(10,2) NOT NULL,
  percentual NUMERIC(5,2) NOT NULL,
  valor_comissao NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  data_prevista DATE,
  data_pagamento DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (matricula_id, numero_parcela)
);

-- Validation trigger for numero_parcela >= 1
CREATE OR REPLACE FUNCTION public.validate_comissao_parcela()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.numero_parcela < 1 THEN
    RAISE EXCEPTION 'numero_parcela must be >= 1';
  END IF;
  IF NEW.status NOT IN ('pendente', 'pago', 'cancelado') THEN
    RAISE EXCEPTION 'status must be pendente, pago or cancelado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_comissao_parcela_trigger
  BEFORE INSERT OR UPDATE ON public.comissoes_parcelas
  FOR EACH ROW EXECUTE FUNCTION public.validate_comissao_parcela();

ALTER TABLE public.comissoes_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage comissoes_parcelas"
  ON public.comissoes_parcelas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendedores view own comissoes"
  ON public.comissoes_parcelas FOR SELECT TO authenticated
  USING (vendedor_id IN (
    SELECT id FROM public.vendedores WHERE user_id = auth.uid()
  ));

-- 4. Tabela de despesas por matrícula
CREATE TABLE public.despesas_matricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  descricao VARCHAR(200),
  valor NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for valor >= 0
CREATE OR REPLACE FUNCTION public.validate_despesa_matricula()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.valor < 0 THEN
    RAISE EXCEPTION 'valor must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_despesa_matricula_trigger
  BEFORE INSERT OR UPDATE ON public.despesas_matricula
  FOR EACH ROW EXECUTE FUNCTION public.validate_despesa_matricula();

ALTER TABLE public.despesas_matricula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage despesas"
  ON public.despesas_matricula FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Fix trigger on matriculas: BEFORE -> AFTER INSERT
DROP TRIGGER IF EXISTS on_matricula_inserted ON public.matriculas;

CREATE TRIGGER on_matricula_inserted
  AFTER INSERT ON public.matriculas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matricula_webhook();
