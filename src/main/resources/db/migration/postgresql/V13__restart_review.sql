CREATE TABLE restart_review (
 user_id BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
 plan_version BIGINT NOT NULL,
 revision BIGINT NOT NULL,
 days_tried INTEGER NOT NULL CHECK (days_tried BETWEEN 0 AND 3),
 decision VARCHAR(16) NOT NULL CHECK (decision IN ('KEEP','EASIER','HARDER','PAUSE')),
 note VARCHAR(500) NOT NULL
);
