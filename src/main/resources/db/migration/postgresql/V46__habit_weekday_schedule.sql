ALTER TABLE habit ADD COLUMN IF NOT EXISTS scheduled_days VARCHAR(27);

-- The old application already interpreted a weekly target as Mon-first required days.
-- Materialise that legacy behaviour so existing users see, and may now change, their real schedule.
UPDATE habit
SET scheduled_days = CASE target_per_week
    WHEN 1 THEN 'MON'
    WHEN 2 THEN 'MON,TUE'
    WHEN 3 THEN 'MON,TUE,WED'
    WHEN 4 THEN 'MON,TUE,WED,THU'
    WHEN 5 THEN 'MON,TUE,WED,THU,FRI'
    WHEN 6 THEN 'MON,TUE,WED,THU,FRI,SAT'
    ELSE 'MON,TUE,WED,THU,FRI,SAT,SUN'
END
WHERE scheduled_days IS NULL OR scheduled_days = '';

ALTER TABLE daily_check_in ADD COLUMN IF NOT EXISTS scheduled_days_snapshot VARCHAR(27);
