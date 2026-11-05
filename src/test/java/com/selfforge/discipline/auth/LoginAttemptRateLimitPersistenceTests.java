package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/** Proves the production limiter survives outside an in-process map and never stores an email. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:login-rate-limit;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.flyway.clean-disabled=true",
        "spring.flyway.baseline-on-migrate=false",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.login-attempt-limit.window-seconds=120",
        "app.login-attempt-limit.per-email-limit=2",
        "app.login-attempt-limit.per-client-limit=2",
        "app.login-attempt-limit.global-limit=1000",
        "app.login-attempt-limit.retention-seconds=600"
})
@ActiveProfiles("test")
class LoginAttemptRateLimitPersistenceTests {
    @Autowired LoginAttemptLimiter limiter;
    @Autowired JdbcTemplate jdbc;

    @Test
    void keepsHashedPerAddressBudgetInTheDatabaseAndReturnsConfiguredRetryDelay() {
        String email = "Public.User+" + UUID.randomUUID() + "@example.com";
        limiter.acquire(" " + email.toUpperCase() + " ");
        limiter.acquire(email);

        LoginAttemptLimiter.RateLimited limited = assertThrows(LoginAttemptLimiter.RateLimited.class,
                () -> limiter.acquire(email));
        assertEquals(429, limited.getStatusCode().value());
        assertEquals("120", limited.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));

        var scopes = jdbc.queryForList("select scope,attempt_count from login_attempt_rate_limit where scope like 'email:%'");
        assertTrue(scopes.stream().anyMatch(row -> Integer.valueOf(2).equals(row.get("ATTEMPT_COUNT"))));
        assertFalse(scopes.stream().map(row -> String.valueOf(row.get("SCOPE"))).anyMatch(scope ->
                scope.toLowerCase().contains(email.toLowerCase())));
    }

    @Test
    void sharedGlobalBucketDoesNotNeedAPlaintextAddress() {
        Integer globalRows = jdbc.queryForObject(
                "select count(*) from login_attempt_rate_limit where scope='global'", Integer.class);
        assertEquals(1, globalRows);
        assertDoesNotThrow(() -> limiter.acquire("not-an-email"));
    }

    @Test
    void hashesTheClientScopeAndBlocksRotatingEmailsFromOneNetwork() {
        String client = "203.0.113.42";
        limiter.acquire("first-" + UUID.randomUUID() + "@example.com", client);
        limiter.acquire("second-" + UUID.randomUUID() + "@example.com", client);

        assertThrows(LoginAttemptLimiter.RateLimited.class,
                () -> limiter.acquire("third-" + UUID.randomUUID() + "@example.com", client));
        var scopes = jdbc.queryForList("select scope,attempt_count from login_attempt_rate_limit where scope like 'client:%'");
        assertTrue(scopes.stream().anyMatch(row -> Integer.valueOf(2).equals(row.get("ATTEMPT_COUNT"))));
        assertFalse(scopes.stream().map(row -> String.valueOf(row.get("SCOPE"))).anyMatch(scope -> scope.contains(client)));
    }
}
