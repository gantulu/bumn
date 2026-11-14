-- Align bumn_lamar with bumn-lamar Edge Function document metadata.
-- Keep legacy *_url columns intact for backward compatibility.
ALTER TABLE public.bumn_lamar
  ADD COLUMN IF NOT EXISTS diploma_file_name TEXT,
  ADD COLUMN IF NOT EXISTS diploma_file_path TEXT,
  ADD COLUMN IF NOT EXISTS diploma_file_type TEXT,
  ADD COLUMN IF NOT EXISTS diploma_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS diploma_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_card_file_name TEXT,
  ADD COLUMN IF NOT EXISTS identity_card_file_path TEXT,
  ADD COLUMN IF NOT EXISTS identity_card_file_type TEXT,
  ADD COLUMN IF NOT EXISTS identity_card_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS identity_card_uploaded_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bumn_lamar_diploma_file_size_check') THEN
    ALTER TABLE public.bumn_lamar ADD CONSTRAINT bumn_lamar_diploma_file_size_check
      CHECK (diploma_file_size IS NULL OR diploma_file_size BETWEEN 0 AND 5242880);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bumn_lamar_identity_card_file_size_check') THEN
    ALTER TABLE public.bumn_lamar ADD CONSTRAINT bumn_lamar_identity_card_file_size_check
      CHECK (identity_card_file_size IS NULL OR identity_card_file_size BETWEEN 0 AND 5242880);
  END IF;
END $$;

COMMENT ON COLUMN public.bumn_lamar.diploma_file_path IS
  'Private Storage object path in bumn-lamar-documents; never a public URL.';
COMMENT ON COLUMN public.bumn_lamar.identity_card_file_path IS
  'Private Storage object path in bumn-lamar-documents; never a public URL.';
COMMENT ON COLUMN public.bumn_lamar.diploma_file_size IS
  'Uploaded diploma file size in bytes; maximum 5 MiB.';
COMMENT ON COLUMN public.bumn_lamar.identity_card_file_size IS
  'Uploaded identity card file size in bytes; maximum 5 MiB.';
