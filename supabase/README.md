# BUMN Backend

Backend custom-authentication untuk portal lowongan dan lamaran BUMN.

## Struktur

- `migrations/`: migration database berurutan; jangan mengubah migration yang sudah pernah diterapkan.
- `functions/get-bumn-jobs`: API publik untuk lowongan yang berstatus `published`.
- `functions/bumn-auth`: register, login, session, profil, dan avatar.
- `functions/bumn-lamar`: draft, pengelolaan lamaran, dokumen privat, submit, dan withdraw.
- `functions/_shared/security.ts`: CORS, session, rate limit, dan helper Supabase.

## Tabel inti

- `public.bumn_users`: akun custom phone/password. Password hanya disimpan sebagai bcrypt hash (pgcrypto cost 12).
- `public.bumn_jobs`: lowongan, status publikasi, dan status verifikasi.
- `public.bumn_lamar`: data lamaran, pendidikan, pengalaman, dan metadata dokumen.

Tabel pendukung internal:
- `bumn_sessions`: hash token sesi, masa berlaku, dan pencabutan.
- `bumn_rate_limits`: penghitung rate limit atomik.
- `bumn_application_counters`: nomor lamaran tahunan yang atomik.
- `bumn_lamar_status_history`: riwayat perubahan status.

Tabel pendukung memakai RLS dan tidak diberikan akses langsung ke `anon` atau `authenticated`. Operasi privat dilakukan oleh Edge Functions dengan service role dan pemeriksaan sesi/kepemilikan.

## Secrets

Edge Functions memerlukan secrets bawaan:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` atau `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `BUMN_ALLOWED_ORIGINS`: comma-separated origin allowlist. Default saat tidak diatur: `https://gantulu.github.io,http://localhost:5173,http://127.0.0.1:5173`.

Jangan pernah menaruh service role key atau password di frontend.

## Session

- Login/register menghasilkan opaque session token acak.
- Database hanya menyimpan SHA-256 hash token.
- Masa berlaku token: 7 hari.
- Kirim token sebagai `Authorization: Bearer <session_token>` atau field `session_token` untuk multipart upload.
- Logout mencabut token pada database.
- Browser menyimpan token sesi, bukan password.

## API

Base URL:
`https://zyiavfljweavoxyyplxj.supabase.co/functions/v1`

### `GET /get-bumn-jobs?limit=50&offset=0`

Public read; pagination limit 1–100. Hanya lowongan `publication_status = published`. Respons mempertahankan bentuk `success/data/pagination`.

### `POST /bumn-auth`

Actions:
- `check-phone`: pemeriksaan nomor untuk kompatibilitas alur UI; dibatasi rate limit.
- `register`: `full_name, phone, email?, password`.
- `login`: `phone, password`.
- `get-profile`, `update-profile`, `upload-avatar`, `delete-avatar`, `logout`: memerlukan session token.

Password minimal 8 karakter dan maksimal 72 byte UTF-8 (batas bcrypt).

### `POST /bumn-lamar`

Actions:
- `create`: `job_id`; membuat draft dan application number secara atomik.
- `list`: `limit?, offset?, status?`.
- `get`: `application_id`.
- `update`: `application_id, data`; hanya draft.
- `submit`: `application_id`; validasi backend atomik.
- `withdraw`: `application_id`.
- `delete-draft`: `application_id`.
- `upload-document`: multipart `application_id, document_type, file, session_token`.
- `delete-document`: `application_id, document_type`.
- `get-document-url`: `application_id, document_type`.

Document types: `diploma`, `high_school_diploma`, `identity_card`. File PDF/JPG/PNG, maksimal 5 MiB, signature diperiksa, disimpan di bucket private `bumn-lamar-documents`, signed URL berlaku 5 menit.

### Submit validation

Submit memeriksa:
- Sesi aktif dan pemilik lamaran.
- Status masih draft.
- Lowongan masih published dan belum melewati deadline.
- Jenjang pendidikan pelamar memenuhi level minimum yang dapat dikenali dari `bumn_jobs.education`.
- Identitas, email, ringkasan CV, keahlian, institusi, jurusan, dan tahun kelulusan terisi.
- KTP wajib.
- Ijazah D1–S3 wajib untuk lowongan dengan persyaratan D1 ke atas; ijazah SMA/SMK wajib untuk lowongan dengan persyaratan SMA/SMK.

Persyaratan kualifikasi non-pendidikan pada `bumn_jobs.qualifications` tetap disajikan sebagai persyaratan lowongan. Karena saat ini berupa teks bebas, tidak diubah menjadi aturan otomatis yang tidak dapat diverifikasi.

## Job verification

- `sample`: baris yang memiliki penanda SAMPLE/CONTOH DATA.
- `unverified`: belum memiliki bukti verifikasi sumber.
- `verified`: hanya boleh ditetapkan setelah sumber resmi diverifikasi.
- Penambahan metadata tidak menghapus atau mengubah isi lowongan lama.
- `source_url` disediakan untuk referensi sumber resmi.

## Deploy

Deploy ketiga fungsi dengan `verify_jwt=false` karena autentikasi aplikasi diverifikasi oleh custom session middleware. Jangan mengaktifkan JWT gateway tanpa migrasi kontrak client.

Saat deploy melalui Supabase Dashboard/CLI, sertakan file `../_shared/security.ts` sebagai dependency untuk masing-masing Edge Function.

## Operational verification

1. Periksa migration history dan schema live.
2. Jalankan Supabase Security dan Performance Advisors.
3. Jalankan `deno check` pada ketiga Edge Function.
4. Jalankan `npm run build` untuk client.
5. Smoke-test public jobs endpoint.
6. Uji register/login/logout, expired/revoked session, rate limit, ownership, file signature/size, submit validation, duplicate application, dan concurrent application number di environment test sebelum rilis.
