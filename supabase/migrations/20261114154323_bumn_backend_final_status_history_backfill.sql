INSERT INTO public.bumn_lamar_status_history (
  application_id, old_status, new_status, changed_at
)
SELECT a.id, NULL, a.status, a.created_at
FROM public.bumn_lamar a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.bumn_lamar_status_history h
  WHERE h.application_id = a.id
);