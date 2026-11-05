-- JOURNAL was added to the Java feature enum after the original usage table.
-- Keep the database constraint aligned so a configured journal coach can
-- reserve its monthly quota without failing on PostgreSQL.
ALTER TABLE ai_coach_usage DROP CONSTRAINT IF EXISTS ck_ai_coach_usage_feature;
ALTER TABLE ai_coach_usage ADD CONSTRAINT ck_ai_coach_usage_feature
    CHECK (feature IN ('WEEKLY', 'GOAL', 'RESTART', 'JOURNAL'));
