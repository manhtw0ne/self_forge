package com.selfforge.discipline;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Run explicitly with mvn -Ppostgres-tests verify. Docker is required, never silently skipped. */
// This annotation replaces the parent's properties; keep its fixture allowance explicit.
@SpringBootTest(properties = {
        "app.login-attempt-limit.global-limit=1000",
        "app.login-attempt-limit.per-client-limit=1000",
        "app.cors.allowed-origins=http://localhost:5173"
})
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
        assertEquals("50", flyway.info().current().getVersion().getVersion());
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
            assertEquals(50, db.queryForObject("select count(*) from flyway_schema_history where success = true", Integer.class));
            assertEquals(0, db.queryForObject("select count(*) from app_user where email = 'demo@selfforge.local'", Integer.class));
        }
    }

    /**
     * Keep the beta's smallest useful journey on the same PostgreSQL schema and
     * Flyway path that a production container uses. The broader H2 journey test
     * remains useful for fast feedback; it is not a substitute for this check.
     */
    @Test void migratedPostgresSupportsNewUserHabitCheckInAndDashboardJourney() throws Exception {
        String email = "postgres-first-user-" + UUID.randomUUID() + "@example.com";
        String registration = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "email", email,
                                "displayName", "Postgres first user",
                                "password", "password123",
                                "termsAccepted", true
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.isPremium").value(false))
                .andReturn().getResponse().getContentAsString();
        String authorization = "Bearer " + json.readTree(registration).get("token").asText();

        mvc.perform(get("/api/getting-started").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeHabit").value(false))
                .andExpect(jsonPath("$.completedCheckIn").value(false));

        String habit = mvc.perform(post("/api/habits").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A first small step\",\"difficulty\":\"EASY\",\"targetPerWeek\":7}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long habitId = json.readTree(habit).get("id").asLong();

        String dashboard = mvc.perform(get("/api/dashboard/today").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habits[0].habitId").value(habitId))
                .andExpect(jsonPath("$.habits[0].todayStatus").isEmpty())
                .andReturn().getResponse().getContentAsString();
        String date = json.readTree(dashboard).get("date").asText();

        mvc.perform(post("/api/check-ins/new").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "habitId", habitId,
                                "date", date,
                                "status", "COMPLETED",
                                "note", "A verified first step"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.habitId").value(habitId))
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mvc.perform(get("/api/dashboard/today").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habits[0].todayStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.todayScore").value(5));
        mvc.perform(get("/api/getting-started").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeHabit").value(true))
                .andExpect(jsonPath("$.completedCheckIn").value(true));
    }

    @Test void v10UpgradeKeepsExistingAccountsAndAddsReminderReceipts() {
        var previous = Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("reminder_upgrade").defaultSchema("reminder_upgrade").locations("classpath:db/migration/postgresql").target("9").load();
        previous.migrate();
        jdbc.update("insert into reminder_upgrade.app_user (email, display_name, password_hash, premium_tier) values ('existing@example.com','Existing user','hash','FREE')");
        var current = Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("reminder_upgrade").defaultSchema("reminder_upgrade").locations("classpath:db/migration/postgresql").target("10").load();
        assertEquals(1, current.migrate().migrationsExecuted);
        assertEquals("Existing user", jdbc.queryForObject("select display_name from reminder_upgrade.app_user where email='existing@example.com'", String.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from reminder_upgrade.reminder_create_receipt", Integer.class));
        assertEquals(0, current.migrate().migrationsExecuted);
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
