CREATE TABLE IF NOT EXISTS document_uploads (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  review_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS document_uploads_customer_title_idx
  ON document_uploads (customer_id, title, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS payment_sessions (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  checkout_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_sessions_customer_created_idx
  ON payment_sessions (customer_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS payment_sessions_provider_reference_unique
  ON payment_sessions (provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

ALTER TABLE otp_challenges
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'sms';

ALTER TABLE otp_challenges
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'console';

ALTER TABLE otp_challenges
  ADD COLUMN IF NOT EXISTS delivery_reference TEXT;
