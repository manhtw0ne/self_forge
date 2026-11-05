-- Preserve the schedule used when a check-in was recorded. Do not invent legacy history.
ALTER TABLE daily_check_in ADD COLUMN target_per_week_snapshot INTEGER;
ALTER TABLE daily_check_in ADD CONSTRAINT ck_check_in_target_per_week_snapshot
    CHECK (target_per_week_snapshot IS NULL OR target_per_week_snapshot BETWEEN 1 AND 7);
