alter table public.bumn_users alter column email drop not null;
create unique index bumn_users_phone_uidx on public.bumn_users (phone) where phone is not null;
alter table public.bumn_users add column avatar text;
comment on column public.bumn_users.avatar is 'Applicant avatar URL or storage path.';
