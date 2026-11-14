-- CV V1: structured applicant master profile and immutable per-application snapshot.
ALTER TABLE public.bumn_users
  ADD COLUMN IF NOT EXISTS cv_headline text,
  ADD COLUMN IF NOT EXISTS cv_summary text,
  ADD COLUMN IF NOT EXISTS cv_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_portfolio_url text,
  ADD COLUMN IF NOT EXISTS cv_linkedin_url text,
  ADD COLUMN IF NOT EXISTS cv_website_url text,
  ADD COLUMN IF NOT EXISTS cv_file_path text,
  ADD COLUMN IF NOT EXISTS cv_updated_at timestamptz;

ALTER TABLE public.bumn_lamar
  ADD COLUMN IF NOT EXISTS cv_snapshot jsonb;

ALTER TABLE public.bumn_users
  ADD CONSTRAINT bumn_users_cv_skills_array_check
    CHECK (jsonb_typeof(cv_skills) = 'array' AND jsonb_array_length(cv_skills) <= 100),
  ADD CONSTRAINT bumn_users_cv_education_array_check
    CHECK (jsonb_typeof(cv_education) = 'array' AND jsonb_array_length(cv_education) <= 50),
  ADD CONSTRAINT bumn_users_cv_experiences_array_check
    CHECK (jsonb_typeof(cv_experiences) = 'array' AND jsonb_array_length(cv_experiences) <= 50),
  ADD CONSTRAINT bumn_users_cv_certifications_array_check
    CHECK (jsonb_typeof(cv_certifications) = 'array' AND jsonb_array_length(cv_certifications) <= 100),
  ADD CONSTRAINT bumn_users_cv_languages_array_check
    CHECK (jsonb_typeof(cv_languages) = 'array' AND jsonb_array_length(cv_languages) <= 50);

ALTER TABLE public.bumn_lamar
  ADD CONSTRAINT bumn_lamar_cv_snapshot_object_check
    CHECK (cv_snapshot IS NULL OR jsonb_typeof(cv_snapshot) = 'object');

COMMENT ON COLUMN public.bumn_users.cv_education IS
  'Structured CV education entries. Each item contains level, institution, major, degree, start_year, graduation_year, and gpa.';
COMMENT ON COLUMN public.bumn_users.cv_experiences IS
  'Structured CV experience entries. Each item contains company, position, employment_type, location, start_date, end_date, is_current, description, and responsibilities.';
COMMENT ON COLUMN public.bumn_users.cv_file_path IS
  'Reserved private Storage object path for a future uploaded CV file. PDF parsing is not part of CV V1.';
COMMENT ON COLUMN public.bumn_lamar.cv_snapshot IS
  'Versioned copy of applicant identity and structured CV data captured for this application; independent of future profile edits.';

CREATE OR REPLACE FUNCTION public.create_bumn_lamar_draft(
  p_user_id uuid,
  p_job_id text
)
RETURNS public.bumn_lamar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_year integer := extract(year FROM timezone('UTC', now()))::integer;
  v_number integer;
  v_user public.bumn_users%ROWTYPE;
  v_job public.bumn_jobs%ROWTYPE;
  v_application public.bumn_lamar%ROWTYPE;
  v_education jsonb;
  v_experience jsonb;
  v_snapshot jsonb;
