package com.selfforge.discipline.coach;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Limits expensive provider calls without retaining a user's coaching content. */
@Component
class WeeklyCoachRequestLimiter {
    private static final Duration COOLDOWN = Duration.ofMinutes(1);
    private static final Duration RETENTION = Duration.ofDays(7);

    private final Clock clock;
    private final ConcurrentHashMap<String, Instant> lastRequests = new ConcurrentHashMap<>();

    WeeklyCoachRequestLimiter(Clock clock) {
        this.clock = clock;
    }

    void acquire(Long userId, LocalDate weekStart) {
        Instant now = clock.instant();
        lastRequests.entrySet().removeIf(entry -> entry.getValue().isBefore(now.minus(RETENTION)));
        String key = userId + ":" + weekStart;
        Instant prior = lastRequests.putIfAbsent(key, now);
        if (prior != null && prior.isAfter(now.minus(COOLDOWN))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Đợi khoảng một phút trước khi xin thêm gợi ý AI cho tuần này.");
        }
        lastRequests.put(key, now);
    }
}
