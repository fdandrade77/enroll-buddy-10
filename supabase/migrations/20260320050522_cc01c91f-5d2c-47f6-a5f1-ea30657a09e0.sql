-- Enable realtime for matriculas table
ALTER PUBLICATION supabase_realtime ADD TABLE public.matriculas;

-- Create database webhook to call notify-matricula edge function on INSERT
CREATE OR REPLACE FUNCTION public.notify_matricula_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
END;
$$;

CREATE TRIGGER on_matricula_inserted
  AFTER INSERT ON public.matriculas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matricula_webhook();