BEGIN
  SELECT * INTO v_user
  FROM public.bumn_users
  WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active applicant account not found.'; END IF;

  SELECT * INTO v_job
  FROM public.bumn_jobs
  WHERE id = p_job_id AND publication_status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Published job not found.'; END IF;
  IF v_job.closing_at IS NOT NULL AND v_job.closing_at < (timezone('UTC', now()))::date THEN
    RAISE EXCEPTION 'Job application deadline has passed.';
  END IF;

  v_education := coalesce(v_user.cv_education -> 0, '{}'::jsonb);
  v_experience := coalesce(v_user.cv_experiences -> 0, '{}'::jsonb);

  v_snapshot := jsonb_build_object(
    'version', 1,
    'captured_at', now(),
    'identity', jsonb_build_object(
      'full_name', v_user.full_name,
      'email', v_user.email,
      'phone', v_user.phone,
      'birth_place', v_user.birth_place,
      'birth_date', v_user.birth_date,
      'gender', v_user.gender,
      'address', v_user.address,
      'city', v_user.city,
      'province', v_user.province,
      'postal_code', v_user.postal_code
    ),
    'cv', jsonb_build_object(
      'headline', v_user.cv_headline,
      'summary', v_user.cv_summary,
      'skills', coalesce(v_user.cv_skills, '[]'::jsonb),
      'education', coalesce(v_user.cv_education, '[]'::jsonb),
      'experiences', coalesce(v_user.cv_experiences, '[]'::jsonb),
      'certifications', coalesce(v_user.cv_certifications, '[]'::jsonb),
      'languages', coalesce(v_user.cv_languages, '[]'::jsonb),
      'portfolio_url', v_user.cv_portfolio_url,
      'linkedin_url', v_user.cv_linkedin_url,
      'website_url', v_user.cv_website_url
    )
  );

  INSERT INTO public.bumn_application_counters(application_year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (application_year) DO UPDATE
  SET last_number = public.bumn_application_counters.last_number + 1
  RETURNING last_number INTO v_number;

  INSERT INTO public.bumn_lamar(
    application_number, user_id, job_id, status, full_name, email, phone,
    cv_title, cv_summary, cv_skills, cv_portfolio_url, cv_snapshot,
    education_level, education_institution, education_major, education_degree,
    education_start_year, education_graduation_year, education_gpa,
    education_description, cv_education_summary,
    experience_type, experience_company, experience_position,
    experience_employment_type, experience_location, experience_start_date,
    experience_end_date, experience_is_current, experience_description,
    experience_responsibilities, cv_experience_summary
  )
  VALUES (
    'BL-' || v_year::text || '-' || lpad(v_number::text, 6, '0'),
    v_user.id, v_job.id, 'draft', v_user.full_name, v_user.email, v_user.phone,
    v_user.cv_headline, v_user.cv_summary, coalesce(v_user.cv_skills, '[]'::jsonb),
    v_user.cv_portfolio_url, v_snapshot,
    nullif(v_education->>'level', ''),
    nullif(v_education->>'institution', ''),
    nullif(v_education->>'major', ''),
    nullif(v_education->>'degree', ''),
    CASE WHEN (v_education->>'start_year') ~ '^\d{4}$' THEN (v_education->>'start_year')::integer END,
    CASE WHEN (v_education->>'graduation_year') ~ '^\d{4}$' THEN (v_education->>'graduation_year')::integer END,
    CASE WHEN (v_education->>'gpa') ~ '^\d+(\.\d{1,2})?$' THEN (v_education->>'gpa')::numeric(4,2) END,
    nullif(v_education->>'description', ''),
    nullif(concat_ws(' · ', nullif(v_education->>'institution',''), nullif(v_education->>'major','')), ''),
    nullif(v_experience->>'type', ''),
    nullif(v_experience->>'company', ''),
    nullif(v_experience->>'position', ''),
    nullif(v_experience->>'employment_type', ''),
    nullif(v_experience->>'location', ''),
    CASE WHEN (v_experience->>'start_date') ~ '^\d{4}-\d{2}-\d{2}$' THEN (v_experience->>'start_date')::date END,
    CASE WHEN (v_experience->>'end_date') ~ '^\d{4}-\d{2}-\d{2}$' THEN (v_experience->>'end_date')::date END,
    coalesce((v_experience->>'is_current')::boolean, false),
    nullif(v_experience->>'description', ''),
    CASE WHEN jsonb_typeof(v_experience->'responsibilities') = 'array'
      THEN v_experience->'responsibilities' ELSE '[]'::jsonb END,
    nullif(concat_ws(' · ', nullif(v_experience->>'position',''), nullif(v_experience->>'company','')), '')
  )
  RETURNING * INTO v_application;

  RETURN v_application;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_bumn_lamar_draft(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_bumn_lamar_draft(uuid, text) TO service_role;
