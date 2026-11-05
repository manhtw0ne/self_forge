-- DAILY_FOCUS is intentionally a separate quota from goal/restart/journal coaching.
-- It only ranks the user-selected habits for today and never records progress.
ALTER TABLE ai_coach_usage DROP CONSTRAINT IF EXISTS ck_ai_coach_usage_feature;
ALTER TABLE ai_coach_usage ADD CONSTRAINT ck_ai_coach_usage_feature
    CHECK (feature IN ('WEEKLY', 'GOAL', 'RESTART', 'JOURNAL', 'DAILY_FOCUS'));
