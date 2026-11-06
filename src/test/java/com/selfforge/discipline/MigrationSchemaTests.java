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
        "spring.jpa.hibernate.ddl-auto=validate",
        // This class intentionally re-runs the inherited safety suite against
        // Flyway's migrated schema, so allow its isolated fixture accounts.
        "app.login-attempt-limit.global-limit=1000",
        "app.login-attempt-limit.per-client-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class MigrationSchemaTests extends ProductionSafetyTests {
    @Autowired Flyway flyway;
    @Autowired JdbcTemplate jdbc;

    @Test void migrationIsAppliedOnceAndRetainsData() {
        assertEquals("53", flyway.info().current().getVersion().getVersion());
        Long before = jdbc.queryForObject("select count(*) from achievement", Long.class);
        assertTrue(before > 0);
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals(before, jdbc.queryForObject("select count(*) from achievement", Long.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from app_user where email = 'demo@selfforge.local'", Integer.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from email_request_rate_limit where scope = 'global' and attempt_count = 0", Integer.class));
        // The inherited safety suite performs real registration/login flows before
        // this assertion, so only require the durable global bucket to exist.
        assertEquals(1, jdbc.queryForObject("select count(*) from login_attempt_rate_limit where scope = 'global'", Integer.class));
        var user = users.save(new com.selfforge.discipline.auth.AppUser("journal-migration@example.com", "Journal migration", "test-hash"));
        jdbc.update("insert into ai_coach_usage(user_id, usage_month, feature, request_count) values (?, ?, 'JOURNAL', 1)",
                user.getId(), java.sql.Date.valueOf("2026-10-01"));
        assertEquals(1, jdbc.queryForObject("select count(*) from ai_coach_usage where user_id = ? and feature = 'JOURNAL'", Integer.class, user.getId()));
        jdbc.update("insert into ai_coach_usage(user_id, usage_month, feature, request_count) values (?, ?, 'DAILY_FOCUS', 1)",
                user.getId(), java.sql.Date.valueOf("2026-10-01"));
        assertEquals(1, jdbc.queryForObject("select count(*) from ai_coach_usage where user_id = ? and feature = 'DAILY_FOCUS'", Integer.class, user.getId()));
        jdbc.update("insert into ai_coach_usage(user_id, usage_month, feature, request_count) values (?, ?, 'CHAT', 1)",
                user.getId(), java.sql.Date.valueOf("2026-10-01"));
        assertEquals(1, jdbc.queryForObject("select count(*) from ai_coach_usage where user_id = ? and feature = 'CHAT'", Integer.class, user.getId()));
        jdbc.update("insert into weekly_coach_advice(user_id, week_start, language, evidence_fingerprint, headline, observations_json, experiments_json) values (?, ?, 'vi', ?, ?, ?, ?)",
                user.getId(), java.sql.Date.valueOf("2026-10-06"), "a".repeat(64), "Gợi ý thử nghiệm", "[{\"habitId\":1,\"text\":\"Bước nhỏ\"}]", "[\"Thử lại\"]");
        assertEquals(1, jdbc.queryForObject("select count(*) from weekly_coach_advice where user_id = ? and language = 'vi'", Integer.class, user.getId()));
        jdbc.update("insert into goal(user_id, name, target_value, current_value, unit, status, created_at) values (?, 'Goal migration', 12, 0, 'books', 'ACTIVE', CURRENT_TIMESTAMP)", user.getId());
        Long goalId = jdbc.queryForObject("select id from goal where user_id = ? and name = 'Goal migration'", Long.class, user.getId());
        jdbc.update("insert into goal_coach_plan(user_id, goal_id, language, evidence_fingerprint, headline, steps_json, habits_json) values (?, ?, 'vi', ?, ?, ?, ?)",
                user.getId(), goalId, "b".repeat(64), "Kế hoạch nhỏ", "[\"Chọn một cuốn sách\"]", "[{\"name\":\"Đọc một trang\",\"description\":\"Sau bữa sáng\",\"difficulty\":\"EASY\",\"targetPerWeek\":3}]");
        assertEquals(1, jdbc.queryForObject("select count(*) from goal_coach_plan where user_id = ? and goal_id = ?", Integer.class, user.getId(), goalId));
        jdbc.update("insert into feedback_submission(user_id, feedback_type, summary, steps, expected_result, language) values (?, 'IDEA', ?, ?, ?, 'vi')",
                user.getId(), "Một đề xuất nhỏ", "Mở Trợ giúp", "Thấy phản hồi đã gửi");
        assertEquals(1, jdbc.queryForObject("select count(*) from feedback_submission where user_id = ? and feedback_type = 'IDEA'", Integer.class, user.getId()));
        assertEquals("NEW", jdbc.queryForObject("select operator_status from feedback_submission where user_id = ? and feedback_type = 'IDEA'", String.class, user.getId()));
        assertEquals("", jdbc.queryForObject("select operator_note from feedback_submission where user_id = ? and feedback_type = 'IDEA'", String.class, user.getId()));
        assertEquals(0, jdbc.queryForObject("select count(*) from beta_invite", Integer.class));
    }
}
