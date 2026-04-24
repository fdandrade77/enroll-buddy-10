-- Add slug column to cursos for SEO-friendly enrollment URLs
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS slug VARCHAR;

-- Helper to slugify (lowercase, no accents, hyphens)
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(input);
  -- Remove accents using unaccent-like translation
  result := translate(result,
    'áàâãäåāăąçćčďéèêëēĕėęěíìîïĩīĭįıłńňñóòôõöōŏőøśšşťúùûüũūŭůűųýÿžźż',
    'aaaaaaaaacccdeeeeeeeeeiiiiiiiiilnnnoooooooooosssstuuuuuuuuuyyzzz'
  );
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := regexp_replace(result, '^-+|-+$', '', 'g');
  RETURN result;
END;
$$;

-- Backfill existing cursos with slug from nome (ensuring uniqueness with id suffix on collisions)
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT id, nome FROM public.cursos WHERE slug IS NULL OR slug = '' LOOP
    base_slug := public.slugify(r.nome);
    IF base_slug = '' THEN base_slug := 'curso'; END IF;
    final_slug := base_slug;
    counter := 2;
    WHILE EXISTS (SELECT 1 FROM public.cursos WHERE slug = final_slug AND id <> r.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE public.cursos SET slug = final_slug WHERE id = r.id;
  END LOOP;
END $$;

-- Enforce uniqueness and not null
ALTER TABLE public.cursos ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cursos_slug_unique ON public.cursos(slug);