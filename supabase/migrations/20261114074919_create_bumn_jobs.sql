create table public.bumn_jobs (
  id text primary key,
  title text not null,
  company text not null,
  category text not null,
  location text not null,
  employment_type text not null,
  education text not null,
  salary_min bigint,
  salary_max bigint,
  salary_currency text,
  description text not null,
  qualifications jsonb not null default '[]'::jsonb,
  closing_at date,
  verification_status text not null default 'sample',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bumn_jobs_qualifications_is_array check (jsonb_typeof(qualifications) = 'array'),
  constraint bumn_jobs_salary_range_valid check (
    (salary_min is null and salary_max is null)
    or (salary_min is not null and salary_max is not null and salary_min <= salary_max)
  ),
  constraint bumn_jobs_salary_currency_required check (
    (salary_min is null and salary_max is null and salary_currency is null)
    or (salary_min is not null and salary_max is not null and salary_currency is not null)
  )
);
create index bumn_jobs_category_idx on public.bumn_jobs (category);
create index bumn_jobs_company_idx on public.bumn_jobs (company);
create index bumn_jobs_closing_at_idx on public.bumn_jobs (closing_at);
alter table public.bumn_jobs enable row level security;
create policy "Public can read BUMN job listings"
on public.bumn_jobs for select to anon, authenticated using (true);
grant select on public.bumn_jobs to anon, authenticated;
comment on table public.bumn_jobs is
  'BUMN job listings. Public read-only access; writes are reserved for trusted backend operations.';
comment on column public.bumn_jobs.qualifications is 'JSON array of qualification strings.';
comment on column public.bumn_jobs.verification_status is
  'Verification state of the listing, e.g. sample, pending, verified.';
