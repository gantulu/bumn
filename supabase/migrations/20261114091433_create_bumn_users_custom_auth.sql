create table public.bumn_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  password_hash text not null,
  birth_place text,
  birth_date date,
  gender text,
  address text,
  city text,
  province text,
  postal_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bumn_users_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint bumn_users_email_not_blank check (length(trim(email)) > 0),
  constraint bumn_users_password_hash_not_blank check (length(trim(password_hash)) > 0)
);
create unique index bumn_users_email_lower_uidx on public.bumn_users (lower(email));
alter table public.bumn_users enable row level security;
revoke all on table public.bumn_users from anon, authenticated;
grant all on table public.bumn_users to service_role;
comment on table public.bumn_users is
  'Custom application user accounts and applicant profiles. Authentication is managed by application Edge Functions, not Supabase Auth.';
comment on column public.bumn_users.password_hash is
  'Password hash only (Argon2id or bcrypt). Never store plaintext passwords or return this column from API responses.';
comment on column public.bumn_users.email is
  'Applicant email. Application must normalize email to lowercase before insert/update.';
