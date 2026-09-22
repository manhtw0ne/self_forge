package com.selfforge.discipline;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.*;

/** Run explicitly with mvn -Ppostgres-tests verify. Docker is required, never silently skipped. */
@SpringBootTest
@ActiveProfiles("prod")
@AutoConfigureMockMvc
@Testcontainers
class PostgresMigrationIT extends ProductionSafetyTests {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("selfforge_migration_test");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // Override inherited test properties: production must only validate the migrated schema.
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired Flyway flyway;
    @Autowired JdbcTemplate jdbc;

    @Test void productionStartupAndRestartPreserveData() throws Exception {
        String email = "restart@example.com";
        var user = users.save(new com.selfforge.discipline.auth.AppUser(email, "Restart", "test-hash"));
        Long userId = user.getId();
        assertEquals("1", flyway.info().current().getVersion().getVersion());
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals(0, jdbc.queryForObject("select count(*) from app_user where email = 'demo@selfforge.local'", Integer.class));
        try (var restarted = new SpringApplicationBuilder(DisciplineApiApplication.class)
                .web(WebApplicationType.NONE)
                .run("--spring.profiles.active=prod",
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword())) {
            var db = restarted.getBean(JdbcTemplate.class);
            assertEquals(userId, db.queryForObject("select id from app_user where email = ?", Long.class, email));
            assertEquals(1, db.queryForObject("select count(*) from flyway_schema_history where success = true", Integer.class));
            assertEquals(0, db.queryForObject("select count(*) from app_user where email = 'demo@selfforge.local'", Integer.class));
        }
    }

    @Test void refusesToBaselineExistingSchemaAutomatically() {
        jdbc.execute("create schema legacy_check");
        jdbc.execute("create table legacy_check.keep_me (id integer primary key)");
        jdbc.update("insert into legacy_check.keep_me values (42)");
        var legacy = Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("legacy_check")
                .locations("classpath:db/migration/postgresql")
                .baselineOnMigrate(false).cleanDisabled(true).load();
        assertThrows(FlywayException.class, legacy::migrate);
        assertEquals(42, jdbc.queryForObject("select id from legacy_check.keep_me", Integer.class));
    }
}
