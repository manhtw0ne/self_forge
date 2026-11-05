-- Null preserves the browser preference for existing accounts until the person
-- explicitly chooses a language while signed in. New saved choices are shared
-- safely between the web and native clients.
ALTER TABLE app_user ADD COLUMN language VARCHAR(8);
ALTER TABLE app_user ADD CONSTRAINT chk_app_user_language
    CHECK (language IS NULL OR language IN ('vi', 'en'));
