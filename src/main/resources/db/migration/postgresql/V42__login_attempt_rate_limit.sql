-- Shared login/register rate-limit buckets. Email scopes use a one-way
-- fingerprint in application code; plaintext addresses are never stored here.
CREATE TABLE login_attempt_rate_limit (
    scope VARCHAR(80) PRIMARY KEY,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0)
);

-- This row is locked before an attempt is counted, serializing the small
-- global public-auth budget across every application instance.
INSERT INTO login_attempt_rate_limit (scope, window_start, attempt_count)
VALUES ('global', CURRENT_TIMESTAMP, 0);
