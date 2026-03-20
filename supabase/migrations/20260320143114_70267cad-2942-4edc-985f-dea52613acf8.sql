
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the trigger function using the correct schema reference
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
  
  SELECT extensions.http_post(
    url := edge_function_url,
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;
  
  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_matricula_inserted ON public.matriculas;
CREATE TRIGGER on_matricula_inserted
  AFTER INSERT ON public.matriculas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matricula_webhook();
