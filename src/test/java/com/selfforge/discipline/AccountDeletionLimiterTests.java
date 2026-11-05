package com.selfforge.discipline;

import com.selfforge.discipline.auth.AccountDeletionLimiter;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class AccountDeletionLimiterTests {
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-12T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
    @Test void perAccountBudgetHasRetryHeaderAndResetsAfterOneMinute() {
        MutableClock clock = new MutableClock();
        AccountDeletionLimiter limiter = new AccountDeletionLimiter(clock);
        for (int i = 0; i < 5; i++) limiter.acquire(1L);
        ResponseStatusException failure = assertThrows(ResponseStatusException.class, () -> limiter.acquire(1L));
        assertEquals(429, failure.getStatusCode().value());
        assertEquals("60", failure.getHeaders().getFirst("Retry-After"));
        limiter.acquire(2L);
        clock.now = clock.now.plusSeconds(60);
        limiter.acquire(1L);
    }
    @Test void globalBudgetBoundsPasswordWorkAndAccountMap() {
        AccountDeletionLimiter limiter = new AccountDeletionLimiter(new MutableClock());
        for (long id = 1; id <= 30; id++) limiter.acquire(id);
        assertThrows(ResponseStatusException.class, () -> limiter.acquire(31L));
        assertThrows(ResponseStatusException.class, () -> limiter.acquire(1L));
    }
}
