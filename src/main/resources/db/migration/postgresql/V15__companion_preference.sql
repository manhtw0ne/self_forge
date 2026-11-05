CREATE TABLE companion_preference (
 user_id BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
 species VARCHAR(16) NOT NULL CHECK(species IN ('CHON','CHIM','KY_GIONG')),
 name VARCHAR(40) NOT NULL,
 visible BOOLEAN NOT NULL,
 revision BIGINT NOT NULL
);
