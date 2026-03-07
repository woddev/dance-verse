
ALTER TABLE deals.tracks ADD COLUMN IF NOT EXISTS google_drive_url TEXT;
ALTER TABLE deals.contracts ADD COLUMN IF NOT EXISTS google_drive_url TEXT;
