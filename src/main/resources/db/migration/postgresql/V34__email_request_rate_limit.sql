-- A shared row serializes the small global outbound-email budget across app instances.
-- Per-address scopes are keyed by a one-way fingerprint, never the plaintext email.
CREATE TABLE email_request_rate_limit (
    scope VARCHAR(80) PRIMARY KEY,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0)
);

INSERT INTO email_request_rate_limit (scope, window_start, attempt_count)
VALUES ('global', CURRENT_TIMESTAMP, 0);
