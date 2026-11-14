-- Reconcile the historical custom-auth migration with the live BUMN custom phone/password schema.
-- This preserves the existing custom authentication contract and existing password values.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bumn_users' AND column_name = 'password_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bumn_users' AND column_name = 'password'
  ) THEN
    ALTER TABLE public.bumn_users RENAME COLUMN password_hash TO password;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bumn_users' AND column_name = 'password'
  ) THEN
    ALTER TABLE public.bumn_users ADD COLUMN password TEXT;
  END IF;
END $$;

ALTER TABLE public.bumn_users
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

ALTER TABLE public.bumn_users
  DROP CONSTRAINT IF EXISTS bumn_users_password_hash_not_blank;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bumn_users_password_not_blank'
      AND conrelid = 'public.bumn_users'::regclass
  ) THEN
    ALTER TABLE public.bumn_users
      ADD CONSTRAINT bumn_users_password_not_blank
      CHECK (length(trim(password)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bumn_users_phone_key'
      AND conrelid = 'public.bumn_users'::regclass
  ) THEN
    ALTER TABLE public.bumn_users
      ADD CONSTRAINT bumn_users_phone_key UNIQUE (phone);
  END IF;
END $$;

DROP INDEX IF EXISTS public.bumn_users_phone_uidx;

COMMENT ON COLUMN public.bumn_users.password IS
  'Password field used by the existing custom phone/password authentication implementation.';
