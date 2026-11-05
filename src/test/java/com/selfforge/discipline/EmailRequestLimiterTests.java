package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import java.time.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class EmailRequestLimiterTests {
    @Test void bothEndpointsRejectBeforeLookingUpAccountsOrSendingMail() throws Exception {
        var reset = mock(PasswordResetService.class);
        var registration = mock(RegistrationVerification.class);
        var auth = mock(AuthService.class);
        var limiter = limiter(Clock.systemUTC());
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(
                new PasswordResetController(reset, limiter, new ClientAddressResolver(false)), new RegistrationController(registration, limiter, auth, new ClientAddressResolver(false)))
                .setControllerAdvice(new com.selfforge.discipline.common.ApiExceptionHandler()).build();
        for (int i = 0; i < 3; i++) {
            String path = i % 2 == 0 ? "registration" : "password-reset";
            mvc.perform(post("/api/auth/" + path + "/request").contentType("application/json")
                    .content("{\"email\":\"USER@example.com\"}")) .andExpect(status().isAccepted());
        }
        clearInvocations(reset, registration);
        for (String path : java.util.List.of("registration", "password-reset")) {
            mvc.perform(post("/api/auth/" + path + "/request").contentType("application/json")
                    .content("{\"email\":\"user@example.com\"}"))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().string("Retry-After", "60"))
                    .andExpect(header().string("Cache-Control", "no-store"));
        }
        verifyNoInteractions(reset, registration);
    }

    @Test void publicEmailEndpointsShareTheClientBudgetBeforeMailWork() throws Exception {
        var reset = mock(PasswordResetService.class);
        var registration = mock(RegistrationVerification.class);
        var auth = mock(AuthService.class);
        var limiter = limiter(Clock.systemUTC(), new ConcurrentHashMap<>(), 3, 30, 2);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(
                new PasswordResetController(reset, limiter, new ClientAddressResolver(false)), new RegistrationController(registration, limiter, auth, new ClientAddressResolver(false)))
                .setControllerAdvice(new com.selfforge.discipline.common.ApiExceptionHandler()).build();
        var sameClient = (org.springframework.test.web.servlet.request.RequestPostProcessor) request -> {
            request.setRemoteAddr("203.0.113.7");
            return request;
        };
        mvc.perform(post("/api/auth/registration/request").with(sameClient).contentType("application/json")
                .content("{\"email\":\"first@example.com\"}")) .andExpect(status().isAccepted());
        mvc.perform(post("/api/auth/password-reset/request").with(sameClient).contentType("application/json")
                .content("{\"email\":\"second@example.com\"}")) .andExpect(status().isAccepted());
        clearInvocations(reset, registration);
        mvc.perform(post("/api/auth/password-reset/request").with(sameClient).contentType("application/json")
                .content("{\"email\":\"third@example.com\"}"))
                .andExpect(status().isTooManyRequests());
        verifyNoInteractions(reset, registration);
    }

    @Test void budgetResetsAtBoundaryHashesAddressesAndNormalizesInput() {
        Clock clock = mock(Clock.class);
        Instant start = Instant.parse("2026-10-09T00:00:00Z");
        when(clock.instant()).thenReturn(start);
        Map<String, EmailRequestRateLimit> buckets = new ConcurrentHashMap<>();
        var limiter = limiter(clock, buckets);
        for (int i = 0; i < 3; i++) limiter.acquire("USER@example.com");
        assertThrows(EmailRequestLimiter.RateLimited.class, () -> limiter.acquire(" user@example.com "));
        assertTrue(buckets.keySet().stream().anyMatch(key -> key.startsWith("email:")));
        assertTrue(buckets.keySet().stream().noneMatch(key -> key.contains("@") || key.contains("USER")));
        when(clock.instant()).thenReturn(start.plusSeconds(59));
        assertThrows(EmailRequestLimiter.RateLimited.class, () -> limiter.acquire("user@example.com"));
        when(clock.instant()).thenReturn(start.plusSeconds(60));
        assertDoesNotThrow(() -> limiter.acquire("user@example.com"));
    }

    @Test void parallelRotatingAddressesCannotExceedGlobalBudget() throws Exception {
        var limiter = limiter(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        var accepted = new java.util.concurrent.atomic.AtomicInteger();
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(12)) {
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (int i = 0; i < 100; i++) {
                final String email = i + "@example.com";
                tasks.add(pool.submit(() -> {
                    try { limiter.acquire(email); accepted.incrementAndGet(); }
                    catch (EmailRequestLimiter.RateLimited expected) { }
                }));
            }
            for (var task : tasks) task.get(10, java.util.concurrent.TimeUnit.SECONDS);
        }
        assertEquals(30, accepted.get());
    }

    @Test void rotatingEmailsFromOneClientCannotExceedItsHashedBudget() {
        Clock clock = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);
        Map<String, EmailRequestRateLimit> buckets = new ConcurrentHashMap<>();
        var limiter = limiter(clock, buckets, 3, 30, 2);
        limiter.acquire("first@example.com", "203.0.113.7");
        limiter.acquire("second@example.com", "203.0.113.7");
        assertThrows(EmailRequestLimiter.RateLimited.class,
                () -> limiter.acquire("third@example.com", "203.0.113.7"));
        assertTrue(buckets.keySet().stream().anyMatch(key -> key.startsWith("client:")));
        assertTrue(buckets.keySet().stream().noneMatch(key -> key.contains("203.0.113.7")));
        assertDoesNotThrow(() -> limiter.acquire("third@example.com", "203.0.113.8"));
    }

    private static EmailRequestLimiter limiter(Clock clock) {
        return limiter(clock, new ConcurrentHashMap<>());
    }

    private static EmailRequestLimiter limiter(Clock clock, Map<String, EmailRequestRateLimit> buckets) {
        return limiter(clock, buckets, 3, 30, 8);
    }

    private static EmailRequestLimiter limiter(Clock clock, Map<String, EmailRequestRateLimit> buckets,
                                                int perEmailLimit, int globalLimit, int perClientLimit) {
        buckets.put("global", new EmailRequestRateLimit("global", clock.instant()));
        var repository = mock(EmailRequestRateLimitRepository.class);
        when(repository.lockByScope(anyString())).thenAnswer(call ->
                java.util.Optional.ofNullable(buckets.get(call.getArgument(0))));
        when(repository.saveAndFlush(any(EmailRequestRateLimit.class))).thenAnswer(call -> {
            EmailRequestRateLimit bucket = call.getArgument(0);
            buckets.put(bucket.getId(), bucket);
            return bucket;
        });
        doAnswer(call -> {
            Instant cutoff = call.getArgument(0);
            int before = buckets.size();
            buckets.entrySet().removeIf(entry -> (entry.getKey().startsWith("email:") || entry.getKey().startsWith("client:"))
                    && entry.getValue().getWindowStart().isBefore(cutoff));
            return before - buckets.size();
        }).when(repository).deleteExpiredScopedBuckets(any(Instant.class));
        return new EmailRequestLimiter(repository, clock, 60, perEmailLimit, globalLimit, perClientLimit, 7200);
    }
}
