package com.selfforge.discipline.auth;

import java.time.Clock;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Removes expired server-side login sessions without affecting sessions that are still valid. */
@Component
public class AuthSessionCleanup {
    private final AuthSessionRepository sessions;
    private final Clock clock;

    public AuthSessionCleanup(AuthSessionRepository sessions, Clock clock) {
        this.sessions = sessions;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.auth-session.cleanup-delay-ms:3600000}", initialDelay = 60000)
    @Transactional
    public long purgeExpired() {
        return sessions.deleteByExpiresAtBefore(Instant.now(clock));
    }
}
