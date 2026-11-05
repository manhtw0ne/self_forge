ALTER TABLE oauth_login_state ADD COLUMN native_handoff_hash VARCHAR(64);

CREATE TABLE oauth_native_handoff (
 handoff_hash VARCHAR(64) PRIMARY KEY,
 user_id BIGINT REFERENCES app_user(id) ON DELETE CASCADE,
 expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_oauth_native_handoff_expires ON oauth_native_handoff(expires_at);
