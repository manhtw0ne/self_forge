ALTER TABLE app_user ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_user ADD COLUMN terms_version VARCHAR(32);

-- The OAuth state carries consent across the provider redirect. Existing, unconsumed states
-- are safely treated as not accepting terms and cannot create an account.
ALTER TABLE oauth_login_state ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
