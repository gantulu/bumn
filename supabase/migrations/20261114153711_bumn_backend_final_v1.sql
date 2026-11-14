
-- BUMN backend final V1: additive, data-preserving hardening.
-- Existing custom phone/password accounts are migrated in-place to bcrypt hashes.

ALTER TABLE public.bumn_users ADD COLUMN IF NOT EXISTS password_hash text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bumn_users
    WHERE password IS NULL OR length(password) = 0
  ) THEN
    RAISE EXCEPTION 'Cannot migrate bumn_users: one or more legacy passwords are empty.';
  END IF;
END $$;

UPDATE public.bumn_users
SET password_hash = extensions.crypt(password, extensions.gen_salt('bf', 12))
WHERE password_hash IS NULL;

ALTER TABLE public.bumn_users ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE public.bumn_users DROP CONSTRAINT IF EXISTS bumn_users_password_not_blank;
ALTER TABLE public.bumn_users DROP CONSTRAINT IF EXISTS bumn_users_password_hash_not_blank;
ALTER TABLE public.bumn_users DROP COLUMN IF EXISTS password;

COMMENT ON COLUMN public.bumn_users.password_hash IS
  'bcrypt password hash generated with pgcrypto cost 12. Never return this column from an API.';

-- Job publication and source-verification metadata. Existing listings remain public.
ALTER TABLE public.bumn_jobs
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bumn_jobs
  DROP CONSTRAINT IF EXISTS bumn_jobs_verification_status_check,
  DROP CONSTRAINT IF EXISTS bumn_jobs_publication_status_check;

ALTER TABLE public.bumn_jobs
  ADD CONSTRAINT bumn_jobs_verification_status_check
    CHECK (verification_status IN ('unverified', 'verified', 'sample')),
  ADD CONSTRAINT bumn_jobs_publication_status_check
    CHECK (publication_status IN ('draft', 'published', 'archived'));

UPDATE public.bumn_jobs
SET is_sample = (
  coalesce(title, '') || ' ' || coalesce(company, '') || ' ' ||
  coalesce(description, '') || ' ' || coalesce(rich_text_description, '')
) ~* '(SAMPLE DATA|CONTOH DATA|DATA DUMMY|DUMMY DATA)',
verification_status = CASE
  WHEN (
    coalesce(title, '') || ' ' || coalesce(company, '') || ' ' ||
    coalesce(description, '') || ' ' || coalesce(rich_text_description, '')
  ) ~* '(SAMPLE DATA|CONTOH DATA|DATA DUMMY|DUMMY DATA)' THEN 'sample'
  ELSE 'unverified'
END;

CREATE INDEX IF NOT EXISTS bumn_jobs_publication_status_idx
  ON public.bumn_jobs (publication_status, created_at DESC);

-- Application document metadata for the high-school certificate.
ALTER TABLE public.bumn_lamar
  ADD COLUMN IF NOT EXISTS high_school_diploma_file_name text,
  ADD COLUMN IF NOT EXISTS high_school_diploma_file_path text,
  ADD COLUMN IF NOT EXISTS high_school_diploma_file_type text,
  ADD COLUMN IF NOT EXISTS high_school_diploma_file_size bigint,
  ADD COLUMN IF NOT EXISTS high_school_diploma_uploaded_at timestamptz;

ALTER TABLE public.bumn_lamar
  DROP CONSTRAINT IF EXISTS bumn_lamar_high_school_diploma_file_size_check;

ALTER TABLE public.bumn_lamar
  ADD CONSTRAINT bumn_lamar_high_school_diploma_file_size_check
  CHECK (
    high_school_diploma_file_size IS NULL OR
    high_school_diploma_file_size BETWEEN 0 AND 5242880
  );

-- V1 rule: a user may submit only one application per job, including after withdrawal.
CREATE UNIQUE INDEX IF NOT EXISTS bumn_lamar_user_job_uidx
  ON public.bumn_lamar (user_id, job_id);

-- Custom sessions: only token hashes are persisted.
CREATE TABLE IF NOT EXISTS public.bumn_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.bumn_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS bumn_sessions_user_id_idx ON public.bumn_sessions(user_id);
CREATE INDEX IF NOT EXISTS bumn_sessions_expires_at_idx ON public.bumn_sessions(expires_at);

