GRANT USAGE, SELECT ON SEQUENCE public.bumn_lamar_status_history_id_seq TO service_role;

COMMENT ON COLUMN public.bumn_lamar.diploma_url IS
  'Deprecated legacy URL field. New private document uploads use diploma_file_path and metadata.';
COMMENT ON COLUMN public.bumn_lamar.high_school_diploma_url IS
  'Deprecated legacy URL field. New private document uploads use high_school_diploma_file_path and metadata.';
COMMENT ON COLUMN public.bumn_lamar.identity_card_url IS
  'Deprecated legacy URL field. New private document uploads use identity_card_file_path and metadata.';