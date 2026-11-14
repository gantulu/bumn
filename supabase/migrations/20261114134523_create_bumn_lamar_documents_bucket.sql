-- BUMN application documents: private bucket, 5 MiB maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bumn-lamar-documents','bumn-lamar-documents',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
