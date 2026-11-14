-- Keep the SECURITY DEFINER event-trigger function private from the exposed Data API.
-- The existing PostgreSQL event trigger remains installed and owned by postgres.
REVOKE ALL PRIVILEGES ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
