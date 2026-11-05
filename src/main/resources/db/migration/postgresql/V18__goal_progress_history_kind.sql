ALTER TABLE goal_progress_correction ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'CORRECTION';
ALTER TABLE goal_progress_correction ADD CONSTRAINT goal_progress_history_kind CHECK (kind IN ('ADD','CORRECTION'));
