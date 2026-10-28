-- Sentence Quest — schema Neon Postgres.
-- Chay toan bo file nay trong Neon Dashboard > SQL Editor (1 lan duy nhat).
-- Vung khuyen dung: ap-southeast-1 (Singapore).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stars JSONB NOT NULL DEFAULT '{}',
  xp INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  error_box JSONB NOT NULL DEFAULT '[]',
  streak INT NOT NULL DEFAULT 0,
  last_play_date TEXT,
  skipped_groups JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT '',
  correct INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS attempts_created_idx ON attempts (created_at);
CREATE INDEX IF NOT EXISTS attempts_class_idx ON attempts (class_name);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  sentence_id TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT '',
  question_ids JSONB NOT NULL DEFAULT '[]',
  current_index INT NOT NULL DEFAULT 0,
  members JSONB NOT NULL DEFAULT '[]',
  turn_index INT NOT NULL DEFAULT 0,
  team_score INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rooms_pin_idx ON rooms (pin);
