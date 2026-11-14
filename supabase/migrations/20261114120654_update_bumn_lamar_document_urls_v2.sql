alter table public.bumn_lamar
  add column if not exists diploma_url text,
  add column if not exists high_school_diploma_url text,
  add column if not exists identity_card_url text;

alter table public.bumn_lamar
  drop column if exists diploma_file_name,
  drop column if exists diploma_file_path,
  drop column if exists diploma_file_type,
  drop column if exists diploma_file_size,
  drop column if exists diploma_uploaded_at,
  drop column if exists identity_card_file_name,
  drop column if exists identity_card_file_path,
  drop column if exists identity_card_file_type,
  drop column if exists identity_card_file_size,
  drop column if exists identity_card_uploaded_at;

comment on column public.bumn_lamar.diploma_url is
  'Image URL for diploma document required by the job education requirements.';
comment on column public.bumn_lamar.high_school_diploma_url is
  'Image URL for high school diploma (ijazah SMA).';
comment on column public.bumn_lamar.identity_card_url is
  'Image URL for applicant identity card (KTP).';
