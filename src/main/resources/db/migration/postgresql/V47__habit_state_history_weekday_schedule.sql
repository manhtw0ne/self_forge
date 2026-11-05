ALTER TABLE habit_state_history ADD COLUMN IF NOT EXISTS scheduled_days VARCHAR(27);

-- State history predates explicit weekday choice. Its recorded target was already
-- interpreted as Monday-first, so preserve that meaning for historical streaks.
UPDATE habit_state_history
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
