-- Restrict internal operational tables to their SECURITY DEFINER entry points.
REVOKE ALL ON TABLE public.bumn_rate_limits FROM service_role;
REVOKE ALL ON TABLE public.bumn_application_counters FROM service_role;

-- Status history is append-only for backend callers; the trigger only needs INSERT.
REVOKE ALL ON TABLE public.bumn_lamar_status_history FROM service_role;
GRANT SELECT, INSERT ON TABLE public.bumn_lamar_status_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.bumn_lamar_status_history_id_seq TO service_role;