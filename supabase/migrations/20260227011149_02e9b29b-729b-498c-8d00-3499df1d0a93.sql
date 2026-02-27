
-- Add FK from vendedores.user_id to auth.users(id) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendedores_user_id_fkey' AND table_name = 'vendedores'
  ) THEN
    ALTER TABLE public.vendedores
      ADD CONSTRAINT vendedores_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Backfill profiles for existing users that don't have one
INSERT INTO public.profiles (user_id, nome, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'nome', u.email), u.email
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
