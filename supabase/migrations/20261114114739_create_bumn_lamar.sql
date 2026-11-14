-- BUMN job application table.
CREATE TABLE public.bumn_lamar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.bumn_users(id),
    job_id TEXT NOT NULL REFERENCES public.bumn_jobs(id),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','submitted','reviewing','shortlisted','rejected','accepted','withdrawn')),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    cv_title TEXT,
    cv_summary TEXT,
    cv_skills JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(cv_skills) = 'array'),
    cv_education_summary TEXT,
    cv_experience_summary TEXT,
    cv_portfolio_url TEXT,
    cover_letter_subject TEXT,
    cover_letter_content TEXT,
    cover_letter_created_at TIMESTAMPTZ,
    diploma_file_name TEXT,
    diploma_file_path TEXT,
    diploma_file_type TEXT,
    diploma_file_size BIGINT CHECK (diploma_file_size IS NULL OR diploma_file_size >= 0),
    diploma_uploaded_at TIMESTAMPTZ,
    identity_card_file_name TEXT,
    identity_card_file_path TEXT,
    identity_card_file_type TEXT,
    identity_card_file_size BIGINT CHECK (identity_card_file_size IS NULL OR identity_card_file_size >= 0),
    identity_card_uploaded_at TIMESTAMPTZ,
    education_level TEXT,
    education_institution TEXT,
    education_major TEXT,
    education_degree TEXT,
    education_start_year INTEGER,
    education_graduation_year INTEGER,
    education_gpa NUMERIC(4,2),
    education_description TEXT,
    experience_type TEXT,
    experience_company TEXT,
    experience_position TEXT,
    experience_employment_type TEXT,
    experience_location TEXT,
    experience_start_date DATE,
    experience_end_date DATE,
    experience_is_current BOOLEAN NOT NULL DEFAULT FALSE,
    experience_description TEXT,
    experience_responsibilities JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(experience_responsibilities) = 'array'),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bumn_lamar_education_year_check CHECK (
        education_start_year IS NULL OR education_graduation_year IS NULL OR education_graduation_year >= education_start_year
    ),
    CONSTRAINT bumn_lamar_experience_date_check CHECK (
        experience_start_date IS NULL OR experience_end_date IS NULL OR experience_end_date >= experience_start_date
    ),
    CONSTRAINT bumn_lamar_experience_current_check CHECK (
        experience_is_current = FALSE OR experience_end_date IS NULL
    )
);
CREATE INDEX idx_bumn_lamar_user_id ON public.bumn_lamar(user_id);
CREATE INDEX idx_bumn_lamar_job_id ON public.bumn_lamar(job_id);
CREATE INDEX idx_bumn_lamar_status ON public.bumn_lamar(status);
CREATE INDEX idx_bumn_lamar_created_at ON public.bumn_lamar(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_bumn_lamar_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_bumn_lamar_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_bumn_lamar_updated_at
BEFORE UPDATE ON public.bumn_lamar
FOR EACH ROW EXECUTE FUNCTION public.set_bumn_lamar_updated_at();

ALTER TABLE public.bumn_lamar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bumn_lamar FROM anon, authenticated;
GRANT ALL ON TABLE public.bumn_lamar TO service_role;

COMMENT ON TABLE public.bumn_lamar IS
'Applicant job applications. Access is managed by the bumn-lamar Edge Function using service_role.';
COMMENT ON COLUMN public.bumn_lamar.cv_skills IS
'JSON array of CV skills; CV itself is structured text data, not a Storage upload.';
COMMENT ON COLUMN public.bumn_lamar.experience_responsibilities IS
'JSON array of experience responsibilities.';
