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
  v_major_requirement text;
  v_major_matches boolean;
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

  v_major_requirement := trim(regexp_replace(
    coalesce(v_job.education, ''),
    '^(SMA|SMK|SLTA|D1|D2|D3|D4|S1|S2|S3)([[:space:]]*/[[:space:]]*(SMA|SMK|SLTA|D1|D2|D3|D4|S1|S2|S3))*[[:space:]]*',
    '',
    'i'
  ));

  IF v_major_requirement <> '' AND upper(v_major_requirement) NOT LIKE '%SEMUA JURUSAN%' THEN
    SELECT EXISTS (
      SELECT 1
      FROM regexp_split_to_table(v_major_requirement, '[/,;|]+') AS allowed_major
      WHERE nullif(trim(allowed_major), '') IS NOT NULL
        AND position(upper(trim(allowed_major)) IN upper(coalesce(v_application.education_major, ''))) > 0
    ) INTO v_major_matches;

    IF NOT coalesce(v_major_matches, false) THEN
      RAISE EXCEPTION 'Applicant education major does not meet the job requirement.';
    END IF;
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

REVOKE ALL ON FUNCTION public.submit_bumn_lamar(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_bumn_lamar(uuid, uuid) TO service_role;