-- A provider callback may link only to an account that re-authenticated before redirecting.
ALTER TABLE oauth_login_state ADD COLUMN link_user_id BIGINT REFERENCES app_user(id) ON DELETE CASCADE;
ALTER TABLE oauth_login_state ADD COLUMN link_credential_hash VARCHAR(64);
