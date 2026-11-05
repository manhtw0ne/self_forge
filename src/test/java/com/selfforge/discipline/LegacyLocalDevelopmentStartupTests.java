package com.selfforge.discipline;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * Keeps the developer H2 file upgradeable when it predates the Premium field.
 * Production uses Flyway/PostgreSQL and is covered separately by migration tests.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:legacy-local-startup;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=update",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:legacy-dev-schema.sql",
        "app.login-attempt-limit.global-limit=1000"
})
@ActiveProfiles("dev")
class LegacyLocalDevelopmentStartupTests {
    @Autowired JdbcTemplate jdbc;

    @Test
    void legacyLocalUserReceivesSafeFreePremiumDefaultDuringStartup() {
        assertEquals("FREE", jdbc.queryForObject(
                "select premium_tier from app_user where email = 'legacy-local@example.com'", String.class));
    }
}
