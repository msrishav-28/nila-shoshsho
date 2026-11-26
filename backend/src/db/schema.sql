-- Farmer profile data. Identity (email/password) lives in Neon Auth (neon_auth schema).
CREATE TABLE IF NOT EXISTS farmers (
  neon_user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  phone_no TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL CHECK (LENGTH(username) >= 3),
  role TEXT NOT NULL CHECK (role IN ('Farmer', 'Logistics')),
  profile_version BIGINT NOT NULL DEFAULT 0,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  dob DATE,
  age BIGINT,
  profile_pic TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL DEFAULT 0,
  lon DOUBLE PRECISION NOT NULL DEFAULT 0,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  gov_id_name TEXT NOT NULL DEFAULT '',
  gov_id_value TEXT NOT NULL DEFAULT '',
  language_spoken TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  documents TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS farmers_email_lower ON farmers (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS farmers_phone_no ON farmers (phone_no) WHERE length(trim(phone_no)) > 0;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers (neon_user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_farmer_created
  ON notifications (farmer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS logistics_jobs (
  job_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers (neon_user_id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  pickup_city TEXT NOT NULL DEFAULT '',
  pickup_state TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACCEPTED', 'DONE', 'CANCELED')),
  accepted_by UUID REFERENCES farmers (neon_user_id),
  idempotency_key TEXT,
  request_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logistics_jobs_status_state
  ON logistics_jobs (status, pickup_state);
CREATE INDEX IF NOT EXISTS logistics_jobs_farmer
  ON logistics_jobs (farmer_id);
CREATE UNIQUE INDEX IF NOT EXISTS logistics_jobs_request_key
  ON logistics_jobs (farmer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Review decisions have their own provenance. Legacy profile flags confer no approval.
CREATE TABLE IF NOT EXISTS account_reviews (
  farmer_id UUID NOT NULL REFERENCES farmers(neon_user_id),
  kind TEXT NOT NULL CHECK (kind IN ('carrier', 'identity')),
  approved BOOLEAN NOT NULL,
  reviewed_by UUID NOT NULL REFERENCES farmers(neon_user_id),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_value TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (farmer_id, kind),
  CHECK (farmer_id <> reviewed_by)
);

CREATE TABLE IF NOT EXISTS account_review_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(neon_user_id),
  kind TEXT NOT NULL CHECK (kind IN ('carrier', 'identity')),
  approved BOOLEAN NOT NULL,
  reviewed_by UUID NOT NULL REFERENCES farmers(neon_user_id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (farmer_id <> reviewed_by)
);

CREATE TABLE IF NOT EXISTS pending_uploads (
  public_id TEXT PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(neon_user_id),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('image','raw')),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('private','upload')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pending_uploads
  DROP CONSTRAINT IF EXISTS pending_uploads_delivery_type_check,
  ADD CONSTRAINT pending_uploads_delivery_type_check
    CHECK (delivery_type IN ('private','upload','authenticated'));

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS revoked_tokens_expiry ON revoked_tokens(expires_at);

CREATE TABLE IF NOT EXISTS account_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(neon_user_id) ON DELETE CASCADE,
  encrypted_cookie TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS account_sessions_farmer ON account_sessions(farmer_id);
CREATE INDEX IF NOT EXISTS account_sessions_expiry ON account_sessions(expires_at);

CREATE TABLE IF NOT EXISTS voice_callbacks (
  id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(neon_user_id) ON DELETE CASCADE,
  request_key TEXT NOT NULL,
  call_day DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  daily_slot INTEGER NOT NULL CHECK (daily_slot BETWEEN 1 AND 50),
  status TEXT NOT NULL CHECK (status IN ('submitting','queued','in_progress','completed','failed','unknown')),
  execution_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, request_key),
  UNIQUE (farmer_id, call_day),
  UNIQUE (call_day, daily_slot)
);

CREATE TABLE IF NOT EXISTS farm_plots (
  plot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(neon_user_id) ON DELETE CASCADE,
  crop TEXT NOT NULL CHECK (length(crop) BETWEEN 1 AND 120),
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
  area_acres NUMERIC NOT NULL CHECK (area_acres > 0 AND area_acres <= 100000),
  sowing_date DATE NOT NULL,
  request_key TEXT NOT NULL,
  request_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, request_key)
);
CREATE INDEX IF NOT EXISTS farm_plots_farmer_created ON farm_plots(farmer_id, created_at DESC, plot_id);
