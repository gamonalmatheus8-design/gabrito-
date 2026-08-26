-- Esquema de referência para a migração do file-adapter para PostgreSQL.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL DEFAULT 0,
  snapshot JSONB,
  updated_at TIMESTAMPTZ
);
CREATE TABLE editorial_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
  custom JSONB NOT NULL DEFAULT '[]'::jsonb,
  disabled JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ
);
CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  user_id TEXT,
  role TEXT,
  request_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);
