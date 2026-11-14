-- Reconciliation of the production migration applied directly to Supabase.
-- Snapshot sample-job data before allowing the referenced job row to be deleted.
-- This file intentionally mirrors the verified production end state and is idempotent
-- when migration history is replayed against the schema preceding this version.

ALTER TABLE public.bumn_lamar
  ADD COLUMN IF NOT EXISTS job_snapshot jsonb;

UPDATE public.bumn_lamar AS application
SET job_snapshot = to_jsonb(job)
FROM public.bumn_jobs AS job
WHERE application.job_id = job.id
  AND job.is_sample = true
  AND application.job_snapshot IS NULL;

ALTER TABLE public.bumn_lamar
  ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE public.bumn_lamar
  DROP CONSTRAINT IF EXISTS bumn_lamar_job_id_fkey;

ALTER TABLE public.bumn_lamar
  ADD CONSTRAINT bumn_lamar_job_id_fkey
  FOREIGN KEY (job_id)
  REFERENCES public.bumn_jobs(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

COMMENT ON COLUMN public.bumn_lamar.job_snapshot IS
  'Immutable snapshot of the referenced job for historical applications when a sample job is removed.';
