DROP TRIGGER IF EXISTS notify_matricula_webhook_trigger ON public.matriculas;
CREATE TRIGGER notify_matricula_webhook_trigger
AFTER INSERT ON public.matriculas
FOR EACH ROW
EXECUTE FUNCTION public.notify_matricula_webhook();