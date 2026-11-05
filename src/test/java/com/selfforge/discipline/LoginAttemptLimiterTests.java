package com.selfforge.discipline;

import com.selfforge.discipline.auth.LoginAttemptLimiter;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoginAttemptLimiterTests {
    @Test
    void httpLimitIncludesRetryDelayAndStopsBeforeAuthentication() throws Exception {
        var service = mock(com.selfforge.discipline.auth.AuthService.class);
        var limiter = new LoginAttemptLimiter(Clock.systemUTC());
        var controller = new com.selfforge.discipline.auth.AuthController(service,
                mock(com.selfforge.discipline.auth.CurrentUserService.class), limiter,
                new com.selfforge.discipline.auth.ClientAddressResolver(false));
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.selfforge.discipline.common.ApiExceptionHandler()).build();
        for (int i = 0; i < 10; i++) limiter.acquire("user@example.com");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                .contentType("application/json").content("{\"email\":\"user@example.com\",\"password\":\"example-password\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Retry-After", "60"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.detail").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    void normalizesEmailAndReleasesBudgetAtWindowBoundary() {
        Clock clock = mock(Clock.class);
        Instant start = Instant.parse("2026-10-08T00:00:00Z");
        when(clock.instant()).thenReturn(start);
        var limiter = new LoginAttemptLimiter(clock);
        for (int i = 0; i < 10; i++) limiter.acquire("USER@example.com");
        assertEquals(429, assertThrows(ResponseStatusException.class,
                () -> limiter.acquire(" user@example.com ")).getStatusCode().value());
        assertDoesNotThrow(() -> limiter.acquire("other@example.com"));
        when(clock.instant()).thenReturn(start.plusSeconds(59));
        assertThrows(ResponseStatusException.class, () -> limiter.acquire("user@example.com"));
        when(clock.instant()).thenReturn(start.plusSeconds(60));
        assertDoesNotThrow(() -> limiter.acquire("user@example.com"));
    }

    @Test
    void rotatingAddressesCannotBypassGlobalBudget() {
        var limiter = new LoginAttemptLimiter(Clock.systemUTC());
        for (int i = 0; i < 120; i++) limiter.acquire(i + "@example.com");
        assertThrows(ResponseStatusException.class, () -> limiter.acquire("new@example.com"));
    }

    @Test
    void rotatingEmailsCannotBypassClientBudget() {
        var limiter = new LoginAttemptLimiter(Clock.systemUTC());
        for (int i = 0; i < 30; i++) limiter.acquire(i + "@example.com", "203.0.113.7");
        assertThrows(ResponseStatusException.class, () -> limiter.acquire("new@example.com", "203.0.113.7"));
        assertDoesNotThrow(() -> limiter.acquire("new@example.com", "203.0.113.8"));
    }

    @Test
    void concurrentRequestsCannotOverrunAccountBudget() throws Exception {
        var limiter = new LoginAttemptLimiter(Clock.systemUTC());
        var accepted = new AtomicInteger();
        try (var pool = Executors.newFixedThreadPool(12)) {
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (int i = 0; i < 60; i++) tasks.add(pool.submit(() -> {
                try { limiter.acquire("same@example.com"); accepted.incrementAndGet(); }
                catch (ResponseStatusException expected) { assertEquals(429, expected.getStatusCode().value()); }
            }));
            for (var task : tasks) task.get();
        }
        assertEquals(10, accepted.get());
    }
}
