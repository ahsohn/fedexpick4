-- FedEx Pick 4 Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_commissioner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS golfers (
  id SERIAL PRIMARY KEY,
  espn_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  espn_event_id TEXT,
  season_year INTEGER NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'scored')),
  field_last_updated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_field (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  golfer_id INTEGER NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  in_field BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tournament_id, golfer_id)
);

CREATE TABLE IF NOT EXISTS picks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  golfer_id INTEGER NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  pick_type TEXT NOT NULL CHECK (pick_type IN ('starter', 'backup')),
  pick_order INTEGER NOT NULL CHECK (pick_order BETWEEN 1 AND 5),
  was_subbed_out BOOLEAN NOT NULL DEFAULT false,
  was_activated BOOLEAN NOT NULL DEFAULT false,
  fedex_points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tournament_id, golfer_id)
);

CREATE TABLE IF NOT EXISTS standings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, season_year)
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO config (key, value) VALUES ('current_season', '2026')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_picks_user_tournament ON picks(user_id, tournament_id);
CREATE INDEX IF NOT EXISTS idx_picks_tournament ON picks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_field_tournament ON tournament_field(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_season ON tournaments(season_year);
CREATE INDEX IF NOT EXISTS idx_golfers_espn_id ON golfers(espn_id);
