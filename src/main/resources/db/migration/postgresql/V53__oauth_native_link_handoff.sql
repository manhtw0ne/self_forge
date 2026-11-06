-- A native browser handoff is purpose-bound so a provider-link result can never mint a sign-in session.
ALTER TABLE oauth_native_handoff ADD COLUMN purpose VARCHAR(16) NOT NULL DEFAULT 'LOGIN';
ALTER TABLE oauth_native_handoff ADD CONSTRAINT ck_oauth_native_handoff_purpose CHECK (purpose IN ('LOGIN', 'LINK'));
