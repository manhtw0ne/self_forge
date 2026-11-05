ALTER TABLE feedback_submission
    ADD COLUMN operator_status VARCHAR(16) NOT NULL DEFAULT 'NEW';

ALTER TABLE feedback_submission
    ADD COLUMN operator_note VARCHAR(500) NOT NULL DEFAULT '';

ALTER TABLE feedback_submission
    ADD COLUMN operator_updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE feedback_submission
    ADD CONSTRAINT ck_feedback_submission_operator_status
        CHECK (operator_status IN ('NEW', 'REVIEWED', 'PLANNED', 'RESOLVED', 'NOT_ACTIONED'));

CREATE INDEX ix_feedback_submission_operator_status_id
    ON feedback_submission (operator_status, id DESC);