-- Atomic, database-backed rate limits for public/authenticated endpoints.
CREATE TABLE IF NOT EXISTS public.bumn_rate_limits (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bumn_rate_limits_updated_at_idx ON public.bumn_rate_limits(updated_at);

-- Atomic yearly application number counter.
CREATE TABLE IF NOT EXISTS public.bumn_application_counters (
  application_year integer PRIMARY KEY CHECK (application_year BETWEEN 2020 AND 2200),
  last_number integer NOT NULL CHECK (last_number >= 0)
);

INSERT INTO public.bumn_application_counters (application_year, last_number)
SELECT
  extract(year FROM timezone('UTC', now()))::integer,
  coalesce(max(substring(application_number FROM '^BL-[0-9]{4}-([0-9]{6})$')::integer), 0)
FROM public.bumn_lamar
WHERE application_number ~ '^BL-[0-9]{4}-[0-9]{6}$'
  AND substring(application_number FROM 4 FOR 4) = extract(year FROM timezone('UTC', now()))::text
ON CONFLICT (application_year) DO UPDATE
SET last_number = greatest(
  public.bumn_application_counters.last_number,
  EXCLUDED.last_number
);

-- Immutable status history for application lifecycle auditing.
CREATE TABLE IF NOT EXISTS public.bumn_lamar_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.bumn_lamar(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bumn_lamar_status_history_application_idx
  ON public.bumn_lamar_status_history(application_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.capture_bumn_lamar_status_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.bumn_lamar_status_history(application_id, old_status, new_status)
    VALUES (NEW.id, NULL, NEW.status);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.bumn_lamar_status_history(application_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bumn_lamar_status_history ON public.bumn_lamar;
CREATE TRIGGER trg_bumn_lamar_status_history
AFTER INSERT OR UPDATE OF status ON public.bumn_lamar
FOR EACH ROW EXECUTE FUNCTION public.capture_bumn_lamar_status_history();

-- bcrypt hashing and verification stay inside Postgres; Edge Functions never handle plaintext at rest.
CREATE OR REPLACE FUNCTION public.hash_bumn_password(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $$
BEGIN
  IF p_password IS NULL OR length(p_password) < 8 OR octet_length(convert_to(p_password, 'UTF8')) > 72 THEN
    RAISE EXCEPTION 'Password must contain 8-72 UTF-8 bytes.';
  END IF;
  RETURN extensions.crypt(p_password, extensions.gen_salt('bf', 12));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_bumn_password(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bumn_users u
    WHERE u.id = p_user_id
      AND p_password IS NOT NULL
      AND u.password_hash = extensions.crypt(p_password, u.password_hash)
  );
$$;

-- Atomic per-key rate limiter. The key passed by Edge Functions is already SHA-256 hashed.
CREATE OR REPLACE FUNCTION public.consume_bumn_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count integer;
  v_now timestamptz := now();
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) < 16 OR
     p_limit < 1 OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters.';
  END IF;

  INSERT INTO public.bumn_rate_limits(bucket_key, window_started_at, request_count, updated_at)
  VALUES (p_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.bumn_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      THEN v_now ELSE public.bumn_rate_limits.window_started_at END,
    request_count = CASE
      WHEN public.bumn_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      THEN 1 ELSE public.bumn_rate_limits.request_count + 1 END,
    updated_at = v_now
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- Atomic draft creation and application-number allocation.
CREATE OR REPLACE FUNCTION public.create_bumn_lamar_draft(
  p_user_id uuid,
  p_job_id text
)
RETURNS public.bumn_lamar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_year integer := extract(year FROM timezone('UTC', now()))::integer;
  v_number integer;
  v_user public.bumn_users%ROWTYPE;
  v_job public.bumn_jobs%ROWTYPE;
  v_application public.bumn_lamar%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.bumn_users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active applicant account not found.'; END IF;

  SELECT * INTO v_job FROM public.bumn_jobs
  WHERE id = p_job_id AND publication_status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Published job not found.'; END IF;
  IF v_job.closing_at IS NOT NULL AND v_job.closing_at < (timezone('UTC', now()))::date THEN
    RAISE EXCEPTION 'Job application deadline has passed.';
  END IF;

  INSERT INTO public.bumn_application_counters(application_year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (application_year) DO UPDATE
  SET last_number = public.bumn_application_counters.last_number + 1
  RETURNING last_number INTO v_number;

  INSERT INTO public.bumn_lamar(
    application_number, user_id, job_id, status, full_name, email, phone
  )
  VALUES (
    'BL-' || v_year::text || '-' || lpad(v_number::text, 6, '0'),
    v_user.id, v_job.id, 'draft', v_user.full_name, v_user.email, v_user.phone
  )
  RETURNING * INTO v_application;

  RETURN v_application;
END;
$$;

-- Atomic submit validation against the selected job's education requirement.
CREATE OR REPLACE FUNCTION public.submit_bumn_lamar(
  p_application_id uuid,
  p_user_id uuid
)
RETURNS public.bumn_lamar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_application public.bumn_lamar%ROWTYPE;
  v_job public.bumn_jobs%ROWTYPE;
  v_required_rank integer;
  v_applicant_rank integer;
BEGIN
  SELECT * INTO v_application
  FROM public.bumn_lamar
  WHERE id = p_application_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found.'; END IF;
  IF v_application.status <> 'draft' THEN RAISE EXCEPTION 'Only draft applications can be submitted.'; END IF;

  SELECT * INTO v_job FROM public.bumn_jobs
  WHERE id = v_application.job_id AND publication_status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Job is no longer available.'; END IF;
  IF v_job.closing_at IS NOT NULL AND v_job.closing_at < (timezone('UTC', now()))::date THEN
    RAISE EXCEPTION 'Job application deadline has passed.';
  END IF;

  SELECT min(level_rank) INTO v_required_rank
  FROM (VALUES
    ('SMA', 1), ('SMK', 1), ('SLTA', 1),
    ('D1', 2), ('D2', 3), ('D3', 4),
    ('D4', 5), ('S1', 5), ('S2', 6), ('S3', 7)
  ) AS levels(token, level_rank)
  WHERE upper(coalesce(v_job.education, '')) ~
    ('(^|[^A-Z0-9])' || levels.token || '([^A-Z0-9]|$)');

  IF v_required_rank IS NULL THEN
    RAISE EXCEPTION 'Job education requirement cannot be validated. Contact the administrator.';
  END IF;

  v_applicant_rank := CASE upper(trim(coalesce(v_application.education_level, '')))
    WHEN 'SMA/SMK' THEN 1
    WHEN 'D1' THEN 2
    WHEN 'D2' THEN 3
    WHEN 'D3' THEN 4
    WHEN 'D4' THEN 5
    WHEN 'S1' THEN 5
    WHEN 'S2' THEN 6
    WHEN 'S3' THEN 7
    ELSE NULL
  END;

  IF v_applicant_rank IS NULL OR v_applicant_rank < v_required_rank THEN
    RAISE EXCEPTION 'Applicant education level does not meet the job requirement.';
  END IF;

  IF nullif(trim(coalesce(v_application.full_name, '')), '') IS NULL OR
     nullif(trim(coalesce(v_application.email, '')), '') IS NULL OR
     nullif(trim(coalesce(v_application.cv_summary, '')), '') IS NULL OR
     jsonb_array_length(v_application.cv_skills) = 0 OR
     nullif(trim(coalesce(v_application.education_institution, '')), '') IS NULL OR
     nullif(trim(coalesce(v_application.education_major, '')), '') IS NULL OR
     v_application.education_graduation_year IS NULL THEN
    RAISE EXCEPTION 'Complete applicant identity, CV, and education data before submission.';
  END IF;

  IF v_application.identity_card_file_path IS NULL THEN
    RAISE EXCEPTION 'Identity card document is required.';
  END IF;

  IF v_required_rank = 1 THEN
    IF v_application.high_school_diploma_file_path IS NULL THEN
      RAISE EXCEPTION 'High-school diploma document is required for this job.';
    END IF;
  ELSE
    IF v_application.diploma_file_path IS NULL THEN
      RAISE EXCEPTION 'Diploma document matching the job education level is required.';
    END IF;
  END IF;

  UPDATE public.bumn_lamar
  SET status = 'submitted', submitted_at = now()
  WHERE id = p_application_id AND user_id = p_user_id AND status = 'draft'
  RETURNING * INTO v_application;

  IF NOT FOUND THEN RAISE EXCEPTION 'Application state changed. Reload and try again.'; END IF;
  RETURN v_application;
END;
$$;

-- All private tables remain inaccessible through the public Data API.
ALTER TABLE public.bumn_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bumn_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bumn_application_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bumn_lamar_status_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bumn_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.bumn_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.bumn_application_counters FROM anon, authenticated;
REVOKE ALL ON TABLE public.bumn_lamar_status_history FROM anon, authenticated;
GRANT ALL ON TABLE public.bumn_sessions TO service_role;
GRANT ALL ON TABLE public.bumn_rate_limits TO service_role;
GRANT ALL ON TABLE public.bumn_application_counters TO service_role;
GRANT ALL ON TABLE public.bumn_lamar_status_history TO service_role;

REVOKE ALL ON TABLE public.bumn_users FROM anon, authenticated;
REVOKE ALL ON TABLE public.bumn_lamar FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bumn_jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.bumn_jobs TO anon, authenticated;
GRANT ALL ON TABLE public.bumn_users TO service_role;
GRANT ALL ON TABLE public.bumn_lamar TO service_role;
GRANT ALL ON TABLE public.bumn_jobs TO service_role;

REVOKE ALL ON FUNCTION public.capture_bumn_lamar_status_history() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hash_bumn_password(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_bumn_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_bumn_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_bumn_lamar_draft(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_bumn_lamar(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.hash_bumn_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_bumn_password(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_bumn_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_bumn_lamar_draft(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_bumn_lamar(uuid, uuid) TO service_role;

COMMENT ON TABLE public.bumn_sessions IS 'Opaque custom-auth sessions. Only SHA-256 token hashes are stored.';
COMMENT ON TABLE public.bumn_rate_limits IS 'Atomic database-backed rate-limit buckets; keys are hashed by Edge Functions.';
COMMENT ON TABLE public.bumn_lamar_status_history IS 'Append-only application status transition history.';
