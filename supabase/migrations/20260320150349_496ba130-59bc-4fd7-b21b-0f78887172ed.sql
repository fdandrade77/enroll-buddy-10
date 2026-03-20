
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_matricula_inserted ON public.matriculas;
DROP FUNCTION IF EXISTS public.notify_matricula_webhook();

-- Recreate function using net.http_post
CREATE OR REPLACE FUNCTION public.notify_matricula_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  edge_function_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/notify-matricula';
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  SELECT net.http_post(
    url := edge_function_url,
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_matricula_webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create AFTER INSERT trigger (not BEFORE)
CREATE TRIGGER on_matricula_inserted
  AFTER INSERT ON public.matriculas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matricula_webhook();
