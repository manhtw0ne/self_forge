ALTER TABLE weekly_coach_advice
    ADD COLUMN helpfulness_rating INTEGER;
ALTER TABLE weekly_coach_advice
    ADD COLUMN follow_up_decision VARCHAR(16);
ALTER TABLE weekly_coach_advice
    ADD CONSTRAINT ck_weekly_coach_advice_helpfulness_rating
        CHECK (helpfulness_rating IS NULL OR helpfulness_rating BETWEEN 1 AND 5);
ALTER TABLE weekly_coach_advice
    ADD CONSTRAINT ck_weekly_coach_advice_follow_up_decision
        CHECK (follow_up_decision IS NULL OR follow_up_decision IN ('WILL_TRY', 'NOT_NOW'));

CREATE INDEX ix_weekly_coach_advice_created_at ON weekly_coach_advice (created_at);
