-- Public job listings are read-only. Mutations remain restricted to trusted backend roles.
REVOKE ALL PRIVILEGES ON TABLE public.bumn_jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.bumn_jobs TO anon, authenticated;
