-- Farmer profile data. Identity (email/password) lives in Neon Auth (neon_auth schema).
CREATE TABLE IF NOT EXISTS farmers (
  neon_user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  phone_no TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL CHECK (LENGTH(username) >= 3),
  role TEXT NOT NULL CHECK (role IN ('Farmer', 'Logistics')),
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
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS farmers_email_lower ON farmers (LOWER(email));
DROP INDEX IF EXISTS farmers_phone_no;
CREATE UNIQUE INDEX IF NOT EXISTS farmers_phone_no ON farmers (phone_no) WHERE length(trim(phone_no)) > 0;
UPDATE farmers SET phone_no = '', updated_at = now() WHERE length(trim(phone_no)) > 0;

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logistics_jobs_status_state
  ON logistics_jobs (status, pickup_state);
CREATE INDEX IF NOT EXISTS logistics_jobs_farmer
  ON logistics_jobs (farmer_id);
