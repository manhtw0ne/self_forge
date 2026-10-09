package com.selfforge.discipline.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Per-process protection for the single-instance release; no password or IP is retained. */
@Component
public class LoginAttemptLimiter {
    private final Clock clock;
    private final Map<String, Integer> attempts = new HashMap<>();
    private Instant windowEnd = Instant.MIN;
    private int total;

    public LoginAttemptLimiter(Clock clock) { this.clock = clock; }

    public synchronized void acquire(String email) {
        Instant now = clock.instant();
        if (!now.isBefore(windowEnd)) {
            attempts.clear();
            total = 0;
            windowEnd = now.plusSeconds(60);
        }
        String key = email.trim().toLowerCase(Locale.ROOT);
        int count = attempts.getOrDefault(key, 0);
        // The global budget also bounds this map to at most 120 keys per minute.
        if (total >= 120 || count >= 10) {
            throw new RateLimited();
        }
        total++;
        attempts.put(key, count + 1);
    }

    public static class RateLimited extends ResponseStatusException {
        public RateLimited() {
            super(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi một phút rồi thử lại.");
        }
    }
}
