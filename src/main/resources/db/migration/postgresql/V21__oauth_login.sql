CREATE TABLE oauth_login_state (
 state_hash VARCHAR(64) PRIMARY KEY,
 provider VARCHAR(16) NOT NULL,
 code_verifier VARCHAR(128),
 return_path VARCHAR(1024) NOT NULL,
 expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_oauth_login_state_expires ON oauth_login_state(expires_at);

CREATE TABLE oauth_login_ticket (
 ticket_hash VARCHAR(64) PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_oauth_login_ticket_expires ON oauth_login_ticket(expires_at);
