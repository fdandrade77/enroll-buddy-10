CREATE OR REPLACE FUNCTION public.notify_matricula_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  edge_function_url TEXT := 'https://jjxjuqtdaphmoscntzqc.supabase.co/functions/v1/notify-matricula';
  request_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := edge_function_url,
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) INTO request_id;

  RAISE LOG 'notify_matricula_webhook called: request_id=%, matricula_id=%', request_id, NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_matricula_webhook failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;