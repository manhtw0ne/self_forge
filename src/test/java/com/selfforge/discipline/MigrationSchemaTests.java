package com.selfforge.discipline;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/** Fast compatibility check. PostgreSQL-specific verification lives in PostgresMigrationIT. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:migration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.flyway.clean-disabled=true",
        "spring.flyway.baseline-on-migrate=false",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class MigrationSchemaTests extends ProductionSafetyTests {
    @Autowired Flyway flyway;
    @Autowired JdbcTemplate jdbc;

    @Test void migrationIsAppliedOnceAndRetainsData() {
        assertEquals("9", flyway.info().current().getVersion().getVersion());
        Long before = jdbc.queryForObject("select count(*) from achievement", Long.class);
        assertTrue(before > 0);
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals(before, jdbc.queryForObject("select count(*) from achievement", Long.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from app_user where email = 'demo@selfforge.local'", Integer.class));
    }
}
