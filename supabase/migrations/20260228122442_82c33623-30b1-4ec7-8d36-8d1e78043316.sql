
-- Drop existing FK that points to auth.users
ALTER TABLE public.vendedores DROP CONSTRAINT IF EXISTS vendedores_user_id_fkey;

-- Create FK: vendedores.user_id -> profiles.user_id
ALTER TABLE public.vendedores
  ADD CONSTRAINT vendedores_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Create FK: matriculas.vendedor_id -> vendedores.id (skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matriculas_vendedor_id_fkey') THEN
    ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);
  END IF;
END $$;

-- Create FK: matriculas.curso_id -> cursos.id (skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matriculas_curso_id_fkey') THEN
    ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id);
  END IF;
END $$;

-- Backfill missing profiles
INSERT INTO public.profiles (user_id, nome, email)
SELECT v.user_id, 
       COALESCE(au.raw_user_meta_data->>'nome', au.email),
       au.email
FROM public.vendedores v
JOIN auth.users au ON au.id = v.user_id
LEFT JOIN public.profiles p ON p.user_id = v.user_id
WHERE p.id IS NULL;
