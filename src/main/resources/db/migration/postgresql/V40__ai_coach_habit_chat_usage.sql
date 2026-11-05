-- CHAT remains a deliberately small, optional question-and-answer feature.
ALTER TABLE ai_coach_usage DROP CONSTRAINT IF EXISTS ck_ai_coach_usage_feature;
ALTER TABLE ai_coach_usage ADD CONSTRAINT ck_ai_coach_usage_feature
    CHECK (feature IN ('WEEKLY', 'GOAL', 'RESTART', 'JOURNAL', 'DAILY_FOCUS', 'CHAT'));
