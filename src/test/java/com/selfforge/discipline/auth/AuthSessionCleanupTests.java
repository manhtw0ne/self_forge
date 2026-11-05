package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class AuthSessionCleanupTests {

    @Test
    void removesOnlySessionsThatExpiredBeforeTheApplicationClock() {
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        Instant now = Instant.parse("2026-11-04T12:00:00Z");
        when(sessions.deleteByExpiresAtBefore(now)).thenReturn(3L);

        AuthSessionCleanup cleanup = new AuthSessionCleanup(
                sessions, Clock.fixed(now, ZoneOffset.UTC));

        assertEquals(3L, cleanup.purgeExpired());
        verify(sessions).deleteByExpiresAtBefore(now);
    }
}
